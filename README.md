# LocalGenius Sites

AI-powered website builder on Cloudflare. Provisions Emdash-powered sites per business in seconds.

## Architecture

```
                    LocalGenius Control Plane
                    (Astro + Cloudflare Workers)
                            |
              +-------------+-------------+
              |                           |
    Provisioning Service           MCP Bridge
    (src/lib/provisioning.ts)  (src/lib/mcp-bridge.ts)
              |                           |
              v                           v
    Cloudflare REST API          Emdash MCP Server
    - D1: per-site database       (/{slug}.localgenius.site/_mcp)
    - R2: per-site assets
    - Workers: per-site runtime
    - DNS: {slug}.localgenius.site
```

Each business gets:
- Isolated D1 database
- Isolated R2 bucket
- Dedicated Cloudflare Worker (Emdash runtime)
- Subdomain: `{slug}.localgenius.site`
- Natural language content updates via MCP

## Quick Start

```bash
npm install

# Set secrets (never commit these)
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_ZONE_ID
wrangler secret put MCP_SHARED_SECRET

# Create the registry D1 database
wrangler d1 create localgenius-registry
# Copy the database_id into wrangler.toml

# Create the global R2 bucket
wrangler r2 bucket create localgenius-assets

# Local dev
npm run dev

# Deploy
npm run deploy
```

## Provisioning a Site

```bash
curl -X POST https://localgenius-sites.workers.dev/api/provision \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "joes-pizza",
    "name": "Joe'\''s Pizza",
    "type": "restaurant",
    "city": "Austin",
    "phone": "512-555-0100",
    "email": "joe@joespizza.com"
  }'
```

Response:
```json
{
  "siteUrl": "https://joes-pizza.localgenius.site",
  "adminUrl": "https://joes-pizza.localgenius.site/_admin",
  "status": "ready",
  "databaseId": "...",
  "bucketName": "localgenius-joes-pizza",
  "workerId": "...",
  "provisionedAt": "2026-04-02T..."
}
```

## Updating Site Content via MCP

```bash
curl -X POST https://localgenius-sites.workers.dev/api/update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "joes-pizza",
    "instruction": "Update the homepage headline to highlight our new wood-fired oven"
  }'
```

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | CF API token with Workers, D1, R2, DNS edit permissions | Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Yes |
| `CLOUDFLARE_ZONE_ID` | Zone ID for localgenius.site | Yes |
| `LOCALGENIUS_DOMAIN` | Base domain (default: localgenius.site) | No |
| `MCP_SHARED_SECRET` | Shared secret for MCP server auth | No |

## Project Structure

```
localgenius-sites/
  astro.config.mjs         — Astro + Cloudflare adapter config
  wrangler.toml            — D1, R2, Workers bindings
  package.json
  tsconfig.json
  src/
    lib/
      provisioning.ts      — Core provisioning service (Cloudflare API)
      mcp-bridge.ts        — MCP client for Emdash content updates
    pages/
      index.astro          — Control plane landing page
      api/
        provision.ts       — POST /api/provision
        update.ts          — POST /api/update
```

## Provisioning Steps

1. **D1 database** — `localgenius-{slug}` — isolated SQLite per business
2. **R2 bucket** — `localgenius-{slug}` — assets, images, uploads
3. **Worker deploy** — Emdash runtime with D1 + R2 bindings
4. **DNS** — CNAME + Workers route for `{slug}.localgenius.site`
5. **DB seed** — Business profile, default pages, settings

Each step is retryable. Failures surface with `retryable: true/false` flag.

## MCP Protocol

Emdash exposes MCP at `https://{slug}.localgenius.site/_mcp`.

The bridge uses MCP 2024-11-05 protocol:
1. `initialize` handshake
2. `tools/list` — discover available tools
3. Natural language → tool selection (rule-based now, Claude API later)
4. `tools/call` — execute updates
5. Return structured `ContentChange[]` diff

## Next Steps

- [ ] Replace rule-based MCP interpreter with Claude API tool selection
- [ ] Add site registry to global D1 — track all provisioned sites
- [ ] Streaming MCP responses via SSE
- [ ] Provisioning status webhook callbacks
- [ ] Multi-tenant admin dashboard
- [ ] Emdash worker template — replace placeholder with real bundle
