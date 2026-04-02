globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, a as renderHead, b as renderTemplate } from '../chunks/astro_DcMjRC-Q.mjs';
export { r as renderers } from '../chunks/astro_DcMjRC-Q.mjs';
import '../chunks/kleur_DHimoS-P.mjs';
/* empty css                                 */

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="en" data-astro-cid-j7pv25f6> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>LocalGenius Sites — Control Plane</title>${renderHead()}</head> <body data-astro-cid-j7pv25f6> <h1 data-astro-cid-j7pv25f6>LocalGenius Sites</h1> <p data-astro-cid-j7pv25f6>Emdash-powered website builder on Cloudflare Workers + D1 + R2.</p> <p data-astro-cid-j7pv25f6>Each provisioned site lives at <code data-astro-cid-j7pv25f6>${slug}.localgenius.site</code>.</p> <h2 data-astro-cid-j7pv25f6>API Endpoints</h2> <pre data-astro-cid-j7pv25f6>POST /api/provision       — Provision a new business site
GET  /api/sites           — List all provisioned sites
GET  /api/sites/:slug     — Get site status
POST /api/sites/:slug/update — Send content update via MCP
    </pre> <h2 data-astro-cid-j7pv25f6>Documentation</h2> <p data-astro-cid-j7pv25f6><a href="/api/provision" data-astro-cid-j7pv25f6>Provision API</a> — Requires CLOUDFLARE_API_TOKEN header.</p> </body></html>`;
}, "/Users/sethshoultes/Local Sites/localgenius-sites/src/pages/index.astro", void 0);

const $$file = "/Users/sethshoultes/Local Sites/localgenius-sites/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
