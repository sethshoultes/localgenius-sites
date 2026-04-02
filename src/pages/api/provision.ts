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

export const POST: APIRoute = async ({ request, locals }) => {
  // Auth check — require bearer token
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized — Bearer token required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse + validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = BusinessSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Cloudflare env bindings come through locals.runtime.env in Astro + CF adapter
  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};

  const requiredVars = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_ID'];
  for (const v of requiredVars) {
    if (!env[v]) {
      return new Response(
        JSON.stringify({ error: `Missing environment variable: ${v}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
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
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof ProvisioningError) {
      return new Response(
        JSON.stringify({
          error: err.message,
          step: err.step,
          retryable: err.retryable,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unexpected provisioning failure', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
