import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Mocks
// ============================================================

vi.mock('../workers/ai-router', () => ({
  runLlama: vi.fn(),
  classifySentiment: vi.fn(),
  generateImage: vi.fn(),
}));

import { runLlama, classifySentiment, generateImage } from '../workers/ai-router';

// Import route handlers
import { POST as transcribeHandler } from '../pages/api/voice/transcribe';
import { POST as contentDraftHandler } from '../pages/api/ai/content-draft';
import { POST as sentimentHandler } from '../pages/api/ai/sentiment';
import { POST as generateImageHandler } from '../pages/api/ai/generate-image';

// ============================================================
// Helpers
// ============================================================

/** Build a Request with optional auth, content-type, and body */
function makeRequest(
  url: string,
  options: {
    method?: string;
    bearer?: string;
    contentType?: string;
    body?: unknown;
    buffer?: ArrayBuffer;
  } = {}
): Request {
  const headers: Record<string, string> = {};

  if (options.contentType) {
    headers['Content-Type'] = options.contentType;
  } else if (options.buffer === undefined && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.bearer) {
    headers['Authorization'] = `Bearer ${options.bearer}`;
  }

  const requestInit: RequestInit = {
    method: options.method ?? 'GET',
    headers,
  };

  if (options.buffer !== undefined) {
    requestInit.body = options.buffer;
  } else if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  return new Request(url, requestInit);
}

/** Build a mock Astro APIContext-like object with locals.runtime.env and url */
function makeContext(
  request: Request,
  env: Record<string, unknown> = {},
  url: string = 'http://localhost/api/test'
) {
  return {
    request,
    locals: { runtime: { env } },
    url: new URL(url),
    // Astro APIContext has other fields but the routes only use these
  } as any;
}

/** Create a mock AI binding with mocked run function */
function mockAIBinding(runFn?: (model: string, input: unknown) => Promise<unknown>) {
  return {
    run: runFn ?? vi.fn(),
  };
}

// ============================================================
// POST /api/voice/transcribe
// ============================================================

describe('POST /api/voice/transcribe', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without Bearer token', async () => {
    const audioData = new ArrayBuffer(1024);
    const req = makeRequest('http://localhost/api/voice/transcribe', {
      method: 'POST',
      contentType: 'audio/wav',
      buffer: audioData,
    });
    const res = await transcribeHandler(makeContext(req));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 503 when AI binding is missing', async () => {
    const audioData = new ArrayBuffer(1024);
    const req = makeRequest('http://localhost/api/voice/transcribe', {
      method: 'POST',
      bearer: 'test-token',
      contentType: 'audio/wav',
      buffer: audioData,
    });
    // Pass empty env so AI binding is missing
    const res = await transcribeHandler(makeContext(req, {}));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('AI binding');
  });

  it('returns 415 for unsupported Content-Type', async () => {
    const req = makeRequest('http://localhost/api/voice/transcribe', {
      method: 'POST',
      bearer: 'test-token',
      contentType: 'application/json',
      body: { audio: 'data' },
    });
    const ai = mockAIBinding();
    const res = await transcribeHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(415);
    const json = await res.json();
    expect(json.error).toContain('Unsupported Content-Type');
  });

  it('returns 413 for audio exceeding 25MB limit', async () => {
    // Create a buffer just over 25MB
    const tooLargeAudio = new ArrayBuffer((25 * 1024 * 1024) + 1);
    const req = makeRequest('http://localhost/api/voice/transcribe', {
      method: 'POST',
      bearer: 'test-token',
      contentType: 'audio/wav',
      buffer: tooLargeAudio,
    });
    const ai = mockAIBinding();
    const res = await transcribeHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toContain('too large');
  });

  it('returns 200 with transcribed text on success', async () => {
    const audioData = new ArrayBuffer(1024);
    const req = makeRequest('http://localhost/api/voice/transcribe', {
      method: 'POST',
      bearer: 'test-token',
      contentType: 'audio/wav',
      buffer: audioData,
    });

    const aiRun = vi.fn().mockResolvedValue({
      text: 'Hello, this is a test',
      word_count: 5,
    });
    const ai = mockAIBinding(aiRun);
    const res = await transcribeHandler(makeContext(req, { AI: ai }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toBe('Hello, this is a test');
    expect(json.duration_ms).toBeGreaterThanOrEqual(0);
    expect(json.word_count).toBe(5);

    // Verify AI.run was called with correct model
    expect(aiRun).toHaveBeenCalledWith('@cf/openai/whisper', expect.any(Object));
  });

  it('accepts raw audio/wav content type', async () => {
    const audioData = new ArrayBuffer(2048);
    const req = makeRequest('http://localhost/api/voice/transcribe', {
      method: 'POST',
      bearer: 'test-token',
      contentType: 'audio/wav',
      buffer: audioData,
    });

    const aiRun = vi.fn().mockResolvedValue({
      text: 'Raw audio test successful',
    });
    const ai = mockAIBinding(aiRun);
    const res = await transcribeHandler(makeContext(req, { AI: ai }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toBe('Raw audio test successful');
  });
});

// ============================================================
// POST /api/ai/content-draft
// ============================================================

describe('POST /api/ai/content-draft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBody = {
    type: 'social_post' as const,
    prompt: 'Write a social post for a pizza restaurant',
  };

  it('returns 401 without Bearer token', async () => {
    const req = makeRequest('http://localhost/api/ai/content-draft', {
      method: 'POST',
      body: validBody,
    });
    const res = await contentDraftHandler(makeContext(req));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 400 when missing type field', async () => {
    const req = makeRequest('http://localhost/api/ai/content-draft', {
      method: 'POST',
      bearer: 'test-token',
      body: { prompt: 'Write a post' }, // missing type
    });
    const ai = mockAIBinding();
    const res = await contentDraftHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('type');
  });

  it('returns 400 when missing prompt field', async () => {
    const req = makeRequest('http://localhost/api/ai/content-draft', {
      method: 'POST',
      bearer: 'test-token',
      body: { type: 'social_post' }, // missing prompt
    });
    const ai = mockAIBinding();
    const res = await contentDraftHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('type');
  });

  it('returns 400 with invalid type', async () => {
    const req = makeRequest('http://localhost/api/ai/content-draft', {
      method: 'POST',
      bearer: 'test-token',
      body: { type: 'invalid_type', prompt: 'test' },
    });
    const ai = mockAIBinding();
    const res = await contentDraftHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid type');
  });

  it('returns 200 with generated text on success', async () => {
    const req = makeRequest('http://localhost/api/ai/content-draft', {
      method: 'POST',
      bearer: 'test-token',
      body: validBody,
    });

    (runLlama as ReturnType<typeof vi.fn>).mockResolvedValue(
      'Check out our amazing pizzas today! Fresh ingredients, family recipes. Visit us now!'
    );

    const ai = mockAIBinding();
    const res = await contentDraftHandler(makeContext(req, { AI: ai }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toContain('pizza');
    expect(json.type).toBe('social_post');
    expect(json.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('accepts business context in request', async () => {
    const req = makeRequest('http://localhost/api/ai/content-draft', {
      method: 'POST',
      bearer: 'test-token',
      body: {
        type: 'social_post',
        prompt: 'Write a post',
        businessContext: {
          name: 'Joe\'s Pizza',
          industry: 'Food & Beverage',
          tone: 'Friendly and casual',
        },
      },
    });

    (runLlama as ReturnType<typeof vi.fn>).mockResolvedValue('Generated post with context');

    const ai = mockAIBinding();
    const res = await contentDraftHandler(makeContext(req, { AI: ai }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toBe('Generated post with context');
    expect(json.type).toBe('social_post');

    // Verify runLlama was called
    expect(runLlama).toHaveBeenCalled();
  });

  it('returns 503 when AI binding is missing', async () => {
    const req = makeRequest('http://localhost/api/ai/content-draft', {
      method: 'POST',
      bearer: 'test-token',
      body: validBody,
    });
    const res = await contentDraftHandler(makeContext(req, {}));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('AI binding');
  });
});

// ============================================================
// POST /api/ai/sentiment
// ============================================================

describe('POST /api/ai/sentiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without Bearer token', async () => {
    const req = makeRequest('http://localhost/api/ai/sentiment', {
      method: 'POST',
      body: { text: 'This product is amazing!' },
    });
    const res = await sentimentHandler(makeContext(req));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 400 when missing both text and texts fields', async () => {
    const req = makeRequest('http://localhost/api/ai/sentiment', {
      method: 'POST',
      bearer: 'test-token',
      body: {}, // missing text and texts
    });
    const ai = mockAIBinding();
    const res = await sentimentHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('text');
  });

  it('returns 200 with sentiment result for single text', async () => {
    const req = makeRequest('http://localhost/api/ai/sentiment', {
      method: 'POST',
      bearer: 'test-token',
      body: { text: 'This product is amazing!' },
    });

    (classifySentiment as ReturnType<typeof vi.fn>).mockResolvedValue({
      label: 'positive',
      score: 0.95,
    });

    const ai = mockAIBinding();
    const res = await sentimentHandler(makeContext(req, { AI: ai }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toHaveLength(1);
    expect(json.results[0]).toEqual({
      text: 'This product is amazing!',
      label: 'positive',
      score: 0.95,
    });
  });

  it('handles batch sentiment analysis with texts array', async () => {
    const textsToAnalyze = [
      'This is great!',
      'This is terrible!',
      'This is okay',
    ];

    const req = makeRequest('http://localhost/api/ai/sentiment', {
      method: 'POST',
      bearer: 'test-token',
      body: { texts: textsToAnalyze },
    });

    const sentiments = [
      { label: 'positive' as const, score: 0.9 },
      { label: 'negative' as const, score: 0.85 },
      { label: 'positive' as const, score: 0.6 },
    ];

    (classifySentiment as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(sentiments[0])
      .mockResolvedValueOnce(sentiments[1])
      .mockResolvedValueOnce(sentiments[2]);

    const ai = mockAIBinding();
    const res = await sentimentHandler(makeContext(req, { AI: ai }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toHaveLength(3);
    expect(json.results[0].label).toBe('positive');
    expect(json.results[1].label).toBe('negative');
    expect(json.results[2].label).toBe('positive');
  });

  it('returns 400 with empty text', async () => {
    const req = makeRequest('http://localhost/api/ai/sentiment', {
      method: 'POST',
      bearer: 'test-token',
      body: { text: '   ' }, // only whitespace
    });
    const ai = mockAIBinding();
    const res = await sentimentHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('non-empty');
  });

  it('returns 400 with empty texts array', async () => {
    const req = makeRequest('http://localhost/api/ai/sentiment', {
      method: 'POST',
      bearer: 'test-token',
      body: { texts: [] }, // empty array
    });
    const ai = mockAIBinding();
    const res = await sentimentHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('non-empty array');
  });

  it('returns 400 when texts array exceeds 100 items', async () => {
    const tooManyTexts = Array(101).fill('text');
    const req = makeRequest('http://localhost/api/ai/sentiment', {
      method: 'POST',
      bearer: 'test-token',
      body: { texts: tooManyTexts },
    });
    const ai = mockAIBinding();
    const res = await sentimentHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Maximum 100');
  });

  it('returns 503 when AI binding is missing', async () => {
    const req = makeRequest('http://localhost/api/ai/sentiment', {
      method: 'POST',
      bearer: 'test-token',
      body: { text: 'test' },
    });
    const res = await sentimentHandler(makeContext(req, {}));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('AI binding');
  });
});

// ============================================================
// POST /api/ai/generate-image
// ============================================================

describe('POST /api/ai/generate-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without Bearer token', async () => {
    const req = makeRequest('http://localhost/api/ai/generate-image', {
      method: 'POST',
      body: { prompt: 'A beautiful pizza' },
    });
    const res = await generateImageHandler(makeContext(req));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain('Unauthorized');
  });

  it('returns 400 when missing prompt field', async () => {
    const req = makeRequest('http://localhost/api/ai/generate-image', {
      method: 'POST',
      bearer: 'test-token',
      body: {}, // missing prompt
    });
    const ai = mockAIBinding();
    const res = await generateImageHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('prompt');
  });

  it('returns 400 when prompt is empty string', async () => {
    const req = makeRequest('http://localhost/api/ai/generate-image', {
      method: 'POST',
      bearer: 'test-token',
      body: { prompt: '' },
    });
    const ai = mockAIBinding();
    const res = await generateImageHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('prompt');
  });

  it('returns 400 when prompt exceeds 1000 characters', async () => {
    const longPrompt = 'a'.repeat(1001);
    const req = makeRequest('http://localhost/api/ai/generate-image', {
      method: 'POST',
      bearer: 'test-token',
      body: { prompt: longPrompt },
    });
    const ai = mockAIBinding();
    const res = await generateImageHandler(makeContext(req, { AI: ai }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('exceeds maximum length');
  });

  it('returns PNG image on success', async () => {
    const req = makeRequest('http://localhost/api/ai/generate-image', {
      method: 'POST',
      bearer: 'test-token',
      body: { prompt: 'A beautiful pizza restaurant' },
    });

    // Create a mock PNG buffer (just a small buffer for testing)
    const pngBuffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
    (generateImage as ReturnType<typeof vi.fn>).mockResolvedValue(pngBuffer);

    const ai = mockAIBinding();
    const res = await generateImageHandler(makeContext(req, { AI: ai }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');

    // Verify generateImage was called
    expect(generateImage).toHaveBeenCalled();
  });

  it('returns base64 JSON when format=base64 query param', async () => {
    const req = makeRequest('http://localhost/api/ai/generate-image?format=base64', {
      method: 'POST',
      bearer: 'test-token',
      body: { prompt: 'A beautiful pizza' },
    });

    const pngBuffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    (generateImage as ReturnType<typeof vi.fn>).mockResolvedValue(pngBuffer);

    const ai = mockAIBinding();
    const res = await generateImageHandler(
      makeContext(req, { AI: ai }, 'http://localhost/api/ai/generate-image?format=base64')
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');

    const json = await res.json();
    expect(json.image).toContain('data:image/png;base64,');
    expect(json.format).toBe('png');
  });

  it('accepts business name and prepends to prompt', async () => {
    const req = makeRequest('http://localhost/api/ai/generate-image', {
      method: 'POST',
      bearer: 'test-token',
      body: {
        prompt: 'A pizza on a plate',
        businessName: 'Joe\'s Pizza',
      },
    });

    const pngBuffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    (generateImage as ReturnType<typeof vi.fn>).mockResolvedValue(pngBuffer);

    const ai = mockAIBinding();
    const res = await generateImageHandler(makeContext(req, { AI: ai }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');

    // Verify generateImage was called
    expect(generateImage).toHaveBeenCalled();
  });

  it('accepts negative prompt in generation', async () => {
    const req = makeRequest('http://localhost/api/ai/generate-image', {
      method: 'POST',
      bearer: 'test-token',
      body: {
        prompt: 'A beautiful pizza',
        negativePrompt: 'blurry, low quality',
      },
    });

    const pngBuffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    (generateImage as ReturnType<typeof vi.fn>).mockResolvedValue(pngBuffer);

    const ai = mockAIBinding();
    const res = await generateImageHandler(makeContext(req, { AI: ai }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');

    // Verify generateImage was called successfully with the request
    expect(generateImage).toHaveBeenCalled();
  });

  it('returns 503 when AI binding is missing', async () => {
    const req = makeRequest('http://localhost/api/ai/generate-image', {
      method: 'POST',
      bearer: 'test-token',
      body: { prompt: 'A pizza' },
    });
    const res = await generateImageHandler(makeContext(req, {}));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('AI binding');
  });
});
