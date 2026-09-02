import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl || !imageUrl.startsWith('http')) {
    return NextResponse.json({ error: 'Missing or invalid url parameter' }, { status: 400 });
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

    const res = await fetch(imageUrl, { headers });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err: unknown) {
    console.error('[MediaProxy] Failed to fetch image:', err);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
