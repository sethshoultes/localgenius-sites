/**
 * POST /api/voice/transcribe
 *
 * Accepts audio (webm, wav, mp3, ogg) and returns text transcription
 * using Cloudflare Workers AI Whisper model.
 *
 * This is the backend for the hold-to-record mic button in the chat input.
 * Restaurant owners talk to their phone → audio → Whisper → text → AI chat.
 *
 * Request: multipart/form-data with "audio" file field
 *   OR: raw audio body with Content-Type: audio/*
 *
 * Response: { text: string, duration_ms: number }
 *
 * Rate limit: inherits from Cloudflare Workers AI quota (free tier: 10K req/day)
 */

import type { APIRoute } from "astro";
import { getCorsHeaders, corsPreflightResponse } from "../../../lib/cors";

interface WhisperResult {
  text: string;
  word_count?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export const POST: APIRoute = async ({ request, locals }) => {
  // CORS — scoped to allowed origins only (Jensen #5)
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
  const ai = env["AI"] as { run: (model: string, input: Record<string, unknown>) => Promise<WhisperResult> } | undefined;

  if (!ai) {
    return new Response(
      JSON.stringify({ error: "Workers AI binding not available" }),
      { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Extract audio data
  let audioData: ArrayBuffer;
  const contentType = request.headers.get("Content-Type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      // FormData upload (from browser)
      const formData = await request.formData();
      const audioFile = formData.get("audio");

      if (!audioFile || !(audioFile instanceof File)) {
        return new Response(
          JSON.stringify({ error: "Missing 'audio' file in form data" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      audioData = await audioFile.arrayBuffer();
    } else if (contentType.startsWith("audio/")) {
      // Raw audio body
      audioData = await request.arrayBuffer();
    } else {
      return new Response(
        JSON.stringify({
          error: "Unsupported Content-Type. Send multipart/form-data with 'audio' field, or raw audio/* body.",
        }),
        { status: 415, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to read audio data" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Validate audio size (max 25MB — Whisper limit)
  if (audioData.byteLength > 25 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: "Audio file too large. Maximum 25MB." }),
      { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  if (audioData.byteLength === 0) {
    return new Response(
      JSON.stringify({ error: "Empty audio data" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Run Whisper transcription
  const start = Date.now();

  try {
    const result = await ai.run("@cf/openai/whisper", {
      audio: [...new Uint8Array(audioData)],
    });

    const durationMs = Date.now() - start;

    return new Response(
      JSON.stringify({
        text: result.text?.trim() || "",
        duration_ms: durationMs,
        word_count: result.word_count,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Transcription failed",
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
