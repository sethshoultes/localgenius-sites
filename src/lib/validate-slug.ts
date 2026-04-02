/**
 * Slug Validation — returns true only for provisioned business sites.
 *
 * For now, uses a static allowlist. When D1 registry is wired,
 * this will query the site_registry table.
 */

// Known provisioned sites — add slugs as businesses are provisioned
const KNOWN_SLUGS = new Set([
  "marias-kitchen-austin",
]);

/**
 * Check if a slug corresponds to a real provisioned site.
 * Returns false for undefined, empty, or unknown slugs.
 */
export function isValidSlug(slug: string | undefined): boolean {
  if (!slug) return false;
  return KNOWN_SLUGS.has(slug);
}
