/**
 * POST /api/sites/:slug/update
 *
 * Send a natural language content update to a provisioned site via MCP.
 *
 * Request body:
 *   { slug: string, instruction: string }
 *
 * Response:
 *   { success, changes, toolCalls, toolResults, error? }
 */

import type { APIRoute } from 'astro';
import { updateSiteContent } from '../../lib/mcp-bridge';
import { getCorsHeaders, corsPreflightResponse } from '../../lib/cors';

export const POST: APIRoute = async ({ request, locals }) => {
  const corsHeaders = getCorsHeaders(request);

  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { slug, instruction } = body as { slug?: string; instruction?: string };

  if (!slug || typeof slug !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing required field: slug' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (!instruction || typeof instruction !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing required field: instruction' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};

  try {
    const result = await updateSiteContent(slug, instruction, {
      LOCALGENIUS_DOMAIN: env['LOCALGENIUS_DOMAIN'],
      MCP_SHARED_SECRET: env['MCP_SHARED_SECRET'],
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 422,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'MCP bridge failure', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

// Handle CORS preflight
export const OPTIONS: APIRoute = async ({ request }) => {
  return corsPreflightResponse(request);
};
