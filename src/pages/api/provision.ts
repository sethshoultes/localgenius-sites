/**
 * POST /api/provision
 *
 * Provisions a new LocalGenius site for a business.
 *
 * Request body:
 *   { slug, name, type, city, phone?, email?, address?, description? }
 *
 * Response:
 *   { siteUrl, adminUrl, status, databaseId, bucketName, workerId, provisionedAt }
 */

import type { APIRoute } from 'astro';
import { provisionSite, BusinessSchema, ProvisioningError, type RegistryDB } from '../../lib/provisioning';
import { getCorsHeaders, corsPreflightResponse } from '../../lib/cors';

export const POST: APIRoute = async ({ request, locals }) => {
  // CORS — scoped to allowed origins only (Jensen #5)
  const corsHeaders = getCorsHeaders(request);

  // Auth check — require bearer token
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized — Bearer token required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Parse + validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const parsed = BusinessSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }),
      { status: 422, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Cloudflare env bindings come through locals.runtime.env in Astro + CF adapter
  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};

  const requiredVars = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_ID'];
  for (const v of requiredVars) {
    if (!env[v]) {
      return new Response(
        JSON.stringify({ error: `Missing environment variable: ${v}` }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  // Registry DB binding for tracking provisioning status
  const registryDb = env['DB'] as unknown as RegistryDB | undefined;

  try {
    const result = await provisionSite(
      parsed.data,
      {
        CLOUDFLARE_API_TOKEN: env['CLOUDFLARE_API_TOKEN']!,
        CLOUDFLARE_ACCOUNT_ID: env['CLOUDFLARE_ACCOUNT_ID']!,
        CLOUDFLARE_ZONE_ID: env['CLOUDFLARE_ZONE_ID']!,
        LOCALGENIUS_DOMAIN: env['LOCALGENIUS_DOMAIN'] as string | undefined,
      },
      registryDb,
    );

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    if (err instanceof ProvisioningError) {
      return new Response(
        JSON.stringify({
          error: err.message,
          step: err.step,
          retryable: err.retryable,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unexpected provisioning failure', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

// Handle CORS preflight
export const OPTIONS: APIRoute = async ({ request }) => {
  return corsPreflightResponse(request);
};
