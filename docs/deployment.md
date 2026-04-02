# Deployment Guide

## Prerequisites

1. **Wrangler CLI** installed (`npm i -g wrangler` or use the project-local copy via `npx`)
2. **Authenticated** with Cloudflare: `npx wrangler login`
3. **Cloudflare account** with Workers, D1, and R2 enabled

## Environment Variables

The following must be configured as Wrangler secrets or in your environment:

| Variable | Description |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers/D1/R2 permissions |
| `CLOUDFLARE_ACCOUNT_ID` | `a02352ad1742197c106c1774fcbada2d` (set in deploy scripts) |
| `CLOUDFLARE_ZONE_ID` | Zone ID for the localgenius.site domain |
| `LOCALGENIUS_DOMAIN` | `localgenius.site` (production) or `staging.localgenius.site` (staging) |
| `MCP_SHARED_SECRET` | Shared secret for MCP authentication |

Set secrets with:

```bash
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put MCP_SHARED_SECRET
```

## First Deploy

```bash
# 1. Install dependencies
npm install

# 2. Run the database migration (creates tables in remote D1)
npm run db:migrate

# 3. Deploy to production
npm run deploy:prod
```

## Schema Migration

Apply `src/db/registry-schema.sql` to the D1 database:

```bash
# Remote (production)
npm run db:migrate

# Local development
npm run db:migrate:local
```

## Staging vs Production

The project has two Wrangler environments defined in `wrangler.toml`:

- **Production** (`npm run deploy:prod`) -- deploys as `localgenius-sites` with `localgenius.site` domain
- **Staging** (`npm run deploy:staging`) -- deploys as `localgenius-sites-staging` with `staging.localgenius.site` domain

Staging uses separate D1 and R2 resources (see `wrangler.toml` for binding details).

## Deploy Commands

```bash
# Production deploy (build + test + deploy)
npm run deploy:prod

# Staging deploy (build + test + deploy --env staging)
npm run deploy:staging

# Run tests only
npm test
```

The deploy scripts will abort if tests fail.
