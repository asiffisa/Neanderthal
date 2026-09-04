import { NextRequest, NextResponse } from 'next/server';
import { BoundedCache } from '../../../src/lib/bounded-cache';
import { parseImageProxyUrl } from '../../../src/lib/media-url';
import { fetchProxyImage } from '../../../src/lib/proxy-image';
import { RequestError } from '../../../src/lib/request-limits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const cache = new BoundedCache<Awaited<ReturnType<typeof fetchProxyImage>>>(128, 32 * 1024 * 1024, 60 * 60 * 1000);
let activeRequests = 0;

export async function GET(request: NextRequest) {
  const url = parseImageProxyUrl(request.nextUrl.searchParams.get('url'));
  if (!url) return NextResponse.json({ error: 'Image URL is not allowed' }, { status: 400 });

  const headers = {
    'Cache-Control': 'public, max-age=86400',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Referrer-Policy': 'no-referrer',
  };
  const cached = cache.get(url.href);
  if (cached) {
    return new Response(cached.buffer, { headers: { ...headers, 'Content-Type': cached.contentType, 'X-Proxy-Cache': 'HIT' } });
  }
  // Bound transient buffers too, not only retained cache entries.
  if (activeRequests >= 8) {
    return NextResponse.json({ error: 'Image proxy is busy' }, { status: 503, headers: { 'Retry-After': '1' } });
  }
  activeRequests++;
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);
  try {
    const image = await fetchProxyImage(url.href, signal);
    cache.set(url.href, image, image.buffer.byteLength);
    return new Response(image.buffer, { headers: { ...headers, 'Content-Type': image.contentType, 'X-Proxy-Cache': 'MISS' } });
  } catch (error) {
    const status = signal.aborted ? (request.signal.aborted ? 499 : 504) : error instanceof RequestError ? error.status : 502;
    return NextResponse.json({ error: status === 504 ? 'Image request timed out' : 'Image unavailable' }, { status, headers: { 'Cache-Control': 'no-store' } });
  } finally {
    activeRequests--;
  }
}
