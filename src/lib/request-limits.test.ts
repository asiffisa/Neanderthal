import { describe, expect, it } from 'vitest';
import { BoundedCache } from './bounded-cache';
import { readBoundedBody } from './request-limits';

describe('resource bounds', () => {
  it('stops a stalled body and cancels its source', async () => {
    let cancelled = false;
    const controller = new AbortController();
    const body = new ReadableStream({ cancel() { cancelled = true; } });
    const result = readBoundedBody(new Response(body), 1024, controller.signal);
    controller.abort(new Error('deadline'));
    await expect(result).rejects.toThrow('deadline');
    expect(cancelled).toBe(true);
  });

  it('enforces the byte limit on chunked responses without a length header', async () => {
    const body = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(11)); } });
    await expect(readBoundedBody(new Response(body), 10, new AbortController().signal)).rejects.toThrow('byte limit');
  });

  it('evicts by bytes and recency, handles replacement, and skips oversized values', () => {
    const cache = new BoundedCache<string>(2, 20, 1000);
    cache.set('a', 'a', 5); cache.set('b', 'b', 5);
    expect(cache.get('a')).toBe('a');
    cache.set('c', 'c', 5);
    expect(cache.get('b')).toBeUndefined();
    cache.set('a', 'larger', 12);
    expect(cache.get('c')).toBeUndefined();
    cache.set('huge', 'huge', 30);
    expect(cache.get('huge')).toBeUndefined();
    expect(cache.get('a')).toBe('larger');
  });

  it('never reuses an expired value', async () => {
    const cache = new BoundedCache<string>(2, 100, 0);
    cache.set('a', 'old', 3);
    expect(cache.get('a')).toBeUndefined();
  });
});
