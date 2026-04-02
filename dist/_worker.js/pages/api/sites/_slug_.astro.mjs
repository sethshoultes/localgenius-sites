globalThis.process ??= {}; globalThis.process.env ??= {};
export { r as renderers } from '../../../chunks/astro_DcMjRC-Q.mjs';

const GET = async ({ params, request, locals }) => {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized — Bearer token required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { slug } = params;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
      status: 400,
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
  try {
    const row = await db.prepare("SELECT * FROM site_registry WHERE slug = ?").bind(slug).first();
    if (!row) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify(row), {
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
