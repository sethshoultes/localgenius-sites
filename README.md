# LocalGenius Sites

Managed websites for local businesses — built by AI, hosted on the edge.

Instantly provision Emdash CMS sites per business on Cloudflare. Update content naturally through an AI-powered MCP bridge. Zero ops, zero friction.

**Live Demo:** [localgenius-sites.pages.dev](https://localgenius-sites.pages.dev)
- Restaurant template: `/marias-kitchen`
- Professional services: `/bright-smile/services`

## Architecture

**Astro + Cloudflare Workers + D1 + R2**

```
Astro control plane (localgenius.site)
  ↓
Cloudflare API
  ├─ D1: per-business SQLite database
  ├─ R2: per-business image storage
  ├─ Workers: per-business Emdash runtime
  └─ DNS: subdomain provisioning ({slug}.localgenius.site)
        ↓
    Emdash MCP bridge
      ↓
    Content updates via natural language
```

Each business gets: isolated D1 database, isolated R2 bucket, dedicated Worker, and subdomain.

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | Astro 4.7 | SSR on Cloudflare Workers |
| **Database** | Cloudflare D1 | SQLite per business (registry + per-site) |
| **Storage** | Cloudflare R2 | Image & asset storage per site |
| **AI** | Workers AI | Whisper (transcription), Llama, SDXL (image generation) |
| **CMS** | Emdash | Content management via MCP protocol |
| **Fonts** | Source Sans 3, Lora | System typefaces |

## Templates

### Restaurant (7 sections)
- Hero with call-to-action
- Menu & pricing
- Hours & location
- Photo gallery
- Customer testimonials
- About the chef
- Contact & reservations

### Professional Services (7 sections)
- Hero with service highlights
- Service offerings with pricing
- Team bios
- Case studies & results
- Client testimonials
- FAQ
- Contact & booking

## API Endpoints

| Path | Method | Purpose |
|------|--------|---------|
| `/api/provision` | POST | Create new business site |
| `/api/update` | POST | Update content via natural language |
| `/api/sites` | GET | List all provisioned sites |
| `/api/voice/transcribe` | POST | Speech-to-text (Whisper) |
| `/api/ai/content-draft` | POST | Generate marketing copy |
| `/api/ai/sentiment` | POST | Analyze customer sentiment |
| `/api/ai/generate-image` | POST | Create images (SDXL) |

## Getting Started

```bash
npm install

# Set Cloudflare credentials (required for provisioning)
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put CLOUDFLARE_ZONE_ID
wrangler secret put MCP_SHARED_SECRET

# Local development
npm run dev       # http://localhost:3000

# Build and deploy
npm run build
npm run deploy
```

## Design System

**Color Palette:**
- **Terracotta** — `#C4704B` (primary accent, warmth)
- **Sage** — `#7A8B6F` (secondary, natural feel)
- **Warm White** — `#FAF8F5` (backgrounds, breathing room)

**Typography:**
- **Headings:** Source Sans 3 (sans-serif, modern)
- **Body:** Lora (serif, readable)

## Project Structure

```
src/
  pages/
    index.astro              — Control plane dashboard
    api/
      provision.ts           — Provision new business site
      update.ts              — Content updates via MCP
      sites.ts               — Site registry
      voice/transcribe.ts    — Speech-to-text
      ai/content-draft.ts    — Content generation
      ai/sentiment.ts        — Sentiment analysis
      ai/generate-image.ts   — Image generation
  components/
    BusinessCard.astro       — Site listing component
    ProvisionForm.astro      — Onboarding flow
  templates/
    Restaurant.astro         — Restaurant template (7 sections)
    ProfessionalServices.astro — Services template (7 sections)
  design/
    colors.ts                — Design tokens
    typography.ts            — Font definitions
  lib/
    provisioning.ts          — Cloudflare API orchestration
    mcp-bridge.ts            — MCP protocol client
    database.ts              — D1 queries
    storage.ts               — R2 operations
  workers/
    site-runtime.ts          — Per-business Worker handler
```

## Deployment

```bash
# Preview
npm run deploy

# Production
npm run deploy:prod

# Database migrations
npm run db:migrate
```

---

Built for AI-native workflows. Questions? See `/docs` for architecture deep-dives.
