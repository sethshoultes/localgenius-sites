/**
 * GET /api/sites
 *
 * Lists all provisioned sites from the registry.
 *
 * Query params:
 *   ?status=ready  — filter by status (provisioning, ready, failed, suspended)
 *
 * Response:
 *   [{ slug, business_name, status, site_url }, ...]
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  // Auth check — require bearer token
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized — Bearer token required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env ?? {};
  const db = env['DB'] as { prepare: (sql: string) => { bind: (...args: unknown[]) => { all: () => Promise<{ results: unknown[] }> }; all: () => Promise<{ results: unknown[] }> } } | undefined;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Registry database not available' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');

  try {
    let results: unknown[];

    if (statusFilter) {
      const stmt = db.prepare(
        'SELECT slug, business_name, status, site_url FROM site_registry WHERE status = ? ORDER BY created_at DESC'
      );
      const rows = await stmt.bind(statusFilter).all();
      results = rows.results;
    } else {
      const stmt = db.prepare(
        'SELECT slug, business_name, status, site_url FROM site_registry ORDER BY created_at DESC'
      );
      const rows = await stmt.all();
      results = rows.results;
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to query site registry', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
