import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const USER_AGENT =
  'NeanderthalApp/1.0 (https://github.com/asif/neanderthal; contact@neanderthal-demo.com)';

// Stop-words and descriptive adjectives to strip when simplifying complex phrases
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'very', 'really', 'specialized', 'traditional', 'natural', 'brilliant',
  'neighboring', 'specific', 'dense', 'thin', 'thick', 'microscopic', 'macroscopic',
  'active', 'actively', 'underlying', 'remarkable'
]);

function cleanExtractText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function simplifyQuery(query: string): string {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return words.slice(0, 3).join(' ');
}

async function searchDuckDuckGoFast(
  query: string,
  excludeUrl?: string,
  occurrence = 0
): Promise<{ title: string; imageUrl: string; sourceUrl: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800); // 1.8s timeout cap

  try {
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const tokenRes = await fetch(tokenUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });

    if (!tokenRes.ok) return null;
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=["']?([0-9-_]+)["']?/) || html.match(/vqd=([0-9-_]+)/);
    if (!vqdMatch) return null;

    const vqd = vqdMatch[1];
    const imgApiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(
      query
    )}&vqd=${vqd}&f=,,,&p=1`;

    const imgRes = await fetch(imgApiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://duckduckgo.com/',
      },
      signal: controller.signal,
    });

    if (!imgRes.ok) return null;
    const imgData = await imgRes.json();
    const results = imgData.results || [];

    const valid = results.filter((r: any) => {
      const u = r.thumbnail || r.image;
      if (!u) return false;
      if (excludeUrl && (u.includes(excludeUrl) || excludeUrl.includes(u))) return false;
      return true;
    });

    const chosen = valid[occurrence] || valid[0];
    if (chosen && (chosen.thumbnail || chosen.image)) {
      return {
        title: chosen.title || query,
        imageUrl: chosen.thumbnail || chosen.image,
        sourceUrl: chosen.url || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      };
    }
  } catch {
    // Timeout or network abort
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}

interface ServerCacheEntry {
  data: {
    query: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    fullImageUrl: string | null;
    sourceUrl: string;
    vendor: 'wikipedia' | 'duckduckgo';
    status: string;
  };
  timestamp: number;
}

const serverResolveCache = new Map<string, ServerCacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_SIZE = 1000;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const requestedVendor =
    searchParams.get('source')?.toLowerCase() ||
    searchParams.get('vendor')?.toLowerCase() ||
    'auto';
  const excludeUrl = searchParams.get('exclude')?.trim() || '';
  const occurrence = parseInt(searchParams.get('occurrence') || '0', 10);

  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 });
  }

  const cleanQuery = query.trim();
  const cacheKey = `${cleanQuery.toLowerCase()}:${requestedVendor}:${excludeUrl}:${occurrence}`;

  // 1. Instant Cache Hit
  const cached = serverResolveCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    let description = 'Public domain scientific knowledge reference.';
    let resolvedTitle = cleanQuery;
    // Default to Wikipedia search so users never hit an empty "article does not exist" page
    let resolvedSourceUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(
      cleanQuery
    )}&title=Special%3ASearch&fulltext=1`;
    let rawImageUrl: string | null = null;
    let resolvedVendor: 'wikipedia' | 'duckduckgo' = 'wikipedia';

    const isExcluded = (url: string | null | undefined): boolean => {
      if (!url) return true;
      if (excludeUrl && (url.includes(excludeUrl) || excludeUrl.includes(url))) return true;
      return false;
    };

    // If DuckDuckGo was explicitly requested, do DDG first
    const wantsDuckDuckGo =
      requestedVendor === 'duckduckgo' ||
      requestedVendor === 'ddg' ||
      requestedVendor === 'web';

    if (wantsDuckDuckGo) {
      const ddgResult = await searchDuckDuckGoFast(cleanQuery, excludeUrl, occurrence);
      if (ddgResult) {
        rawImageUrl = ddgResult.imageUrl;
        resolvedTitle = ddgResult.title || cleanQuery;
        resolvedSourceUrl = ddgResult.sourceUrl;
        description = `Live photography for "${cleanQuery}" via DuckDuckGo.`;
        resolvedVendor = 'duckduckgo';
      }
    }

    // LAYER 1 (FAST): Wikipedia Generator Search
    // Combines full-text semantic search, redirect resolution, extracts, and 600px thumbnail in 1 single HTTP request (~250ms)
    if (!rawImageUrl) {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cleanQuery
      )}&gsrlimit=4&prop=pageimages|extracts&pithumbsize=600&pilimit=4&exintro=1&explaintext=1&redirects=1&format=json&origin=*`;

      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (res.ok) {
        const data = await res.json();
        const pages = Object.values(data.query?.pages || {}) as any[];

        // Filter valid pages with thumbnails that are not excluded
        const validPages = pages.filter((p) => {
          const thumb = p.thumbnail?.source;
          return thumb && !isExcluded(thumb);
        });

        const targetPage = validPages[occurrence] || validPages[0];
        if (targetPage && targetPage.thumbnail?.source) {
          rawImageUrl = targetPage.thumbnail.source;
          resolvedTitle = targetPage.title || cleanQuery;
          resolvedSourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
            resolvedTitle.replace(/\s+/g, '_')
          )}`;
          if (targetPage.extract) {
            description = cleanExtractText(targetPage.extract).slice(0, 240) + '...';
          }
        }
      }
    }

    // LAYER 2 (FAST): Wikimedia Commons Direct Media Generator Search
    // If Wikipedia didn't have an article thumbnail, Commons has millions of scientific photos/diagrams
    if (!rawImageUrl) {
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cleanQuery + ' -filetype:pdf -icon'
      )}&gsrnamespace=6&gsrlimit=4&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;

      const resCommons = await fetch(commonsUrl, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (resCommons.ok) {
        const commonsData = await resCommons.json();
        const cPages = Object.values(commonsData.query?.pages || {}) as any[];
        for (const cp of cPages) {
          const info = cp.imageinfo?.[0];
          const url = info?.thumburl || info?.url;
          const lower = (cp.title || '').toLowerCase();
          if (
            url &&
            !lower.includes('.pdf') &&
            !lower.includes('.svg') &&
            !lower.includes('logo') &&
            !isExcluded(url)
          ) {
            rawImageUrl = url;
            resolvedTitle = (cp.title || cleanQuery).replace(/^File:/i, '');
            resolvedSourceUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(
              (cp.title || cleanQuery).replace(/\s+/g, '_')
            )}`;
            description = `Scientific media archive illustration for "${cleanQuery}".`;
            break;
          }
        }
      }
    }

    // LAYER 3 (FAST KEYWORD SIMPLIFICATION):
    // For long complex phrases ("specialized upper layer of the dermis" -> "dermis")
    if (!rawImageUrl) {
      const simplified = simplifyQuery(cleanQuery);
      if (simplified && simplified.toLowerCase() !== cleanQuery.toLowerCase()) {
        const simpUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          simplified
        )}&gsrlimit=3&prop=pageimages|extracts&pithumbsize=600&pilimit=3&exintro=1&explaintext=1&redirects=1&format=json&origin=*`;

        const resSimp = await fetch(simpUrl, {
          headers: { 'User-Agent': USER_AGENT },
        });

        if (resSimp.ok) {
          const simpData = await resSimp.json();
          const pages = Object.values(simpData.query?.pages || {}) as any[];
          const targetPage = pages.find((p) => p.thumbnail?.source && !isExcluded(p.thumbnail.source));
          if (targetPage && targetPage.thumbnail?.source) {
            rawImageUrl = targetPage.thumbnail.source;
            resolvedTitle = targetPage.title || cleanQuery;
            resolvedSourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
              resolvedTitle.replace(/\s+/g, '_')
            )}`;
            if (targetPage.extract) {
              description = cleanExtractText(targetPage.extract).slice(0, 240) + '...';
            }
          }
        }
      }
    }

    // LAYER 4 (FALLBACK WITH FAST 1.8S TIMEOUT): DuckDuckGo live search
    if (!rawImageUrl && !wantsDuckDuckGo) {
      const ddgResult = await searchDuckDuckGoFast(cleanQuery, excludeUrl, occurrence);
      if (ddgResult) {
        rawImageUrl = ddgResult.imageUrl;
        resolvedTitle = ddgResult.title || cleanQuery;
        resolvedSourceUrl = ddgResult.sourceUrl;
        resolvedVendor = 'duckduckgo';
        description = `Live visual result for "${cleanQuery}" via DuckDuckGo web search.`;
      }
    }

    if (rawImageUrl) {
      const thumbnailUrl = rawImageUrl.startsWith('http')
        ? `/api/media-proxy?url=${encodeURIComponent(rawImageUrl)}`
        : rawImageUrl;

      const payload = {
        query: cleanQuery,
        title: resolvedTitle,
        description,
        thumbnailUrl,
        fullImageUrl: thumbnailUrl,
        sourceUrl: resolvedSourceUrl,
        vendor: resolvedVendor,
        status: 'loaded',
      };

      // Store in memory cache with eviction
      if (serverResolveCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = serverResolveCache.keys().next().value;
        if (oldestKey) serverResolveCache.delete(oldestKey);
      }
      serverResolveCache.set(cacheKey, { data: payload, timestamp: Date.now() });

      return NextResponse.json(payload, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
          'X-Cache': 'MISS',
        },
      });
    }

    return NextResponse.json({
      query: cleanQuery,
      title: resolvedTitle,
      description,
      thumbnailUrl: null,
      fullImageUrl: null,
      sourceUrl: resolvedSourceUrl,
      status: 'not-found',
    });
  } catch (error) {
    return NextResponse.json({
      query: cleanQuery,
      status: 'not-found',
    });
  }
}
