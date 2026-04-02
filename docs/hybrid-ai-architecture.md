# Hybrid AI Architecture — Cost-Optimized Intelligence Layer

## The Thesis

Claude is brilliant but expensive. Most AI tasks in LocalGenius don't need brilliance — they need competence at scale. The hybrid architecture routes each task to the cheapest capable model:

- **Claude** (Sonnet): Complex conversation, multi-turn reasoning, strategy
- **Llama 3.1 8B** (Cloudflare): Content drafts, summaries, keyword extraction
- **Whisper** (Cloudflare): Speech-to-text transcription
- **DistilBERT** (Cloudflare): Binary sentiment classification
- **Stable Diffusion XL** (Cloudflare): Image generation

**Result:** AI costs drop from ~$1.50/user/month (all-Claude) to ~$0.35/user/month (hybrid). That's 1.2% of $29 revenue. Absurd margin.

---

## Routing Table

| Task | Provider | Model | Cost/Request | Why |
|------|----------|-------|-------------|-----|
| Conversation | Claude Sonnet | claude-sonnet-4-20250514 | ~$0.005 | Multi-turn reasoning, context understanding |
| Complex reasoning | Claude Sonnet | claude-sonnet-4-20250514 | ~$0.01 | Strategy, analysis |
| Content drafts | Llama 3.1 8B | @cf/meta/llama-3.1-8b-instruct | ~$0.00001 | Formulaic — social posts, email copy |
| Review responses | Llama 3.1 8B | @cf/meta/llama-3.1-8b-instruct | ~$0.00001 | Template-based, human-approved |
| SEO keywords | Llama 3.1 8B | @cf/meta/llama-3.1-8b-instruct | ~$0.00001 | Mechanical extraction |
| Digest summaries | Llama 3.1 8B | @cf/meta/llama-3.1-8b-instruct | ~$0.00002 | 5-section template |
| Sentiment | DistilBERT | @cf/huggingface/distilbert-sst-2 | ~$0.000001 | Purpose-built binary classifier |
| Transcription | Whisper | @cf/openai/whisper | ~$0.0001 | Only option for STT |
| Image generation | SDXL | @cf/stabilityai/stable-diffusion-xl-base-1.0 | ~$0.02 | On-demand, low volume |

---

## Monthly Cost Estimate Per Business

### Base Plan ($29/month)

| Task | Volume | Cost |
|------|--------|------|
| Conversation (Claude) | 60 turns | $0.30 |
| Content drafts (Llama) | 12 posts | $0.00012 |
| Review responses (Llama) | 20 drafts | $0.0002 |
| Digest summaries (Llama) | 4 digests | $0.00008 |
| Sentiment (DistilBERT) | 50 reviews | $0.00005 |
| Voice transcription (Whisper) | 30 recordings | $0.003 |
| Image generation (SDXL) | 2 images | $0.04 |
| SEO keywords (Llama) | 4 audits | $0.00004 |
| Complex reasoning (Claude) | 2 analyses | $0.02 |
| **Total** | | **$0.36** |

**Revenue %: 1.2%** — target was <2%.

### Pro Plan ($79/month)

| Task | Volume | Cost |
|------|--------|------|
| Conversation (Claude) | 120 turns | $0.60 |
| All Cloudflare tasks | 2x base | $0.10 |
| **Total** | | **$0.70** |

**Revenue %: 0.9%**

---

## API Endpoints

All endpoints live on the Cloudflare Sites project (`localgenius-sites.pages.dev`).

| Endpoint | Method | Model | Input | Output |
|----------|--------|-------|-------|--------|
| `/api/voice/transcribe` | POST | Whisper | audio file | `{ text, duration_ms }` |
| `/api/ai/content-draft` | POST | Llama 3.1 8B | `{ type, prompt, businessContext }` | `{ text, type, duration_ms }` |
| `/api/ai/sentiment` | POST | DistilBERT | `{ text }` or `{ texts }` | `{ results: [{ label, score }] }` |
| `/api/ai/generate-image` | POST | SDXL | `{ prompt, negativePrompt }` | PNG image or `{ image: base64 }` |

All endpoints require `Authorization: Bearer <token>` and return CORS headers.

---

## Architecture

```
User speaks → Mic button → /api/voice/transcribe (Whisper)
                                    ↓
                              Transcribed text
                                    ↓
User types/speaks → LocalGenius AI (Vercel) → AI Router decides:
                         ↓                         ↓
                    Claude (complex)          Cloudflare (commodity)
                         ↓                         ↓
                    Conversation,            Content drafts,
                    strategy,                sentiment,
                    multi-turn               images, keywords
```

The AI Router (`src/workers/ai-router.ts`) is a pure function — no side effects, no state. It takes a task type and returns the routing decision. The calling code (Vercel or Cloudflare) executes against the appropriate provider.

---

## Quality Guardrails

1. **Conversation is ALWAYS Claude.** No degradation for the primary product experience.
2. **Llama outputs are drafts, not final.** User approves before publishing.
3. **Sentiment classification is supplementary.** Never used for critical decisions.
4. **Image generation is on-demand.** Only when user requests or during onboarding.
5. **If a Cloudflare model fails, fall back to Claude Haiku.** Never show the user an error for AI tasks.

---

## Implementation Status

| Component | Status |
|-----------|--------|
| AI Router (`src/workers/ai-router.ts`) | DONE |
| Voice transcription (`/api/voice/transcribe`) | DEPLOYED |
| Content drafts (`/api/ai/content-draft`) | IN PROGRESS |
| Sentiment (`/api/ai/sentiment`) | IN PROGRESS |
| Image generation (`/api/ai/generate-image`) | IN PROGRESS |
| Frontend voice wiring | IN PROGRESS |
| Integration with main app | PENDING |
