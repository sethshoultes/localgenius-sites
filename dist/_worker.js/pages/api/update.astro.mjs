globalThis.process ??= {}; globalThis.process.env ??= {};
export { r as renderers } from '../../chunks/astro_DcMjRC-Q.mjs';

let _requestId = 0;
function nextId() {
  return ++_requestId;
}
async function mcpRequest(endpoint, method, params = {}, secret) {
  const payload = {
    jsonrpc: "2.0",
    id: nextId(),
    method,
    params
  };
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  if (secret) {
    headers["X-MCP-Secret"] = secret;
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`MCP HTTP error ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  if (body.error) {
    throw new Error(`MCP error ${body.error.code}: ${body.error.message}`);
  }
  if (body.result === void 0) {
    throw new Error("MCP returned empty result");
  }
  return body.result;
}
async function initializeMcpSession(slug, config) {
  const endpoint = `https://${slug}.${config.domain}/_mcp`;
  await mcpRequest(
    endpoint,
    "initialize",
    {
      protocolVersion: "2024-11-05",
      capabilities: {
        roots: { listChanged: false },
        sampling: {}
      },
      clientInfo: {
        name: "localgenius-mcp-bridge",
        version: "1.0.0"
      }
    },
    config.mcpSecret
  );
  await mcpRequest(endpoint, "notifications/initialized", {}, config.mcpSecret);
  const toolsResult = await mcpRequest(
    endpoint,
    "tools/list",
    {},
    config.mcpSecret
  );
  return {
    endpoint,
    tools: toolsResult.tools ?? [],
    initialized: true
  };
}
function interpretInstruction(instruction, availableTools) {
  const lower = instruction.toLowerCase();
  const calls = [];
  const toolNames = new Set(availableTools.map((t) => t.name));
  if (lower.includes("homepage") || lower.includes("home page") || lower.includes("front page")) {
    if (toolNames.has("update_page")) {
      calls.push({
        name: "update_page",
        arguments: {
          slug: "home",
          instruction
        }
      });
    }
  }
  if (lower.includes("about")) {
    if (toolNames.has("update_page")) {
      calls.push({
        name: "update_page",
        arguments: { slug: "about", instruction }
      });
    }
  }
  if (lower.includes("hours") || lower.includes("open") || lower.includes("close")) {
    if (toolNames.has("update_business_hours")) {
      calls.push({ name: "update_business_hours", arguments: { instruction } });
    } else if (toolNames.has("update_setting")) {
      calls.push({
        name: "update_setting",
        arguments: { key: "business_hours", instruction }
      });
    }
  }
  if (lower.includes("phone") || lower.includes("email") || lower.includes("address") || lower.includes("contact")) {
    if (toolNames.has("update_contact_info")) {
      calls.push({ name: "update_contact_info", arguments: { instruction } });
    }
  }
  if (lower.includes("color") || lower.includes("theme") || lower.includes("font") || lower.includes("style")) {
    if (toolNames.has("update_theme")) {
      calls.push({ name: "update_theme", arguments: { instruction } });
    }
  }
  if (lower.includes("service") || lower.includes("menu") || lower.includes("offering") || lower.includes("product")) {
    if (toolNames.has("update_services")) {
      calls.push({ name: "update_services", arguments: { instruction } });
    } else if (toolNames.has("update_page")) {
      calls.push({ name: "update_page", arguments: { slug: "services", instruction } });
    }
  }
  if (calls.length === 0 && toolNames.has("update_content")) {
    calls.push({ name: "update_content", arguments: { instruction } });
  }
  return calls;
}
async function executeMcpTools(session, toolCalls, secret) {
  const results = [];
  for (const call of toolCalls) {
    try {
      const result = await mcpRequest(
        session.endpoint,
        "tools/call",
        {
          name: call.name,
          arguments: call.arguments
        },
        secret
      );
      results.push({
        name: call.name,
        result: result.content?.map((c) => c.text).join("\n") ?? result
      });
    } catch (err) {
      results.push({
        name: call.name,
        result: null,
        error: err.message
      });
    }
  }
  return results;
}
function parseChanges(toolResults) {
  const changes = [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const result of toolResults) {
    if (result.error) continue;
    try {
      const data = typeof result.result === "string" ? JSON.parse(result.result) : result.result;
      if (data && typeof data === "object" && "changes" in data) {
        const raw = data;
        changes.push(...raw.changes.map((c) => ({ ...c, appliedAt: now })));
        continue;
      }
    } catch {
    }
    changes.push({
      type: "section",
      target: result.name,
      newValue: String(result.result ?? ""),
      appliedAt: now
    });
  }
  return changes;
}
async function updateSiteContent(businessSlug, instruction, env) {
  const config = {
    domain: env.LOCALGENIUS_DOMAIN ?? "localgenius.site",
    mcpSecret: env.MCP_SHARED_SECRET,
    timeoutMs: 3e4
  };
  let session;
  try {
    session = await initializeMcpSession(businessSlug, config);
  } catch (err) {
    return {
      success: false,
      instruction,
      changes: [],
      toolCalls: [],
      toolResults: [],
      error: `Failed to connect to MCP server for ${businessSlug}: ${err.message}`
    };
  }
  const toolCalls = interpretInstruction(instruction, session.tools);
  if (toolCalls.length === 0) {
    return {
      success: false,
      instruction,
      changes: [],
      toolCalls: [],
      toolResults: [],
      error: `No applicable tools found for instruction: "${instruction}". Available tools: ${session.tools.map((t) => t.name).join(", ")}`
    };
  }
  const toolResults = await executeMcpTools(session, toolCalls, config.mcpSecret);
  const changes = parseChanges(toolResults);
  const hasErrors = toolResults.some((r) => r.error);
  return {
    success: !hasErrors || changes.length > 0,
    instruction,
    changes,
    toolCalls,
    toolResults
  };
}

const POST = async ({ request, locals }) => {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { slug, instruction } = body;
  if (!slug || typeof slug !== "string") {
    return new Response(JSON.stringify({ error: "Missing required field: slug" }), {
      status: 422,
      headers: { "Content-Type": "application/json" }
    });
  }
  if (!instruction || typeof instruction !== "string") {
    return new Response(JSON.stringify({ error: "Missing required field: instruction" }), {
      status: 422,
      headers: { "Content-Type": "application/json" }
    });
  }
  const env = locals.runtime?.env ?? {};
  try {
    const result = await updateSiteContent(slug, instruction, {
      LOCALGENIUS_DOMAIN: env["LOCALGENIUS_DOMAIN"],
      MCP_SHARED_SECRET: env["MCP_SHARED_SECRET"]
    });
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 422,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "MCP bridge failure", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
