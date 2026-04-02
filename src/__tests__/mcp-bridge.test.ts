import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateSiteContent, listSiteMcpTools } from '../lib/mcp-bridge';

// ============================================================
// Helpers
// ============================================================

const mcpEnv = {
  LOCALGENIUS_DOMAIN: 'localgenius.site',
  MCP_SHARED_SECRET: 'test-secret',
};

// Standard set of tools an Emdash MCP server exposes
const standardTools = [
  { name: 'update_page', description: 'Update a page', inputSchema: {} },
  { name: 'update_business_hours', description: 'Update business hours', inputSchema: {} },
  { name: 'update_contact_info', description: 'Update contact info', inputSchema: {} },
  { name: 'update_theme', description: 'Update theme settings', inputSchema: {} },
  { name: 'update_services', description: 'Update services/menu', inputSchema: {} },
  { name: 'update_content', description: 'Generic content update', inputSchema: {} },
];

/** Build a JSON-RPC success response */
function rpcOk(id: number, result: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ jsonrpc: '2.0', id, result }),
    text: async () => JSON.stringify({ jsonrpc: '2.0', id, result }),
  } as unknown as Response;
}

/** Build a JSON-RPC error response */
function rpcError(id: number, code: number, message: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ jsonrpc: '2.0', id, error: { code, message } }),
    text: async () => JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }),
  } as unknown as Response;
}

/** Build an HTTP-level failure */
function httpFail(status: number, body: string) {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body,
  } as unknown as Response;
}

/**
 * Mock fetch that handles the 3-step MCP session init (initialize, notifications/initialized, tools/list)
 * plus any subsequent tool calls.
 */
function mockMcpSession(
  tools = standardTools,
  toolCallResults: Array<{ content: Array<{ type: string; text: string }> }> = []
) {
  let callIndex = 0;
  const mockFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string);
    callIndex++;

    if (body.method === 'initialize') {
      return rpcOk(body.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'emdash', version: '1.0.0' },
      });
    }

    if (body.method === 'notifications/initialized') {
      return rpcOk(body.id, null);
    }

    if (body.method === 'tools/list') {
      return rpcOk(body.id, { tools });
    }

    if (body.method === 'tools/call') {
      const idx = callIndex - 4; // first 3 calls are session init
      const result = toolCallResults[idx] ?? {
        content: [{ type: 'text', text: JSON.stringify({ changes: [{ type: 'page', target: 'home', newValue: 'updated', appliedAt: new Date().toISOString() }] }) }],
      };
      return rpcOk(body.id, result);
    }

    return rpcOk(body.id, null);
  });

  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

// ============================================================
// MCP Session Initialization
// ============================================================

describe('MCP session initialization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends initialize, notifications/initialized, and tools/list in order', async () => {
    const mockFetch = mockMcpSession();

    const tools = await listSiteMcpTools('joes-pizza', mcpEnv);

    expect(tools).toHaveLength(standardTools.length);
    expect(tools[0].name).toBe('update_page');

    // Verify the 3 session calls
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const calls = mockFetch.mock.calls;
    const methods = calls.map((c) => JSON.parse(c[1]?.body as string).method);
    expect(methods).toEqual(['initialize', 'notifications/initialized', 'tools/list']);
  });

  it('targets the correct MCP endpoint URL', async () => {
    const mockFetch = mockMcpSession();

    await listSiteMcpTools('my-biz', {
      LOCALGENIUS_DOMAIN: 'example.com',
      MCP_SHARED_SECRET: 'sec',
    });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe('https://my-biz.example.com/_mcp');
  });

  it('includes X-MCP-Secret header when secret is provided', async () => {
    const mockFetch = mockMcpSession();

    await listSiteMcpTools('joes-pizza', mcpEnv);

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['X-MCP-Secret']).toBe('test-secret');
  });
});

// ============================================================
// interpretInstruction (tested via updateSiteContent)
// ============================================================

describe('interpretInstruction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps "update my hours" to update_business_hours', async () => {
    const mockFetch = mockMcpSession();

    const result = await updateSiteContent('joes-pizza', 'update my hours to 9am-5pm', mcpEnv);

    expect(result.success).toBe(true);
    expect(result.toolCalls.length).toBeGreaterThanOrEqual(1);
    expect(result.toolCalls.some((c) => c.name === 'update_business_hours')).toBe(true);
  });

  it('maps "change homepage" to update_page with slug=home', async () => {
    const mockFetch = mockMcpSession();

    const result = await updateSiteContent('joes-pizza', 'change homepage to welcome message', mcpEnv);

    expect(result.success).toBe(true);
    const pageCall = result.toolCalls.find((c) => c.name === 'update_page' && c.arguments.slug === 'home');
    expect(pageCall).toBeDefined();
  });

  it('maps "update about page" to update_page with slug=about', async () => {
    const mockFetch = mockMcpSession();

    const result = await updateSiteContent('joes-pizza', 'update about page with our story', mcpEnv);

    expect(result.success).toBe(true);
    const aboutCall = result.toolCalls.find((c) => c.name === 'update_page' && c.arguments.slug === 'about');
    expect(aboutCall).toBeDefined();
  });

  it('maps "update menu" to update_services', async () => {
    const mockFetch = mockMcpSession();

    const result = await updateSiteContent('joes-pizza', 'update menu with new items', mcpEnv);

    expect(result.success).toBe(true);
    expect(result.toolCalls.some((c) => c.name === 'update_services')).toBe(true);
  });

  it('falls back to update_content for unrecognized instructions', async () => {
    const mockFetch = mockMcpSession();

    const result = await updateSiteContent('joes-pizza', 'do something unexpected', mcpEnv);

    expect(result.success).toBe(true);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe('update_content');
  });

  it('returns error when no tools match and no fallback available', async () => {
    // Server has only a tool that no instruction will match
    mockMcpSession([{ name: 'niche_tool', description: 'Niche', inputSchema: {} }]);

    const result = await updateSiteContent('joes-pizza', 'do something random', mcpEnv);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No applicable tools found');
  });
});

// ============================================================
// updateSiteContent end-to-end
// ============================================================

describe('updateSiteContent end-to-end', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns structured changes from a successful tool call', async () => {
    mockMcpSession(standardTools, [
      {
        content: [{
          type: 'text',
          text: JSON.stringify({
            changes: [{
              type: 'page',
              target: 'home',
              field: 'content',
              previousValue: 'old content',
              newValue: 'new content',
              appliedAt: '2025-01-01T00:00:00Z',
            }],
          }),
        }],
      },
    ]);

    const result = await updateSiteContent('joes-pizza', 'update homepage with new content', mcpEnv);

    expect(result.success).toBe(true);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].type).toBe('page');
    expect(result.changes[0].target).toBe('home');
    expect(result.changes[0].newValue).toBe('new content');
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0].error).toBeUndefined();
  });

  it('includes the original instruction in the result', async () => {
    mockMcpSession();

    const result = await updateSiteContent('joes-pizza', 'change the font to Comic Sans', mcpEnv);

    expect(result.instruction).toBe('change the font to Comic Sans');
  });

  it('records fallback changes when tool result is not structured JSON', async () => {
    mockMcpSession(standardTools, [
      { content: [{ type: 'text', text: 'Hours updated successfully' }] },
    ]);

    const result = await updateSiteContent('joes-pizza', 'update my hours', mcpEnv);

    expect(result.success).toBe(true);
    // Non-JSON result creates a fallback "section" change
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].type).toBe('section');
  });
});

// ============================================================
// Error handling
// ============================================================

describe('MCP error handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when MCP server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed: ECONNREFUSED')));

    const result = await updateSiteContent('joes-pizza', 'update hours', mcpEnv);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to connect to MCP server');
    expect(result.error).toContain('ECONNREFUSED');
    expect(result.changes).toHaveLength(0);
    expect(result.toolCalls).toHaveLength(0);
  });

  it('returns error when MCP auth fails (HTTP 401)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(httpFail(401, 'Unauthorized')));

    const result = await updateSiteContent('joes-pizza', 'update hours', mcpEnv);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to connect to MCP server');
    expect(result.error).toContain('401');
  });

  it('returns error when MCP server returns empty tool list', async () => {
    // Session init succeeds but returns no tools
    mockMcpSession([]);

    const result = await updateSiteContent('joes-pizza', 'update my hours', mcpEnv);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No applicable tools found');
  });

  it('handles a tool call that returns an MCP error gracefully', async () => {
    // Set up session init to succeed, but tool call to fail
    let callIndex = 0;
    vi.stubGlobal('fetch', vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      callIndex++;

      if (body.method === 'initialize') {
        return rpcOk(body.id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'emdash', version: '1.0.0' },
        });
      }
      if (body.method === 'notifications/initialized') {
        return rpcOk(body.id, null);
      }
      if (body.method === 'tools/list') {
        return rpcOk(body.id, { tools: standardTools });
      }
      if (body.method === 'tools/call') {
        return rpcError(body.id, -32000, 'Internal tool error');
      }
      return rpcOk(body.id, null);
    }));

    const result = await updateSiteContent('joes-pizza', 'update my hours', mcpEnv);

    // Tool call errors are captured in toolResults, not as a top-level failure
    // The function returns success:true when changes.length > 0, but here there are
    // no changes because the tool errored. However the code checks hasErrors || changes.length
    // Actually: success = !hasErrors || changes.length > 0
    // hasErrors = true, changes.length = 0 => success = false || false = false
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults[0].error).toContain('Internal tool error');
  });
});
