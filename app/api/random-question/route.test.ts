import { NextRequest } from 'next/server';
import { afterEach, expect, it, vi } from 'vitest';
import { POST } from './route';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const request = (body: unknown) => new NextRequest('http://localhost/api/random-question', { method: 'POST', body: JSON.stringify(body) });

it.each([401, 403, 429, 500])('does not multiply provider calls after HTTP %i', async (status) => {
  const fetcher = vi.fn(async (_url: string, _options: RequestInit) => new Response('{}', { status }));
  vi.stubGlobal('fetch', fetcher);
  const response = await POST(request({ apiKey: 'fixture-only' }));
  expect((await response.json()).source).toBe('curated-bank');
  expect(fetcher).toHaveBeenCalledTimes(1);
  const options = fetcher.mock.calls[0][1];
  expect(JSON.parse(String(options.body)).generationConfig.maxOutputTokens).toBe(512);
  expect(options.signal).toBeInstanceOf(AbortSignal);
});

it('still tries the next model when the requested model is unavailable', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 404 })).mockResolvedValueOnce(Response.json({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Test subject', prompt: 'How does it work?' }) }] } }],
  }));
  vi.stubGlobal('fetch', fetcher);
  const response = await POST(request({ apiKey: 'fixture-only' }));
  expect((await response.json()).title).toBe('Test subject');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('keeps no-key shuffle available without a provider request', async () => {
  vi.stubEnv('GEMINI_API_KEY', '');
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect((await (await POST(request({}))).json()).source).toBe('curated-bank');
  expect(fetcher).not.toHaveBeenCalled();
});
