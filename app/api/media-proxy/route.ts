import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CachedImage {
  buffer: Uint8Array;
  contentType: string;
  timestamp: number;
}

const proxyMemoryCache = new Map<string, CachedImage>();
const MAX_PROXY_CACHE = 300;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl || !imageUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Missing or invalid url parameter' }, { status: 400 });
  }

  // 1. Check in-memory image buffer cache (Instant 1ms response)
  const cached = proxyMemoryCache.get(imageUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return new Response(cached.buffer, {
      status: 200,
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Proxy-Cache': 'HIT',
      },
    });
  }

  try {
    const isWikimedia = imageUrl.includes('wikipedia.org') || imageUrl.includes('wikimedia.org');
    const headers: Record<string, string> = {
      'User-Agent': 'NeanderthalApp/1.0 (https://github.com/asif/neanderthal; contact@neanderthal-demo.com)',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    };
    if (isWikimedia) {
      headers['Referer'] = 'https://en.wikipedia.org/';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(imageUrl, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Cache image in memory (evict oldest if full)
    if (proxyMemoryCache.size >= MAX_PROXY_CACHE) {
      const oldestKey = proxyMemoryCache.keys().next().value;
      if (oldestKey) proxyMemoryCache.delete(oldestKey);
    }
    proxyMemoryCache.set(imageUrl, {
      buffer,
      contentType,
      timestamp: Date.now(),
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
        'X-Proxy-Cache': 'MISS',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
