import { NextRequest } from 'next/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { POST } from './route';

beforeEach(() => { vi.stubEnv('GEMINI_API_KEY', 'fixture-only'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function request(body: unknown, signal?: AbortSignal) {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal,
  });
}

it.each([null, { prompt: '   ' }, { prompt: 'hi', model: '../escape' }, { prompt: 'x'.repeat(10001) }])
('rejects invalid input without calling Gemini', async (body) => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect((await POST(request(body))).status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});

it('bounds incoming JSON bytes before parsing', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect((await POST(request({ prompt: 'x'.repeat(33000) }))).status).toBe(413);
  expect(fetcher).not.toHaveBeenCalled();
});

it('preserves fragmented UTF-8 SSE text and keeps API keys out of the URL', async () => {
  const text = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: '🦴 Hello' }] } }] })}\n\n`;
  const bytes = new TextEncoder().encode(text);
  const fetcher = vi.fn(async (_url: string, _options: RequestInit) => new Response(new ReadableStream({ start(c) {
    for (const byte of bytes) c.enqueue(new Uint8Array([byte]));
    c.close();
  } })));
  vi.stubGlobal('fetch', fetcher);
  const response = await POST(request({ prompt: 'test' }));
  expect(await response.text()).toBe('🦴 Hello');
  expect(fetcher.mock.calls[0][0]).not.toContain('fixture-only');
  expect(new Headers(fetcher.mock.calls[0][1].headers).get('x-goog-api-key')).toBe('fixture-only');
  expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});

it('stops a stalled upstream body after headers arrive', async () => {
  const deadline = new AbortController();
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(deadline.signal);
  let cancelled = false;
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }))));
  const response = await POST(request({ prompt: 'test' }));
  const body = response.text();
  deadline.abort(new Error('deadline'));
  await expect(body).rejects.toThrow('deadline');
  expect(cancelled).toBe(true);
});

it('does not retry an authentication failure', async () => {
  const fetcher = vi.fn(async () => Response.json({ error: { message: 'Invalid API key' } }, { status: 401 }));
  vi.stubGlobal('fetch', fetcher);
  expect((await POST(request({ prompt: 'test' }))).status).toBe(401);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
