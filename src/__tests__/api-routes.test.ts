import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Mocks
// ============================================================

vi.mock('../lib/provisioning', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/provisioning')>();
  return {
    ...actual,
    provisionSite: vi.fn(),
  };
});

vi.mock('../lib/mcp-bridge', () => ({
  updateSiteContent: vi.fn(),
}));

import { provisionSite } from '../lib/provisioning';
import { updateSiteContent } from '../lib/mcp-bridge';

// Import route handlers
import { POST as provisionHandler } from '../pages/api/provision';
import { POST as updateHandler } from '../pages/api/update';
import { GET as sitesListHandler } from '../pages/api/sites/index';
import { GET as siteDetailHandler } from '../pages/api/sites/[slug]';

// ============================================================
// Helpers
// ============================================================

/** Build a Request with optional auth and JSON body */
function makeRequest(
  url: string,
  options: { method?: string; bearer?: string; body?: unknown } = {}
): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.bearer) {
    headers['Authorization'] = `Bearer ${options.bearer}`;
  }
  return new Request(url, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

/** Build a mock Astro APIContext-like object with locals.runtime.env */
function makeContext(
  request: Request,
  env: Record<string, unknown> = {},
  params: Record<string, string | undefined> = {}
) {
  return {
    request,
    locals: { runtime: { env } },
    params,
    // Astro APIContext has other fields but the routes only use these
  } as any;
}

/** Create a mock D1 database binding */
function mockDB(options: {
  allResults?: unknown[];
  firstResult?: Record<string, unknown> | null;
} = {}) {
  const { allResults = [], firstResult = null } = options;
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: allResults }),
        first: vi.fn().mockResolvedValue(firstResult),
      }),
      all: vi.fn().mockResolvedValue({ results: allResults }),
      first: vi.fn().mockResolvedValue(firstResult),
    }),
  };
}

// ============================================================
// POST /api/provision
// ============================================================

describe('POST /api/provision', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const validBody = {
    slug: 'joes-pizza',
    name: "Joe's Pizza",
    type: 'restaurant',
    city: 'Springfield',
  };

  const fullEnv = {
    CLOUDFLARE_API_TOKEN: 'cf-token',
    CLOUDFLARE_ACCOUNT_ID: 'cf-account',
    CLOUDFLARE_ZONE_ID: 'cf-zone',
    LOCALGENIUS_DOMAIN: 'localgenius.site',
  };

  it('returns 401 without Bearer token', async () => {
    const req = makeRequest('http://localhost/api/provision', {
      method: 'POST',
      body: validBody,
    });
    const res = await provisionHandler(makeContext(req));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 422 with invalid body (missing slug)', async () => {
    const req = makeRequest('http://localhost/api/provision', {
      method: 'POST',
      bearer: 'test-token',
      body: { name: "Joe's Pizza", type: 'restaurant', city: 'Springfield' },
    });
    const res = await provisionHandler(makeContext(req));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('Validation failed');
  });

  it('returns 500 when CLOUDFLARE_API_TOKEN is missing from env', async () => {
    const req = makeRequest('http://localhost/api/provision', {
      method: 'POST',
      bearer: 'test-token',
      body: validBody,
    });
    const res = await provisionHandler(makeContext(req, {}));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('Missing environment variable');
    expect(json.error).toContain('CLOUDFLARE_API_TOKEN');
  });

  it('returns 201 on successful provision', async () => {
    const provisionResult = {
      status: 'ready',
      databaseId: 'db-uuid-123',
      bucketName: 'localgenius-joes-pizza',
      workerId: 'worker-id-456',
      siteUrl: 'https://joes-pizza.localgenius.site',
      adminUrl: 'https://joes-pizza.localgenius.site/_admin',
      provisionedAt: '2025-01-01T00:00:00Z',
    };
    (provisionSite as ReturnType<typeof vi.fn>).mockResolvedValue(provisionResult);

    const req = makeRequest('http://localhost/api/provision', {
      method: 'POST',
      bearer: 'test-token',
      body: validBody,
    });
    const res = await provisionHandler(makeContext(req, fullEnv));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe('ready');
    expect(json.siteUrl).toBe('https://joes-pizza.localgenius.site');
    expect(json.databaseId).toBe('db-uuid-123');
  });
});

// ============================================================
// POST /api/update
// ============================================================

describe('POST /api/update', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without Bearer token', async () => {
    const req = makeRequest('http://localhost/api/update', {
      method: 'POST',
      body: { slug: 'joes-pizza', instruction: 'update hours' },
    });
    const res = await updateHandler(makeContext(req));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 422 with missing slug', async () => {
    const req = makeRequest('http://localhost/api/update', {
      method: 'POST',
      bearer: 'test-token',
      body: { instruction: 'update hours' },
    });
    const res = await updateHandler(makeContext(req));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('slug');
  });

  it('returns 422 with missing instruction', async () => {
    const req = makeRequest('http://localhost/api/update', {
      method: 'POST',
      bearer: 'test-token',
      body: { slug: 'joes-pizza' },
    });
    const res = await updateHandler(makeContext(req));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('instruction');
  });

  it('returns 200 on successful update', async () => {
    const updateResult = {
      success: true,
      instruction: 'update hours to 9am-5pm',
      changes: [{ type: 'section', target: 'hours', newValue: '9am-5pm', appliedAt: '2025-01-01T00:00:00Z' }],
      toolCalls: [{ name: 'update_business_hours', arguments: { hours: '9am-5pm' } }],
      toolResults: [{ content: [{ type: 'text', text: 'Hours updated' }] }],
    };
    (updateSiteContent as ReturnType<typeof vi.fn>).mockResolvedValue(updateResult);

    const req = makeRequest('http://localhost/api/update', {
      method: 'POST',
      bearer: 'test-token',
      body: { slug: 'joes-pizza', instruction: 'update hours to 9am-5pm' },
    });
    const res = await updateHandler(makeContext(req, {
      LOCALGENIUS_DOMAIN: 'localgenius.site',
      MCP_SHARED_SECRET: 'secret',
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.changes).toHaveLength(1);
    expect(json.toolCalls).toHaveLength(1);
  });
});

// ============================================================
// GET /api/sites
// ============================================================

describe('GET /api/sites', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without Bearer token', async () => {
    const req = makeRequest('http://localhost/api/sites');
    const res = await sitesListHandler(makeContext(req));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns empty array when no sites', async () => {
    const db = mockDB({ allResults: [] });
    const req = makeRequest('http://localhost/api/sites', { bearer: 'test-token' });
    const res = await sitesListHandler(makeContext(req, { DB: db }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });

  it('returns filtered results with ?status=ready', async () => {
    const readySites = [
      { slug: 'joes-pizza', business_name: "Joe's Pizza", status: 'ready', site_url: 'https://joes-pizza.localgenius.site' },
    ];
    const db = mockDB({ allResults: readySites });
    const req = makeRequest('http://localhost/api/sites?status=ready', { bearer: 'test-token' });
    const res = await sitesListHandler(makeContext(req, { DB: db }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].status).toBe('ready');

    // Verify the SQL used the bind path (with WHERE clause)
    const prepareCall = db.prepare.mock.calls[0][0] as string;
    expect(prepareCall).toContain('WHERE status = ?');
    const bindMock = db.prepare.mock.results[0].value.bind;
    expect(bindMock).toHaveBeenCalledWith('ready');
  });

  it('returns all sites without filter', async () => {
    const allSites = [
      { slug: 'joes-pizza', business_name: "Joe's Pizza", status: 'ready', site_url: 'https://joes-pizza.localgenius.site' },
      { slug: 'bobs-shop', business_name: "Bob's Shop", status: 'provisioning', site_url: 'https://bobs-shop.localgenius.site' },
    ];
    const db = mockDB({ allResults: allSites });
    const req = makeRequest('http://localhost/api/sites', { bearer: 'test-token' });
    const res = await sitesListHandler(makeContext(req, { DB: db }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);

    // Verify no WHERE clause used (the .all() path without bind)
    const prepareCall = db.prepare.mock.calls[0][0] as string;
    expect(prepareCall).not.toContain('WHERE');
  });
});

// ============================================================
// GET /api/sites/:slug
// ============================================================

describe('GET /api/sites/:slug', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without Bearer token', async () => {
    const req = makeRequest('http://localhost/api/sites/joes-pizza');
    const res = await siteDetailHandler(makeContext(req, {}, { slug: 'joes-pizza' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 404 for non-existent slug', async () => {
    const db = mockDB({ firstResult: null });
    const req = makeRequest('http://localhost/api/sites/no-such-site', { bearer: 'test-token' });
    const res = await siteDetailHandler(makeContext(req, { DB: db }, { slug: 'no-such-site' }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('not found');
  });

  it('returns full site record for existing slug', async () => {
    const siteRecord = {
      id: 1,
      slug: 'joes-pizza',
      business_name: "Joe's Pizza",
      business_type: 'restaurant',
      city: 'Springfield',
      status: 'ready',
      site_url: 'https://joes-pizza.localgenius.site',
      database_id: 'db-uuid-123',
      bucket_name: 'localgenius-joes-pizza',
      worker_id: 'worker-id-456',
      error_message: null,
      provisioned_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };
    const db = mockDB({ firstResult: siteRecord });
    const req = makeRequest('http://localhost/api/sites/joes-pizza', { bearer: 'test-token' });
    const res = await siteDetailHandler(makeContext(req, { DB: db }, { slug: 'joes-pizza' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.slug).toBe('joes-pizza');
    expect(json.business_name).toBe("Joe's Pizza");
    expect(json.status).toBe('ready');
    expect(json.database_id).toBe('db-uuid-123');
    expect(json.worker_id).toBe('worker-id-456');
  });
});
