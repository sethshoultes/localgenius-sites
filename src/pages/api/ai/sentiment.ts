/**
 * POST /api/ai/sentiment
 *
 * Classify the sentiment of text(s) using DistilBERT.
 *
 * Request (single):
 *   { text: string }
 *
 * Request (batch):
 *   { texts: string[] }
 *
 * Response:
 *   {
 *     results: [
 *       { text: string, label: "positive" | "negative", score: number },
 *       ...
 *     ]
 *   }
 *
 * Uses DistilBERT via Cloudflare Workers AI for fast, accurate sentiment classification.
 * Rate limit: inherits from Cloudflare Workers AI quota (free tier: 10K req/day)
 */

import type { APIRoute } from "astro";
import { classifySentiment } from "../../../workers/ai-router";

interface SentimentRequest {
  text?: string;
  texts?: string[];
}

interface SentimentResult {
  text: string;
  label: "positive" | "negative";
  score: number;
}

interface AIBinding {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
}

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
  let body: SentimentRequest;
  try {
    body = (await request.json()) as SentimentRequest;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Normalize input: single text or array of texts
  const { text, texts } = body;
  let textsToAnalyze: string[] = [];

  if (text) {
    if (typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "text must be a non-empty string" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    textsToAnalyze = [text];
  } else if (texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: "texts must be a non-empty array of strings" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (texts.some((t) => typeof t !== "string" || t.trim().length === 0)) {
      return new Response(
        JSON.stringify({ error: "All texts must be non-empty strings" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    textsToAnalyze = texts;
  } else {
    return new Response(
      JSON.stringify({ error: "Must provide either 'text' or 'texts' field" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Limit batch size to prevent resource exhaustion
  if (textsToAnalyze.length > 100) {
    return new Response(
      JSON.stringify({ error: "Maximum 100 texts per request" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Classify sentiments
  const start = Date.now();
  try {
    const results: SentimentResult[] = [];

    for (const textToAnalyze of textsToAnalyze) {
      const sentiment = await classifySentiment(ai, textToAnalyze);
      results.push({
        text: textToAnalyze,
        label: sentiment.label,
        score: sentiment.score,
      });
    }

    const durationMs = Date.now() - start;

    return new Response(
      JSON.stringify({
        results,
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
        error: "Sentiment classification failed",
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
