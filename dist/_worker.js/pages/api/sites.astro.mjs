globalThis.process ??= {}; globalThis.process.env ??= {};
export { r as renderers } from '../../chunks/astro_BceOcufW.mjs';

const GET = async ({ request, locals }) => {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized — Bearer token required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const env = locals.runtime?.env ?? {};
  const db = env["DB"];
  if (!db) {
    return new Response(JSON.stringify({ error: "Registry database not available" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status");
  try {
    let results;
    if (statusFilter) {
      const stmt = db.prepare(
        "SELECT slug, business_name, status, site_url FROM site_registry WHERE status = ? ORDER BY created_at DESC"
      );
      const rows = await stmt.bind(statusFilter).all();
      results = rows.results;
    } else {
      const stmt = db.prepare(
        "SELECT slug, business_name, status, site_url FROM site_registry ORDER BY created_at DESC"
      );
      const rows = await stmt.all();
      results = rows.results;
    }
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to query site registry", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
