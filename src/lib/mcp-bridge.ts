/**
 * LocalGenius MCP Bridge
 *
 * Connects the LocalGenius AI assistant to each business site's Emdash MCP server.
 * Emdash exposes an MCP endpoint at /_mcp on every deployed site. This bridge:
 *   1. Authenticates with the site's MCP server
 *   2. Sends natural-language content instructions
 *   3. Returns a structured diff of the changes made
 *
 * MCP Protocol: https://modelcontextprotocol.io/
 * Emdash MCP endpoint: https://{slug}.localgenius.site/_mcp
 */

// ============================================================
// Types
// ============================================================

export interface McpMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface McpToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface McpToolResult {
  name: string;
  result: unknown;
  error?: string;
}

export interface ContentChange {
  type: 'page' | 'setting' | 'image' | 'section';
  target: string;           // e.g. "home", "about", "theme.primaryColor"
  field?: string;           // e.g. "content", "title", "meta_description"
  previousValue?: string;
  newValue: string;
  appliedAt: string;
}

export interface McpUpdateResult {
  success: boolean;
  instruction: string;
  changes: ContentChange[];
  toolCalls: McpToolCall[];
  toolResults: McpToolResult[];
  rawResponse?: string;
  error?: string;
}

export interface McpConnectionConfig {
  domain: string;           // e.g. "localgenius.site"
  mcpSecret?: string;       // Shared secret for MCP auth
  timeoutMs?: number;
}

// ============================================================
// MCP JSON-RPC Protocol Helpers
// ============================================================

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// MCP Initialize result
interface McpInitResult {
  protocolVersion: string;
  capabilities: {
    tools?: { listChanged?: boolean };
    resources?: { listChanged?: boolean };
    prompts?: { listChanged?: boolean };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

// MCP Tool definition from server
interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ============================================================
// MCP Client
// ============================================================

let _requestId = 0;

function nextId(): number {
  return ++_requestId;
}

async function mcpRequest<T>(
  endpoint: string,
  method: string,
  params: Record<string, unknown> = {},
  secret?: string
): Promise<T> {
  const payload: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: nextId(),
    method,
    params,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (secret) {
    headers['X-MCP-Secret'] = secret;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`MCP HTTP error ${res.status}: ${await res.text()}`);
  }

  const body = (await res.json()) as JsonRpcResponse<T>;

  if (body.error) {
    throw new Error(`MCP error ${body.error.code}: ${body.error.message}`);
  }

  if (body.result === undefined) {
    throw new Error('MCP returned empty result');
  }

  return body.result;
}

// ============================================================
// MCP Session Manager
// ============================================================

interface McpSession {
  endpoint: string;
  tools: McpTool[];
  initialized: boolean;
}

async function initializeMcpSession(
  slug: string,
  config: McpConnectionConfig
): Promise<McpSession> {
  const endpoint = `https://${slug}.${config.domain}/_mcp`;

  // MCP initialize handshake
  const initResult = await mcpRequest<McpInitResult>(
    endpoint,
    'initialize',
    {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: false },
        sampling: {},
      },
      clientInfo: {
        name: 'localgenius-mcp-bridge',
        version: '1.0.0',
      },
    },
    config.mcpSecret
  );

  // Notify server we're ready
  await mcpRequest<null>(endpoint, 'notifications/initialized', {}, config.mcpSecret);

  // Discover available tools
  const toolsResult = await mcpRequest<{ tools: McpTool[] }>(
    endpoint,
    'tools/list',
    {},
    config.mcpSecret
  );

  return {
    endpoint,
    tools: toolsResult.tools ?? [],
    initialized: true,
  };
}

// ============================================================
// Instruction Interpreter
// ============================================================

/**
 * Maps a natural language instruction to specific MCP tool calls.
 * In production, this would call Claude via AI binding or Workers AI
 * to intelligently select and parameterize tools. This scaffold
 * implements a deterministic rule-based interpreter as the baseline.
 */
function interpretInstruction(
  instruction: string,
  availableTools: McpTool[]
): McpToolCall[] {
  const lower = instruction.toLowerCase();
  const calls: McpToolCall[] = [];

  const toolNames = new Set(availableTools.map((t) => t.name));

  // Update homepage content
  if (lower.includes('homepage') || lower.includes('home page') || lower.includes('front page')) {
    if (toolNames.has('update_page')) {
      calls.push({
        name: 'update_page',
        arguments: {
          slug: 'home',
          instruction,
        },
      });
    }
  }

  // Update about page
  if (lower.includes('about')) {
    if (toolNames.has('update_page')) {
      calls.push({
        name: 'update_page',
        arguments: { slug: 'about', instruction },
      });
    }
  }

  // Business hours
  if (lower.includes('hours') || lower.includes('open') || lower.includes('close')) {
    if (toolNames.has('update_business_hours')) {
      calls.push({ name: 'update_business_hours', arguments: { instruction } });
    } else if (toolNames.has('update_setting')) {
      calls.push({
        name: 'update_setting',
        arguments: { key: 'business_hours', instruction },
      });
    }
  }

  // Contact info
  if (lower.includes('phone') || lower.includes('email') || lower.includes('address') || lower.includes('contact')) {
    if (toolNames.has('update_contact_info')) {
      calls.push({ name: 'update_contact_info', arguments: { instruction } });
    }
  }

  // Theme / design
  if (lower.includes('color') || lower.includes('theme') || lower.includes('font') || lower.includes('style')) {
    if (toolNames.has('update_theme')) {
      calls.push({ name: 'update_theme', arguments: { instruction } });
    }
  }

  // Services / offerings
  if (lower.includes('service') || lower.includes('menu') || lower.includes('offering') || lower.includes('product')) {
    if (toolNames.has('update_services')) {
      calls.push({ name: 'update_services', arguments: { instruction } });
    } else if (toolNames.has('update_page')) {
      calls.push({ name: 'update_page', arguments: { slug: 'services', instruction } });
    }
  }

  // Fallback: use generic update_content if available
  if (calls.length === 0 && toolNames.has('update_content')) {
    calls.push({ name: 'update_content', arguments: { instruction } });
  }

  return calls;
}

// ============================================================
// Execute MCP Tool Calls
// ============================================================

async function executeMcpTools(
  session: McpSession,
  toolCalls: McpToolCall[],
  secret?: string
): Promise<McpToolResult[]> {
  const results: McpToolResult[] = [];

  // Execute tool calls sequentially — most CMS updates have ordering dependencies
  for (const call of toolCalls) {
    try {
      const result = await mcpRequest<{ content: Array<{ type: string; text: string }> }>(
        session.endpoint,
        'tools/call',
        {
          name: call.name,
          arguments: call.arguments,
        },
        secret
      );

      results.push({
        name: call.name,
        result: result.content?.map((c) => c.text).join('\n') ?? result,
      });
    } catch (err) {
      results.push({
        name: call.name,
        result: null,
        error: (err as Error).message,
      });
    }
  }

  return results;
}

// ============================================================
// Parse Changes from Tool Results
// ============================================================

function parseChanges(toolResults: McpToolResult[]): ContentChange[] {
  const changes: ContentChange[] = [];
  const now = new Date().toISOString();

  for (const result of toolResults) {
    if (result.error) continue;

    // Attempt to parse structured change data from Emdash tool results
    try {
      const data = typeof result.result === 'string'
        ? JSON.parse(result.result)
        : result.result;

      if (data && typeof data === 'object' && 'changes' in data) {
        const raw = data as { changes: ContentChange[] };
        changes.push(...raw.changes.map((c) => ({ ...c, appliedAt: now })));
        continue;
      }
    } catch {
      // Result wasn't JSON — treat as a text change summary
    }

    // Fallback: record the tool invocation itself as a change event
    changes.push({
      type: 'section',
      target: result.name,
      newValue: String(result.result ?? ''),
      appliedAt: now,
    });
  }

  return changes;
}

// ============================================================
// Public API
// ============================================================

/**
 * Updates site content by sending a natural language instruction to
 * the business's Emdash MCP server.
 *
 * @param businessSlug - The business identifier (e.g. "joes-pizza")
 * @param instruction  - Natural language update instruction
 * @param env          - Environment bindings (API secrets)
 * @returns Structured result with all changes applied
 */
export async function updateSiteContent(
  businessSlug: string,
  instruction: string,
  env: {
    LOCALGENIUS_DOMAIN?: string;
    MCP_SHARED_SECRET?: string;
  }
): Promise<McpUpdateResult> {
  const config: McpConnectionConfig = {
    domain: env.LOCALGENIUS_DOMAIN ?? 'localgenius.site',
    mcpSecret: env.MCP_SHARED_SECRET,
    timeoutMs: 30_000,
  };

  let session: McpSession;

  try {
    session = await initializeMcpSession(businessSlug, config);
  } catch (err) {
    return {
      success: false,
      instruction,
      changes: [],
      toolCalls: [],
      toolResults: [],
      error: `Failed to connect to MCP server for ${businessSlug}: ${(err as Error).message}`,
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
      error: `No applicable tools found for instruction: "${instruction}". Available tools: ${session.tools.map((t) => t.name).join(', ')}`,
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
    toolResults,
  };
}

/**
 * Lists all available MCP tools for a deployed site.
 * Useful for debugging and building the instruction interpreter.
 */
export async function listSiteMcpTools(
  businessSlug: string,
  env: { LOCALGENIUS_DOMAIN?: string; MCP_SHARED_SECRET?: string }
): Promise<McpTool[]> {
  const config: McpConnectionConfig = {
    domain: env.LOCALGENIUS_DOMAIN ?? 'localgenius.site',
    mcpSecret: env.MCP_SHARED_SECRET,
  };

  const session = await initializeMcpSession(businessSlug, config);
  return session.tools;
}
