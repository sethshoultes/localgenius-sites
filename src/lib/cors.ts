/**
 * CORS Configuration — Jensen Issue #5
 *
 * Scoped CORS headers for LocalGenius API endpoints.
 * Only allows requests from known LocalGenius origins.
 * Wildcard (*) is a security vulnerability — never use it.
 */

const ALLOWED_ORIGINS = new Set([
  "https://localgenius.company",
  "https://www.localgenius.company",
  "https://localgenius-sites.pages.dev",
  // Development
  "http://localhost:3000",
  "http://localhost:4321",
]);

/**
 * Returns CORS headers for the given request origin.
 * If the origin is not in the allowlist, defaults to the production origin.
 * This prevents CORS bypass via arbitrary Origin headers.
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://localgenius.company";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

/**
 * Standard CORS preflight response.
 */
export function corsPreflightResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request),
      "Access-Control-Max-Age": "86400",
    },
  });
}
