/**
 * LocalGenius Site Provisioning Service
 *
 * Provisions a complete Emdash-powered business website on Cloudflare infrastructure:
 *   1. Creates a D1 database for the business
 *   2. Creates an R2 bucket for assets
 *   3. Deploys an Emdash Worker with D1 + R2 bindings
 *   4. Configures DNS subdomain: {slug}.localgenius.site
 *   5. Seeds the DB with business profile data
 *
 * All infrastructure is created via Cloudflare REST API — no Wrangler CLI dependency.
 * This is intentional: programmatic provisioning at scale requires API-first approach.
 */

import { z } from 'zod';

// ============================================================
// Types & Schemas
// ============================================================

export const BusinessSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

export type Business = z.infer<typeof BusinessSchema>;

export interface ProvisionResult {
  siteUrl: string;
  adminUrl: string;
  status: ProvisionStatus;
  databaseId: string;
  bucketName: string;
  workerId: string;
  provisionedAt: string;
}

export type ProvisionStatus =
  | 'provisioning'
  | 'database_created'
  | 'bucket_created'
  | 'worker_deployed'
  | 'dns_configured'
  | 'database_seeded'
  | 'ready'
  | 'failed';

export interface ProvisionError {
  step: ProvisionStatus;
  message: string;
  code?: string;
  retryable: boolean;
}

export class ProvisioningError extends Error {
  public readonly step: ProvisionStatus;
  public readonly code?: string;
  public readonly retryable: boolean;
  public rollbackAttempted: boolean;
  public rollbackErrors: string[];

  constructor(detail: ProvisionError) {
    super(detail.message);
    this.name = 'ProvisioningError';
    this.step = detail.step;
    this.code = detail.code;
    this.retryable = detail.retryable;
    this.rollbackAttempted = false;
    this.rollbackErrors = [];
  }
}

// ============================================================
// Rollback Support
// ============================================================

type ResourceType = 'd1_database' | 'r2_bucket' | 'worker' | 'dns_record';

interface CreatedResource {
  type: ResourceType;
  id: string;
}

/**
 * Rolls back previously created Cloudflare resources in reverse order.
 *
 * Each deletion is attempted independently — a failure in one does not
 * prevent the others from being cleaned up. Errors are collected and
 * attached to the ProvisioningError so the caller has full visibility.
 */
async function rollback(
  resources: CreatedResource[],
  slug: string,
  config: CloudflareConfig,
  error: ProvisioningError
): Promise<void> {
  error.rollbackAttempted = true;

  // Delete in reverse creation order
  const reversed = [...resources].reverse();

  for (const resource of reversed) {
    try {
      switch (resource.type) {
        case 'dns_record':
          await cfFetch<unknown>(
            `/zones/${config.zoneId}/dns_records/${resource.id}`,
            config,
            { method: 'DELETE' }
          );
          break;

        case 'worker':
          await cfFetch<unknown>(
            `/accounts/${config.accountId}/workers/scripts/${resource.id}`,
            config,
            { method: 'DELETE' }
          );
          break;

        case 'r2_bucket':
          await cfFetch<unknown>(
            `/accounts/${config.accountId}/r2/buckets/${resource.id}`,
            config,
            { method: 'DELETE' }
          );
          break;

        case 'd1_database':
          await cfFetch<unknown>(
            `/accounts/${config.accountId}/d1/database/${resource.id}`,
            config,
            { method: 'DELETE' }
          );
          break;
      }
    } catch (rollbackErr) {
      error.rollbackErrors.push(
        `Failed to delete ${resource.type} (${resource.id}): ${(rollbackErr as Error).message}`
      );
    }
  }
}

// ============================================================
// Registry DB Interface & Helpers
// ============================================================

/**
 * D1 binding interface — the subset of Cloudflare D1 we use for registry writes.
 * Matches the binding shape available via locals.runtime.env.DB in Astro + CF adapter.
 */
export interface RegistryDB {
  prepare: (sql: string) => {
    bind: (...args: unknown[]) => {
      run: () => Promise<{ success: boolean }>;
      first: () => Promise<Record<string, unknown> | null>;
      all: () => Promise<{ results: unknown[] }>;
    };
    run: () => Promise<{ success: boolean }>;
    first: () => Promise<Record<string, unknown> | null>;
    all: () => Promise<{ results: unknown[] }>;
  };
}

async function registryInsert(
  db: RegistryDB,
  business: Business,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO site_registry (slug, business_name, business_type, city, status)
       VALUES (?, ?, ?, ?, 'provisioning')`
    )
    .bind(business.slug, business.name, business.type, business.city)
    .run();
}

async function registryUpdateStatus(
  db: RegistryDB,
  slug: string,
  status: ProvisionStatus,
  fields?: Partial<{
    site_url: string;
    database_id: string;
    bucket_name: string;
    worker_id: string;
    error_message: string;
    provisioned_at: string;
  }>,
): Promise<void> {
  const sets = ["status = ?", "updated_at = datetime('now')"];
  const params: unknown[] = [status];

  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        params.push(value);
      }
    }
  }

  params.push(slug);

  await db
    .prepare(`UPDATE site_registry SET ${sets.join(', ')} WHERE slug = ?`)
    .bind(...params)
    .run();
}

// ============================================================
// Cloudflare API Client
// ============================================================

interface CloudflareConfig {
  apiToken: string;
  accountId: string;
  zoneId: string;
  domain: string;
}

interface CFResponse<T> {
  success: boolean;
  result: T;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

async function cfFetch<T>(
  path: string,
  config: CloudflareConfig,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://api.cloudflare.com/client/v4${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const body = (await res.json()) as CFResponse<T>;

  if (!body.success) {
    const err = body.errors[0];
    throw new Error(`Cloudflare API error ${err?.code ?? res.status}: ${err?.message ?? 'Unknown error'}`);
  }

  return body.result;
}

// ============================================================
// Step 1: Create D1 Database
// ============================================================

interface D1Database {
  uuid: string;
  name: string;
  created_at: string;
}

async function createD1Database(slug: string, config: CloudflareConfig): Promise<D1Database> {
  const dbName = `localgenius-${slug}`;

  return cfFetch<D1Database>(
    `/accounts/${config.accountId}/d1/database`,
    config,
    {
      method: 'POST',
      body: JSON.stringify({ name: dbName }),
    }
  );
}

// ============================================================
// Step 2: Create R2 Bucket
// ============================================================

interface R2Bucket {
  name: string;
  creation_date: string;
}

async function createR2Bucket(slug: string, config: CloudflareConfig): Promise<R2Bucket> {
  const bucketName = `localgenius-${slug}`;

  return cfFetch<R2Bucket>(
    `/accounts/${config.accountId}/r2/buckets`,
    config,
    {
      method: 'POST',
      body: JSON.stringify({
        name: bucketName,
        locationHint: 'auto',
      }),
    }
  );
}

// ============================================================
// Step 3: Deploy Emdash Worker with bindings
// ============================================================

interface WorkerDeployResult {
  id: string;
  etag: string;
  deployment_id: string;
}

async function deployEmdashWorker(
  slug: string,
  databaseId: string,
  bucketName: string,
  config: CloudflareConfig
): Promise<WorkerDeployResult> {
  const workerName = `localgenius-${slug}`;

  // Worker script — thin router that delegates to Emdash runtime.
  // In production this would be the compiled Emdash worker bundle.
  // We pass the D1 and R2 bindings via the Workers API metadata.
  const workerScript = generateEmdashWorkerScript(slug);

  const metadata = {
    main_module: 'worker.js',
    bindings: [
      {
        type: 'd1',
        name: 'DB',
        id: databaseId,
      },
      {
        type: 'r2_bucket',
        name: 'SITE_ASSETS',
        bucket_name: bucketName,
      },
      {
        type: 'plain_text',
        name: 'BUSINESS_SLUG',
        text: slug,
      },
      {
        type: 'plain_text',
        name: 'SITE_DOMAIN',
        text: `${slug}.${config.domain}`,
      },
    ],
    compatibility_date: '2024-05-01',
    compatibility_flags: ['nodejs_compat'],
  };

  // Multipart form upload — Workers API requires this format
  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
    'metadata.json'
  );
  formData.append(
    'worker.js',
    new Blob([workerScript], { type: 'application/javascript+module' }),
    'worker.js'
  );

  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/scripts/${workerName}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      // No Content-Type — let fetch set multipart boundary
    },
    body: formData,
  });

  const body = (await res.json()) as CFResponse<WorkerDeployResult>;
  if (!body.success) {
    const err = body.errors[0];
    throw new Error(`Worker deploy failed ${err?.code}: ${err?.message}`);
  }

  return body.result;
}

function generateEmdashWorkerScript(slug: string): string {
  // Per-business Worker that queries D1 for content and renders HTML.
  // Design tokens from product-design.md: Warm Charcoal #2C2C2C,
  // Warm White #FAF8F5, Terracotta #C4704B, Source Sans 3.
  return `
// LocalGenius — Site Worker for: ${slug}
// Auto-provisioned by LocalGenius provisioning service

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/_health') {
      return new Response(JSON.stringify({
        status: 'ok',
        slug: env.BUSINESS_SLUG,
        domain: env.SITE_DOMAIN,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query D1 for business profile
    let profile = null;
    let pages = [];
    try {
      profile = await env.DB.prepare('SELECT * FROM business_profile WHERE slug = ? LIMIT 1').bind(env.BUSINESS_SLUG).first();
      const result = await env.DB.prepare('SELECT * FROM site_pages WHERE published = 1 ORDER BY id').all();
      pages = result.results || [];
    } catch (e) {
      return new Response('Site is being set up — check back in a moment.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (!profile) {
      return new Response('Site not found.', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }

    const homePage = pages.find(p => p.slug === 'home');
    const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const html = \\\`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\\\${esc(profile.name)} — \\\${esc(profile.type)} in \\\${esc(profile.city)}</title>
  <meta name="description" content="\\\${esc(homePage?.meta_description || profile.name + ' — ' + profile.type + ' in ' + profile.city)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Source Sans 3', system-ui, sans-serif; background: #FAF8F5; color: #2C2C2C; line-height: 1.6; }
    .hero { padding: 80px 24px 60px; text-align: center; max-width: 720px; margin: 0 auto; }
    .hero h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.02em; }
    .hero .tagline { font-size: 1.2rem; color: #666; margin-bottom: 24px; }
    .hero .description { font-size: 1.05rem; max-width: 560px; margin: 0 auto 32px; }
    .info { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; margin-bottom: 40px; }
    .info-item { background: white; border-radius: 12px; padding: 16px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .info-item strong { color: #C4704B; }
    .cta { display: inline-block; background: #C4704B; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1.05rem; transition: background 0.2s; }
    .cta:hover { background: #a85d3d; }
    .content { max-width: 720px; margin: 0 auto; padding: 0 24px 60px; }
    .content p { margin-bottom: 16px; }
    footer { text-align: center; padding: 40px 24px; color: #999; font-size: 0.85rem; border-top: 1px solid #eee; }
    footer a { color: #C4704B; text-decoration: none; }
    @media (max-width: 600px) {
      .hero { padding: 48px 16px 40px; }
      .hero h1 { font-size: 1.8rem; }
      .info { flex-direction: column; align-items: center; }
    }
  </style>
</head>
<body>
  <main class="hero">
    <h1>\\\${esc(profile.name)}</h1>
    <p class="tagline">\\\${esc(profile.type)} in \\\${esc(profile.city)}</p>
    \\\${profile.description ? '<p class="description">' + esc(profile.description) + '</p>' : ''}
    <div class="info">
      \\\${profile.phone ? '<div class="info-item"><strong>Call</strong> <a href="tel:' + esc(profile.phone) + '">' + esc(profile.phone) + '</a></div>' : ''}
      \\\${profile.address ? '<div class="info-item"><strong>Visit</strong> ' + esc(profile.address) + '</div>' : ''}
      \\\${profile.email ? '<div class="info-item"><strong>Email</strong> <a href="mailto:' + esc(profile.email) + '">' + esc(profile.email) + '</a></div>' : ''}
    </div>
    \\\${profile.phone ? '<a class="cta" href="tel:' + esc(profile.phone) + '">Call Now</a>' : ''}
  </main>
  \\\${homePage?.content ? '<section class="content"><p>' + esc(homePage.content) + '</p></section>' : ''}
  <footer>
    <p>Made with <a href="https://localgenius.company/sites?ref=\\\${esc(env.BUSINESS_SLUG)}">LocalGenius</a></p>
  </footer>
</body>
</html>\\\`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
      },
    });
  },
};
`.trim();
}

// ============================================================
// Step 4: Configure Subdomain DNS
// ============================================================

interface DNSRecord {
  id: string;
  name: string;
  type: string;
  content: string;
}

async function configureDNS(slug: string, config: CloudflareConfig): Promise<DNSRecord> {
  // Workers routes: bind the subdomain to the worker
  // First create a CNAME record pointing to workers.dev
  const record = await cfFetch<DNSRecord>(
    `/zones/${config.zoneId}/dns_records`,
    config,
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'CNAME',
        name: `${slug}.${config.domain}`,
        content: `localgenius-${slug}.workers.dev`,
        proxied: true,
        ttl: 1, // Auto (proxied records require TTL=1)
        comment: `LocalGenius auto-provisioned for ${slug}`,
      }),
    }
  );

  // Also create a Workers route to map the subdomain to the worker script
  await cfFetch<unknown>(
    `/accounts/${config.accountId}/workers/scripts/localgenius-${slug}/subdomain`,
    config,
    {
      method: 'POST',
      body: JSON.stringify({ enabled: true }),
    }
  );

  return record;
}

// ============================================================
// Step 5: Seed Database with Business Profile
// ============================================================

interface D1QueryResult {
  results: Record<string, unknown>[];
  success: boolean;
  meta: { changes: number; duration: number };
}

async function seedDatabase(
  business: Business,
  databaseId: string,
  config: CloudflareConfig
): Promise<void> {
  const now = new Date().toISOString();

  const statements = [
    // Schema
    `CREATE TABLE IF NOT EXISTS business_profile (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS site_pages (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      meta_description TEXT,
      published INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,

    // Seed business profile
    `INSERT OR REPLACE INTO business_profile
      (id, slug, name, type, city, phone, email, address, description, created_at, updated_at)
      VALUES (1, '${esc(business.slug)}', '${esc(business.name)}', '${esc(business.type)}',
              '${esc(business.city)}', ${business.phone ? `'${esc(business.phone)}'` : 'NULL'},
              ${business.email ? `'${esc(business.email)}'` : 'NULL'},
              ${business.address ? `'${esc(business.address)}'` : 'NULL'},
              ${business.description ? `'${esc(business.description)}'` : 'NULL'},
              '${now}', '${now}')`,

    // Seed default pages
    `INSERT OR IGNORE INTO site_pages (slug, title, content, meta_description, published, created_at, updated_at)
      VALUES ('home', 'Welcome to ${esc(business.name)}',
              'We are a ${esc(business.type)} in ${esc(business.city)}.',
              '${esc(business.name)} — ${esc(business.type)} in ${esc(business.city)}',
              1, '${now}', '${now}')`,

    // Seed default settings
    `INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES ('theme', 'default', '${now}')`,
    `INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES ('ai_enabled', 'true', '${now}')`,
  ];

  await cfFetch<D1QueryResult[]>(
    `/accounts/${config.accountId}/d1/database/${databaseId}/query`,
    config,
    {
      method: 'POST',
      body: JSON.stringify({ sql: statements.join(';\n') }),
    }
  );
}

// SQL injection prevention — minimal escaping for string literals
function esc(s: string): string {
  return s.replace(/'/g, "''");
}

// ============================================================
// Main Provisioning Orchestrator
// ============================================================

/**
 * Provisions a complete LocalGenius site for a business.
 *
 * Reads config from environment bindings (Cloudflare Workers env) or
 * from explicit config object when called from Node.js context.
 *
 * @throws ProvisioningError on failure — includes step, message, retryable flag
 */
export async function provisionSite(
  business: Business,
  env: {
    CLOUDFLARE_API_TOKEN: string;
    CLOUDFLARE_ACCOUNT_ID: string;
    CLOUDFLARE_ZONE_ID: string;
    LOCALGENIUS_DOMAIN?: string;
  },
  registryDb?: RegistryDB,
): Promise<ProvisionResult> {
  // Validate input
  const parsed = BusinessSchema.safeParse(business);
  if (!parsed.success) {
    throw new ProvisioningError({
      step: 'provisioning',
      message: `Invalid business data: ${parsed.error.message}`,
      retryable: false,
    });
  }

  const cfg: CloudflareConfig = {
    apiToken: env.CLOUDFLARE_API_TOKEN,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: env.CLOUDFLARE_ZONE_ID,
    domain: env.LOCALGENIUS_DOMAIN ?? 'localgenius.site',
  };

  const result: Partial<ProvisionResult> = {
    status: 'provisioning',
    provisionedAt: new Date().toISOString(),
  };

  // Track created resources for rollback on failure
  const createdResources: CreatedResource[] = [];
  const workerName = `localgenius-${business.slug}`;

  // Insert initial registry row before provisioning begins
  if (registryDb) {
    try {
      await registryInsert(registryDb, business);
    } catch (err) {
      throw new ProvisioningError({
        step: 'provisioning',
        message: `Registry insert failed: ${(err as Error).message}`,
        retryable: true,
      });
    }
  }

  // Step 1: D1 Database
  let db: D1Database;
  try {
    db = await createD1Database(business.slug, cfg);
    createdResources.push({ type: 'd1_database', id: db.uuid });
    result.databaseId = db.uuid;
    result.status = 'database_created';
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'database_created', {
        database_id: db.uuid,
      });
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: 'database_created',
      message: `D1 database creation failed: ${(err as Error).message}`,
      retryable: true,
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'failed', {
        error_message: provError.message,
      });
    }
    // Nothing to roll back — this is the first resource
    throw provError;
  }

  // Step 2: R2 Bucket
  let bucket: R2Bucket;
  try {
    bucket = await createR2Bucket(business.slug, cfg);
    createdResources.push({ type: 'r2_bucket', id: bucket.name });
    result.bucketName = bucket.name;
    result.status = 'bucket_created';
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'bucket_created', {
        bucket_name: bucket.name,
      });
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: 'bucket_created',
      message: `R2 bucket creation failed: ${(err as Error).message}`,
      retryable: true,
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'failed', {
        error_message: provError.message,
      });
    }
    await rollback(createdResources, business.slug, cfg, provError);
    throw provError;
  }

  // Step 3: Deploy Worker
  let worker: WorkerDeployResult;
  try {
    worker = await deployEmdashWorker(business.slug, db.uuid, bucket.name, cfg);
    createdResources.push({ type: 'worker', id: workerName });
    result.workerId = worker.id;
    result.status = 'worker_deployed';
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'worker_deployed', {
        worker_id: worker.id,
      });
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: 'worker_deployed',
      message: `Worker deployment failed: ${(err as Error).message}`,
      retryable: true,
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'failed', {
        error_message: provError.message,
      });
    }
    await rollback(createdResources, business.slug, cfg, provError);
    throw provError;
  }

  // Step 4: DNS
  try {
    const dnsRecord = await configureDNS(business.slug, cfg);
    createdResources.push({ type: 'dns_record', id: dnsRecord.id });
    result.status = 'dns_configured';
    result.siteUrl = `https://${business.slug}.${cfg.domain}`;
    result.adminUrl = `https://${business.slug}.${cfg.domain}/_admin`;
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'dns_configured', {
        site_url: result.siteUrl,
      });
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: 'dns_configured',
      message: `DNS configuration failed: ${(err as Error).message}`,
      // DNS failures are often retryable (propagation issues)
      retryable: true,
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'failed', {
        error_message: provError.message,
      });
    }
    await rollback(createdResources, business.slug, cfg, provError);
    throw provError;
  }

  // Step 5: Seed Database
  try {
    await seedDatabase(business, db.uuid, cfg);
    result.status = 'database_seeded';
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'database_seeded');
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: 'database_seeded',
      message: `Database seeding failed: ${(err as Error).message}`,
      retryable: true,
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, 'failed', {
        error_message: provError.message,
      });
    }
    await rollback(createdResources, business.slug, cfg, provError);
    throw provError;
  }

  // All steps succeeded
  result.status = 'ready';
  if (registryDb) {
    await registryUpdateStatus(registryDb, business.slug, 'ready', {
      provisioned_at: new Date().toISOString(),
    });
  }

  return result as ProvisionResult;
}

// ============================================================
// Status Check — poll provisioning state from registry
// ============================================================

export async function getProvisioningStatus(
  slug: string,
  db: RegistryDB,
): Promise<ProvisionStatus | null> {
  const row = await db
    .prepare('SELECT status FROM site_registry WHERE slug = ?')
    .bind(slug)
    .first();

  return row ? (row.status as ProvisionStatus) : null;
}
