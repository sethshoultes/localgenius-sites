globalThis.process ??= {}; globalThis.process.env ??= {};
import { o as objectType, s as stringType } from '../../chunks/zod_Bvw_ofkP.mjs';
export { r as renderers } from '../../chunks/astro_BceOcufW.mjs';

const BusinessSchema = objectType({
  slug: stringType().min(2).max(63).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: stringType().min(1).max(200),
  type: stringType().min(1).max(100),
  city: stringType().min(1).max(100),
  phone: stringType().optional(),
  email: stringType().email().optional(),
  address: stringType().optional(),
  description: stringType().optional()
});
class ProvisioningError extends Error {
  step;
  code;
  retryable;
  rollbackAttempted;
  rollbackErrors;
  constructor(detail) {
    super(detail.message);
    this.name = "ProvisioningError";
    this.step = detail.step;
    this.code = detail.code;
    this.retryable = detail.retryable;
    this.rollbackAttempted = false;
    this.rollbackErrors = [];
  }
}
async function rollback(resources, slug, config, error) {
  error.rollbackAttempted = true;
  const reversed = [...resources].reverse();
  for (const resource of reversed) {
    try {
      switch (resource.type) {
        case "dns_record":
          await cfFetch(
            `/zones/${config.zoneId}/dns_records/${resource.id}`,
            config,
            { method: "DELETE" }
          );
          break;
        case "worker":
          await cfFetch(
            `/accounts/${config.accountId}/workers/scripts/${resource.id}`,
            config,
            { method: "DELETE" }
          );
          break;
        case "r2_bucket":
          await cfFetch(
            `/accounts/${config.accountId}/r2/buckets/${resource.id}`,
            config,
            { method: "DELETE" }
          );
          break;
        case "d1_database":
          await cfFetch(
            `/accounts/${config.accountId}/d1/database/${resource.id}`,
            config,
            { method: "DELETE" }
          );
          break;
      }
    } catch (rollbackErr) {
      error.rollbackErrors.push(
        `Failed to delete ${resource.type} (${resource.id}): ${rollbackErr.message}`
      );
    }
  }
}
async function registryInsert(db, business) {
  await db.prepare(
    `INSERT INTO site_registry (slug, business_name, business_type, city, status)
       VALUES (?, ?, ?, ?, 'provisioning')`
  ).bind(business.slug, business.name, business.type, business.city).run();
}
async function registryUpdateStatus(db, slug, status, fields) {
  const sets = ["status = ?", "updated_at = datetime('now')"];
  const params = [status];
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      if (value !== void 0) {
        sets.push(`${key} = ?`);
        params.push(value);
      }
    }
  }
  params.push(slug);
  await db.prepare(`UPDATE site_registry SET ${sets.join(", ")} WHERE slug = ?`).bind(...params).run();
}
async function cfFetch(path, config, options = {}) {
  const url = `https://api.cloudflare.com/client/v4${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      ...options.headers ?? {}
    }
  });
  const body = await res.json();
  if (!body.success) {
    const err = body.errors[0];
    throw new Error(`Cloudflare API error ${err?.code ?? res.status}: ${err?.message ?? "Unknown error"}`);
  }
  return body.result;
}
async function createD1Database(slug, config) {
  const dbName = `localgenius-${slug}`;
  return cfFetch(
    `/accounts/${config.accountId}/d1/database`,
    config,
    {
      method: "POST",
      body: JSON.stringify({ name: dbName })
    }
  );
}
async function createR2Bucket(slug, config) {
  const bucketName = `localgenius-${slug}`;
  return cfFetch(
    `/accounts/${config.accountId}/r2/buckets`,
    config,
    {
      method: "POST",
      body: JSON.stringify({
        name: bucketName,
        locationHint: "auto"
      })
    }
  );
}
async function deployEmdashWorker(slug, databaseId, bucketName, config) {
  const workerName = `localgenius-${slug}`;
  const workerScript = generateEmdashWorkerScript(slug);
  const metadata = {
    main_module: "worker.js",
    bindings: [
      {
        type: "d1",
        name: "DB",
        id: databaseId
      },
      {
        type: "r2_bucket",
        name: "SITE_ASSETS",
        bucket_name: bucketName
      },
      {
        type: "plain_text",
        name: "BUSINESS_SLUG",
        text: slug
      },
      {
        type: "plain_text",
        name: "SITE_DOMAIN",
        text: `${slug}.${config.domain}`
      }
    ],
    compatibility_date: "2024-05-01",
    compatibility_flags: ["nodejs_compat"]
  };
  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    "metadata.json"
  );
  formData.append(
    "worker.js",
    new Blob([workerScript], { type: "application/javascript+module" }),
    "worker.js"
  );
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/scripts/${workerName}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.apiToken}`
      // No Content-Type — let fetch set multipart boundary
    },
    body: formData
  });
  const body = await res.json();
  if (!body.success) {
    const err = body.errors[0];
    throw new Error(`Worker deploy failed ${err?.code}: ${err?.message}`);
  }
  return body.result;
}
function generateEmdashWorkerScript(slug) {
  return `
// LocalGenius — Emdash Worker for: ${slug}
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

    // Emdash CMS runtime handles all other routes
    // TODO: Replace with compiled Emdash bundle
    return new Response('LocalGenius site for ${slug} — Emdash runtime initializing', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
`.trim();
}
async function configureDNS(slug, config) {
  const record = await cfFetch(
    `/zones/${config.zoneId}/dns_records`,
    config,
    {
      method: "POST",
      body: JSON.stringify({
        type: "CNAME",
        name: `${slug}.${config.domain}`,
        content: `localgenius-${slug}.workers.dev`,
        proxied: true,
        ttl: 1,
        // Auto (proxied records require TTL=1)
        comment: `LocalGenius auto-provisioned for ${slug}`
      })
    }
  );
  await cfFetch(
    `/accounts/${config.accountId}/workers/scripts/localgenius-${slug}/subdomain`,
    config,
    {
      method: "POST",
      body: JSON.stringify({ enabled: true })
    }
  );
  return record;
}
async function seedDatabase(business, databaseId, config) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
              '${esc(business.city)}', ${business.phone ? `'${esc(business.phone)}'` : "NULL"},
              ${business.email ? `'${esc(business.email)}'` : "NULL"},
              ${business.address ? `'${esc(business.address)}'` : "NULL"},
              ${business.description ? `'${esc(business.description)}'` : "NULL"},
              '${now}', '${now}')`,
    // Seed default pages
    `INSERT OR IGNORE INTO site_pages (slug, title, content, meta_description, published, created_at, updated_at)
      VALUES ('home', 'Welcome to ${esc(business.name)}',
              'We are a ${esc(business.type)} in ${esc(business.city)}.',
              '${esc(business.name)} — ${esc(business.type)} in ${esc(business.city)}',
              1, '${now}', '${now}')`,
    // Seed default settings
    `INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES ('theme', 'default', '${now}')`,
    `INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES ('ai_enabled', 'true', '${now}')`
  ];
  await cfFetch(
    `/accounts/${config.accountId}/d1/database/${databaseId}/query`,
    config,
    {
      method: "POST",
      body: JSON.stringify({ sql: statements.join(";\n") })
    }
  );
}
function esc(s) {
  return s.replace(/'/g, "''");
}
async function provisionSite(business, env, registryDb) {
  const parsed = BusinessSchema.safeParse(business);
  if (!parsed.success) {
    throw new ProvisioningError({
      step: "provisioning",
      message: `Invalid business data: ${parsed.error.message}`,
      retryable: false
    });
  }
  const cfg = {
    apiToken: env.CLOUDFLARE_API_TOKEN,
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: env.CLOUDFLARE_ZONE_ID,
    domain: env.LOCALGENIUS_DOMAIN ?? "localgenius.site"
  };
  const result = {
    status: "provisioning",
    provisionedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const createdResources = [];
  const workerName = `localgenius-${business.slug}`;
  if (registryDb) {
    try {
      await registryInsert(registryDb, business);
    } catch (err) {
      throw new ProvisioningError({
        step: "provisioning",
        message: `Registry insert failed: ${err.message}`,
        retryable: true
      });
    }
  }
  let db;
  try {
    db = await createD1Database(business.slug, cfg);
    createdResources.push({ type: "d1_database", id: db.uuid });
    result.databaseId = db.uuid;
    result.status = "database_created";
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "database_created", {
        database_id: db.uuid
      });
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: "database_created",
      message: `D1 database creation failed: ${err.message}`,
      retryable: true
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "failed", {
        error_message: provError.message
      });
    }
    throw provError;
  }
  let bucket;
  try {
    bucket = await createR2Bucket(business.slug, cfg);
    createdResources.push({ type: "r2_bucket", id: bucket.name });
    result.bucketName = bucket.name;
    result.status = "bucket_created";
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "bucket_created", {
        bucket_name: bucket.name
      });
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: "bucket_created",
      message: `R2 bucket creation failed: ${err.message}`,
      retryable: true
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "failed", {
        error_message: provError.message
      });
    }
    await rollback(createdResources, business.slug, cfg, provError);
    throw provError;
  }
  let worker;
  try {
    worker = await deployEmdashWorker(business.slug, db.uuid, bucket.name, cfg);
    createdResources.push({ type: "worker", id: workerName });
    result.workerId = worker.id;
    result.status = "worker_deployed";
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "worker_deployed", {
        worker_id: worker.id
      });
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: "worker_deployed",
      message: `Worker deployment failed: ${err.message}`,
      retryable: true
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "failed", {
        error_message: provError.message
      });
    }
    await rollback(createdResources, business.slug, cfg, provError);
    throw provError;
  }
  try {
    const dnsRecord = await configureDNS(business.slug, cfg);
    createdResources.push({ type: "dns_record", id: dnsRecord.id });
    result.status = "dns_configured";
    result.siteUrl = `https://${business.slug}.${cfg.domain}`;
    result.adminUrl = `https://${business.slug}.${cfg.domain}/_admin`;
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "dns_configured", {
        site_url: result.siteUrl
      });
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: "dns_configured",
      message: `DNS configuration failed: ${err.message}`,
      // DNS failures are often retryable (propagation issues)
      retryable: true
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "failed", {
        error_message: provError.message
      });
    }
    await rollback(createdResources, business.slug, cfg, provError);
    throw provError;
  }
  try {
    await seedDatabase(business, db.uuid, cfg);
    result.status = "database_seeded";
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "database_seeded");
    }
  } catch (err) {
    const provError = new ProvisioningError({
      step: "database_seeded",
      message: `Database seeding failed: ${err.message}`,
      retryable: true
    });
    if (registryDb) {
      await registryUpdateStatus(registryDb, business.slug, "failed", {
        error_message: provError.message
      });
    }
    await rollback(createdResources, business.slug, cfg, provError);
    throw provError;
  }
  result.status = "ready";
  if (registryDb) {
    await registryUpdateStatus(registryDb, business.slug, "ready", {
      provisioned_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return result;
}

const POST = async ({ request, locals }) => {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized — Bearer token required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const parsed = BusinessSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }
  const env = locals.runtime?.env ?? {};
  const requiredVars = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ZONE_ID"];
  for (const v of requiredVars) {
    if (!env[v]) {
      return new Response(
        JSON.stringify({ error: `Missing environment variable: ${v}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  const registryDb = env["DB"];
  try {
    const result = await provisionSite(
      parsed.data,
      {
        CLOUDFLARE_API_TOKEN: env["CLOUDFLARE_API_TOKEN"],
        CLOUDFLARE_ACCOUNT_ID: env["CLOUDFLARE_ACCOUNT_ID"],
        CLOUDFLARE_ZONE_ID: env["CLOUDFLARE_ZONE_ID"],
        LOCALGENIUS_DOMAIN: env["LOCALGENIUS_DOMAIN"]
      },
      registryDb
    );
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    if (err instanceof ProvisioningError) {
      return new Response(
        JSON.stringify({
          error: err.message,
          step: err.step,
          retryable: err.retryable
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "Unexpected provisioning failure", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
