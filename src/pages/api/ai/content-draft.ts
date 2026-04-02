/**
 * POST /api/ai/content-draft
 *
 * Generate AI-powered content drafts for various business use cases.
 *
 * Request:
 *   {
 *     type: "social_post" | "review_response" | "email_subject" | "seo_keywords",
 *     prompt: string,
 *     businessContext?: { name?: string, industry?: string, tone?: string, [key: string]: unknown }
 *   }
 *
 * Response:
 *   { text: string, type: string, duration_ms: number }
 *
 * Uses Llama 3.1 8B via Cloudflare Workers AI for cost-effective content generation.
 * Rate limit: inherits from Cloudflare Workers AI quota (free tier: 10K req/day)
 */

import type { APIRoute } from "astro";
import { runLlama } from "../../../workers/ai-router";

interface ContentDraftRequest {
  type: "social_post" | "review_response" | "email_subject" | "seo_keywords";
  prompt: string;
  businessContext?: Record<string, unknown>;
}

interface AIBinding {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
}

// System prompts tailored to each content type
const SYSTEM_PROMPTS: Record<string, string> = {
  social_post: `You are a expert social media copywriter for small businesses.
Create engaging, authentic social media posts that drive engagement and build community.
Keep posts concise, conversational, and on-brand.
Include relevant hashtags when appropriate.
Avoid corporate jargon.`,

  review_response: `You are a expert at crafting professional, empathetic review responses for small businesses.
Write genuine responses that address the reviewer's concerns or thank them for their feedback.
Keep responses professional but warm and human.
Stay brief (2-3 sentences typically).
Never be defensive.`,

  email_subject: `You are an expert email copywriter who writes compelling subject lines.
Create subject lines that are clear, benefit-driven, and compelling.
Keep subject lines under 60 characters.
Avoid spam trigger words.
Make the reader want to open the email.`,

  seo_keywords: `You are an SEO expert who extracts and generates relevant keywords.
Provide a comma-separated list of relevant, searchable keywords.
Focus on keywords with good search volume and reasonable competition.
Include long-tail keywords (3+ words).
Return only the keywords, no explanations.`,
};

export const POST: APIRoute = async ({ request, locals }) => {
  // CORS for browser requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Auth check
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized — Bearer token required" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Get the AI binding
  const env = (locals as { runtime?: { env?: Record<string, unknown> } }).runtime?.env ?? {};
  const ai = env["AI"] as AIBinding | undefined;

  if (!ai) {
    return new Response(
      JSON.stringify({ error: "Workers AI binding not available" }),
      { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Parse request body
  let body: ContentDraftRequest;
  try {
    body = (await request.json()) as ContentDraftRequest;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Validate required fields
  const { type, prompt, businessContext } = body;
  if (!type || !prompt) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: type and prompt" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (!SYSTEM_PROMPTS[type]) {
    return new Response(
      JSON.stringify({
        error: "Invalid type. Must be one of: social_post, review_response, email_subject, seo_keywords",
      }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (prompt.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Prompt cannot be empty" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Enrich prompt with business context if provided
  let enhancedPrompt = prompt;
  if (businessContext) {
    const contextParts: string[] = [];
    if (businessContext.name) contextParts.push(`Business name: ${businessContext.name}`);
    if (businessContext.industry) contextParts.push(`Industry: ${businessContext.industry}`);
    if (businessContext.tone) contextParts.push(`Tone: ${businessContext.tone}`);

    if (contextParts.length > 0) {
      enhancedPrompt = `${contextParts.join("\n")}\n\n${prompt}`;
    }
  }

  // Generate content
  const start = Date.now();
  try {
    const text = await runLlama(ai, enhancedPrompt, SYSTEM_PROMPTS[type], 512);

    const durationMs = Date.now() - start;

    return new Response(
      JSON.stringify({
        text: text.trim(),
        type,
        duration_ms: durationMs,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Content generation failed",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// Handle CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
};
