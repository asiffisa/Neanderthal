import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalImageUrl } from './media-url';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

const media = (url: string) => ({ query: 'Specimen', title: 'Specimen', thumbnailUrl: url, status: 'loaded' as const });

describe('resolver client and image claims', () => {
  it('deduplicates metadata requests without sharing caller fallback images', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetcher);
    const { resolveMedia } = await import('./wikimedia');
    const [a, b] = await Promise.all([
      resolveMedia('same subject', 'https://example.com/a.png'),
      resolveMedia('same subject', 'https://example.com/b.png'),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a.thumbnailUrl).toBe('https://example.com/a.png');
    expect(b.thumbnailUrl).toBe('https://example.com/b.png');
    await resolveMedia('same subject');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps a shared request alive for another consumer, then aborts when none remain', async () => {
    let upstreamSignal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url, options) => {
      upstreamSignal = options.signal;
      return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
    }));
    const { resolveMedia } = await import('./wikimedia');
    const first = new AbortController(), second = new AbortController();
    const a = resolveMedia('shared', undefined, 'auto', undefined, 0, undefined, first.signal);
    const b = resolveMedia('shared', undefined, 'auto', undefined, 0, undefined, second.signal);
    first.abort();
    await expect(a).rejects.toMatchObject({ name: 'AbortError' });
    expect(upstreamSignal?.aborted).toBe(false);
    second.abort();
    await expect(b).rejects.toMatchObject({ name: 'AbortError' });
    expect(upstreamSignal?.aborted).toBe(true);
  });

  it('canonicalizes proxy URLs, tracking, and Wikimedia thumbnail sizes', () => {
    const raw = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Image.svg';
    const thumb = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Image.svg/600px-Image.svg.png?utm_source=wiki';
    expect(canonicalImageUrl(`/api/media-proxy?url=${encodeURIComponent(thumb)}`)).toBe(raw);
  });

  it('reserves distinct alternatives for simultaneously resolving capsules', async () => {
    const { resolveUniqueMedia } = await import('./wikimedia');
    const claims = new Map<string, string>();
    const fetcher = vi.fn(async (excluded: string[]) => media(excluded.length ? 'https://example.com/b.png' : 'https://example.com/a.png'));
    const [a, b] = await Promise.all([
      resolveUniqueMedia(fetcher, claims, 'first', new AbortController().signal),
      resolveUniqueMedia(fetcher, claims, 'second', new AbortController().signal),
    ]);
    expect(a.thumbnailUrl).not.toBe(b.thumbnailUrl);
    expect(new Set(claims.values()).size).toBe(2);
  });

  it('keeps a no-image capsule when every alternative is already claimed', async () => {
    const { resolveUniqueMedia } = await import('./wikimedia');
    const claims = new Map([['other', 'https://example.com/a.png']]);
    const fetcher = vi.fn(async () => media('https://example.com/a.png'));
    const result = await resolveUniqueMedia(fetcher, claims, 'new', new AbortController().signal);
    expect(result.status).toBe('not-found');
    expect(result.thumbnailUrl).toBeUndefined();
    expect(claims.has('new')).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('cannot add stale claims after a document is unmounted', async () => {
    const { resolveUniqueMedia } = await import('./wikimedia');
    const controller = new AbortController();
    const claims = new Map<string, string>();
    const result = resolveUniqueMedia(async () => {
      controller.abort();
      return media('https://example.com/old.png');
    }, claims, 'old-document', controller.signal);
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(claims.size).toBe(0);
  });
});
