/**
 * POST /api/ai/generate-image
 *
 * Generates images using Stable Diffusion XL via Cloudflare Workers AI.
 *
 * Request body:
 *   - prompt: string (required, max 1000 chars)
 *   - negativePrompt?: string (optional)
 *   - businessName?: string (optional, prepended to prompt for context)
 *
 * Query parameters:
 *   - format: "base64" (optional, returns JSON with base64 encoded image)
 *
 * Response (default):
 *   - Raw PNG binary image with Content-Type: image/png
 *
 * Response (format=base64):
 *   - JSON: { image: "data:image/png;base64,...", format: "png" }
 *
 * Auth:
 *   - Requires "Authorization: Bearer <token>" header
 *   - CORS enabled for cross-origin requests
 */

import type { APIRoute } from "astro";
import { generateImage } from "../../../workers/ai-router";
import { getCorsHeaders, corsPreflightResponse } from "../../../lib/cors";

interface GenerateImageRequest {
  prompt: string;
  negativePrompt?: string;
  businessName?: string;
}

export const POST: APIRoute = async ({ request, locals, url }) => {
  // CORS headers
  const corsHeaders = getCorsHeaders(request);

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
  const ai = env["AI"] as { run: (model: string, input: Record<string, unknown>) => Promise<unknown> } | undefined;

  if (!ai) {
    return new Response(
      JSON.stringify({ error: "Workers AI binding not available" }),
      { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Parse request body
  let body: GenerateImageRequest;
  try {
    body = (await request.json()) as GenerateImageRequest;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Validate required prompt field
  if (!body.prompt || typeof body.prompt !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing or invalid 'prompt' field (must be a string)" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Validate prompt length
  if (body.prompt.length > 1000) {
    return new Response(
      JSON.stringify({ error: "Prompt exceeds maximum length of 1000 characters" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Build final prompt with business context if provided
  let finalPrompt = body.prompt;
  if (body.businessName && typeof body.businessName === "string") {
    finalPrompt = `${body.businessName}: ${body.prompt}`;
  }

  // Check for base64 format query param
  const format = url.searchParams.get("format");
  const returnBase64 = format === "base64";

  try {
    // Generate image
    const imageBytes = await generateImage(ai, finalPrompt, body.negativePrompt);

    if (returnBase64) {
      // Return as base64-encoded JSON
      const base64String = Buffer.from(imageBytes).toString("base64");
      return new Response(
        JSON.stringify({
          image: `data:image/png;base64,${base64String}`,
          format: "png",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      // Return raw PNG binary
      return new Response(imageBytes, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000", // Cache for 1 year (content-addressed)
          ...corsHeaders,
        },
      });
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Image generation failed",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// Handle CORS preflight
export const OPTIONS: APIRoute = async ({ request }) => {
  return corsPreflightResponse(request);
};
