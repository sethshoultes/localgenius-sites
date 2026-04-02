/**
 * Hybrid AI Router — Cost-Optimized Intelligence Layer
 *
 * Routes AI tasks to the cheapest capable model:
 *   - Claude (Sonnet/Haiku): Complex conversation, strategy, multi-turn reasoning
 *   - Llama 3.1 8B (Cloudflare): Content drafts, summaries, keyword extraction
 *   - Whisper (Cloudflare): Speech-to-text transcription
 *   - DistilBERT (Cloudflare): Sentiment classification
 *   - Stable Diffusion XL (Cloudflare): Image generation
 *
 * Cost comparison (per 1M tokens / 1K requests):
 *   Claude Sonnet: $3 input / $15 output
 *   Claude Haiku:  $0.25 input / $1.25 output
 *   Llama 3.1 8B:  ~$0.01 (Cloudflare Workers AI)
 *   Whisper:       ~$0.01 per request
 *   DistilBERT:    ~$0.001 per request
 *   SDXL:          ~$0.02 per image
 *
 * Target: AI costs < 2% of revenue ($29 plan → $0.58 AI budget → ample)
 */

// ─── Task Types ─────────────────────────────────────────────────────────────

export type AITaskType =
  | "conversation"        // Multi-turn chat — ALWAYS Claude
  | "content_draft"       // Social posts, email copy — Llama (fast, cheap)
  | "review_response"     // Draft review responses — Llama, then Claude refine
  | "seo_keywords"        // Extract keywords — Llama
  | "digest_summary"      // Weekly digest narrative — Llama
  | "sentiment"           // Review sentiment classification — DistilBERT
  | "transcription"       // Voice-to-text — Whisper
  | "image_generation"    // Promo graphics, menu photos — SDXL
  | "complex_reasoning";  // Strategy, analysis — ALWAYS Claude

export type AIProvider = "claude_sonnet" | "claude_haiku" | "llama_8b" | "whisper" | "distilbert" | "sdxl";

interface RoutingDecision {
  provider: AIProvider;
  model: string;
  reason: string;
  estimatedCostCents: number;  // Per request estimate
}

// ─── Routing Table ──────────────────────────────────────────────────────────

const ROUTING_TABLE: Record<AITaskType, RoutingDecision> = {
  conversation: {
    provider: "claude_sonnet",
    model: "claude-sonnet-4-20250514",
    reason: "Multi-turn reasoning requires Claude's context understanding",
    estimatedCostCents: 0.5,
  },
  complex_reasoning: {
    provider: "claude_sonnet",
    model: "claude-sonnet-4-20250514",
    reason: "Strategy and analysis require Claude's deep reasoning",
    estimatedCostCents: 1.0,
  },
  content_draft: {
    provider: "llama_8b",
    model: "@cf/meta/llama-3.1-8b-instruct",
    reason: "Content drafts are formulaic — Llama handles them at 300x lower cost",
    estimatedCostCents: 0.001,
  },
  review_response: {
    provider: "llama_8b",
    model: "@cf/meta/llama-3.1-8b-instruct",
    reason: "Review responses follow a template — Llama drafts, human approves",
    estimatedCostCents: 0.001,
  },
  seo_keywords: {
    provider: "llama_8b",
    model: "@cf/meta/llama-3.1-8b-instruct",
    reason: "Keyword extraction is mechanical — no need for Claude",
    estimatedCostCents: 0.001,
  },
  digest_summary: {
    provider: "llama_8b",
    model: "@cf/meta/llama-3.1-8b-instruct",
    reason: "Digest summaries follow a 5-section template — Llama + template = good enough",
    estimatedCostCents: 0.002,
  },
  sentiment: {
    provider: "distilbert",
    model: "@cf/huggingface/distilbert-sst-2",
    reason: "Binary sentiment classification — purpose-built model, near-zero cost",
    estimatedCostCents: 0.0001,
  },
  transcription: {
    provider: "whisper",
    model: "@cf/openai/whisper",
    reason: "Speech-to-text — only Whisper does this",
    estimatedCostCents: 0.01,
  },
  image_generation: {
    provider: "sdxl",
    model: "@cf/stabilityai/stable-diffusion-xl-base-1.0",
    reason: "Image generation — SDXL on Workers AI, no external API needed",
    estimatedCostCents: 2.0,
  },
};

// ─── Router ─────────────────────────────────────────────────────────────────

/**
 * Determine the optimal AI provider for a given task.
 */
export function routeTask(taskType: AITaskType): RoutingDecision {
  return ROUTING_TABLE[taskType];
}

/**
 * Estimate monthly AI cost for a business based on typical usage.
 *
 * Typical monthly usage per business:
 *   - 60 conversation turns (Claude Sonnet)
 *   - 12 social post drafts (Llama)
 *   - 20 review response drafts (Llama)
 *   - 4 digest summaries (Llama)
 *   - 50 sentiment classifications (DistilBERT)
 *   - 30 voice transcriptions (Whisper)
 *   - 2 image generations (SDXL)
 */
export function estimateMonthlyCost(plan: "base" | "pro" = "base"): {
  totalCents: number;
  breakdown: Record<string, number>;
  revenuePercent: number;
} {
  const usage = {
    conversation: plan === "pro" ? 120 : 60,
    content_draft: plan === "pro" ? 20 : 12,
    review_response: plan === "pro" ? 40 : 20,
    digest_summary: 4,
    sentiment: plan === "pro" ? 100 : 50,
    transcription: plan === "pro" ? 60 : 30,
    image_generation: plan === "pro" ? 4 : 2,
    seo_keywords: plan === "pro" ? 8 : 4,
    complex_reasoning: plan === "pro" ? 4 : 2,
  };

  const breakdown: Record<string, number> = {};
  let totalCents = 0;

  for (const [task, count] of Object.entries(usage)) {
    const route = ROUTING_TABLE[task as AITaskType];
    if (route) {
      const cost = route.estimatedCostCents * count;
      breakdown[task] = cost;
      totalCents += cost;
    }
  }

  const revenueCents = plan === "pro" ? 7900 : 2900;

  return {
    totalCents: Math.round(totalCents * 100) / 100,
    breakdown,
    revenuePercent: Math.round((totalCents / revenueCents) * 10000) / 100,
  };
}

// ─── Cloudflare AI Executor ─────────────────────────────────────────────────

interface AIBinding {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Execute a text generation task on Cloudflare Workers AI (Llama).
 */
export async function runLlama(
  ai: AIBinding,
  prompt: string,
  systemPrompt?: string,
  maxTokens: number = 512
): Promise<string> {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const result = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    messages,
    max_tokens: maxTokens,
  }) as { response?: string };

  return result.response || "";
}

/**
 * Classify text sentiment using DistilBERT.
 * Returns: "positive" | "negative" with confidence score.
 */
export async function classifySentiment(
  ai: AIBinding,
  text: string
): Promise<{ label: "positive" | "negative"; score: number }> {
  const result = await ai.run("@cf/huggingface/distilbert-sst-2", {
    text,
  }) as Array<{ label: string; score: number }>;

  // DistilBERT returns array sorted by score descending
  const top = Array.isArray(result) ? result[0] : { label: "positive", score: 0.5 };
  return {
    label: top.label.toLowerCase() as "positive" | "negative",
    score: top.score,
  };
}

/**
 * Generate an image using Stable Diffusion XL.
 * Returns raw image bytes (PNG).
 */
export async function generateImage(
  ai: AIBinding,
  prompt: string,
  negativePrompt?: string
): Promise<Uint8Array> {
  const result = await ai.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
    prompt,
    negative_prompt: negativePrompt || "blurry, low quality, text, watermark",
    num_steps: 20,
  }) as ReadableStream | Uint8Array;

  if (result instanceof Uint8Array) return result;

  // Handle ReadableStream
  const reader = (result as ReadableStream).getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined;
}
