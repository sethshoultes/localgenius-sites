/**
 * GET /api/sites/:slug
 *
 * Returns the full registry record for a single site by slug.
 *
 * Response:
 *   { id, slug, business_name, business_type, city, status, site_url,
 *     database_id, bucket_name, worker_id, error_message, provisioned_at,
 *     created_at, updated_at }
 *
 * 404 if the slug is not found.
 */

import type { APIRoute } from 'astro';
import { getCorsHeaders, corsPreflightResponse } from '../../../lib/cors';

export const GET: APIRoute = async ({ params, request, locals }) => {
  const corsHeaders = getCorsHeaders(request);

  // Auth check — require bearer token
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized — Bearer token required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { slug } = params;
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const env = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env ?? {};
  const db = env['DB'] as { prepare: (sql: string) => { bind: (...args: unknown[]) => { first: () => Promise<Record<string, unknown> | null> } } } | undefined;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Registry database not available' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const row = await db
      .prepare('SELECT * FROM site_registry WHERE slug = ?')
      .bind(slug)
      .first();

    if (!row) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify(row), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to query site registry', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

// Handle CORS preflight
export const OPTIONS: APIRoute = async ({ request }) => {
  return corsPreflightResponse(request);
};
