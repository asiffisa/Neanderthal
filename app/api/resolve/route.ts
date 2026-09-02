import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function searchDuckDuckGo(
  query: string,
  excludeUrl?: string,
  occurrence: number = 0
): Promise<{ title: string; imageUrl: string; sourceUrl: string } | null> {
  const userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  try {
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const tokenRes = await fetch(tokenUrl, {
      headers: { 'User-Agent': userAgent },
      cache: 'no-store',
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
        'User-Agent': userAgent,
        Referer: 'https://duckduckgo.com/',
      },
      cache: 'no-store',
    });

    if (!imgRes.ok) return null;
    const imgData = await imgRes.json();
    const results = imgData.results || [];

    // Filter out duplicate or excluded images
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
  } catch (err) {
    console.error('[DuckDuckGo Search] Error:', err);
  }
  return null;
}

interface ServerCacheEntry {
  data: {
    query: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    fullImageUrl: string;
    sourceUrl: string;
    vendor: 'wikipedia' | 'duckduckgo';
    status: string;
  };
  timestamp: number;
}

const serverResolveCache = new Map<string, ServerCacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 500;

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
    const userAgent = 'NeanderthalApp/1.0 (https://github.com/asif/neanderthal; contact@neanderthal-demo.com)';

    let description = 'Public domain scientific knowledge reference.';
    let resolvedTitle = cleanQuery;
    let resolvedSourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanQuery)}`;
    let rawImageUrl: string | null = null;
    let resolvedVendor: 'wikipedia' | 'duckduckgo' = 'wikipedia';

    const isExcluded = (url: string | null | undefined): boolean => {
      if (!url) return true;
      if (excludeUrl && (url.includes(excludeUrl) || excludeUrl.includes(url))) return true;
      return false;
    };

    // VENDOR ROUTING: If AI chose DuckDuckGo (or web), prioritize DuckDuckGo live web search
    const wantsDuckDuckGo =
      requestedVendor === 'duckduckgo' ||
      requestedVendor === 'ddg' ||
      requestedVendor === 'web';

    if (wantsDuckDuckGo) {
      const ddgResult = await searchDuckDuckGo(cleanQuery, excludeUrl, occurrence);
      if (ddgResult) {
        rawImageUrl = ddgResult.imageUrl;
        resolvedTitle = ddgResult.title || cleanQuery;
        resolvedSourceUrl = ddgResult.sourceUrl;
        description = `Live web photography for "${cleanQuery}" via DuckDuckGo.`;
        resolvedVendor = 'duckduckgo';
      }
    }

    // LAYER 1: Query exact Wikipedia article for lead thumbnail AND content images (if not already resolved via DDG)
    if (!rawImageUrl) {
      const mediaWikiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts|images&exintro&explaintext&redirects=1&titles=${encodeURIComponent(
        cleanQuery
      )}&pithumbsize=600&imlimit=25&format=json&origin=*`;

      const res = await fetch(mediaWikiUrl, {
        headers: { 'User-Agent': userAgent },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages || {};
        const pageId = Object.keys(pages)[0];
        const page = pageId && pageId !== '-1' ? pages[pageId] : null;

        if (page) {
          resolvedTitle = page.title || cleanQuery;
          resolvedSourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle)}`;
          if (page.extract) {
            description = page.extract.slice(0, 220) + '...';
          }

          // 1A. Lead thumbnail (skip if excluded or if asking for alternative occurrence)
          if (page.thumbnail?.source && !isExcluded(page.thumbnail.source) && occurrence === 0) {
            rawImageUrl = page.thumbnail.source;
          } else {
            // 1B. Content images inside the article
            const rawImages = (page.images || []).map((i: { title: string }) => i.title);
            const contentImages = rawImages.filter((img: string) => {
              const lower = img.toLowerCase();
              return (
                !lower.includes('logo') &&
                !lower.includes('book') &&
                !lower.includes('symbol') &&
                !lower.includes('ambox') &&
                !lower.includes('.svg') &&
                !lower.includes('.pdf') &&
                !lower.includes('flag') &&
                !lower.includes('stub') &&
                !lower.includes('icon')
              );
            });

            const candidateSlice = contentImages.slice(occurrence, occurrence + 6);
            for (const imgName of candidateSlice) {
              const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&iiurlwidth=600&titles=${encodeURIComponent(
                imgName
              )}&format=json&origin=*`;
              const resInfo = await fetch(infoUrl, {
                headers: { 'User-Agent': userAgent },
                cache: 'no-store',
              });
              if (resInfo.ok) {
                const infoData = await resInfo.json();
                const infoPage = Object.values(infoData.query?.pages || {})[0] as any;
                const candidateUrl = infoPage?.imageinfo?.[0]?.thumburl || infoPage?.imageinfo?.[0]?.url;
                if (candidateUrl && !isExcluded(candidateUrl)) {
                  rawImageUrl = candidateUrl;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // LAYER 2: If no image found yet, search Wikimedia Commons
    if (!rawImageUrl) {
      const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        cleanQuery + ' -filetype:pdf -icon'
      )}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;

      const resCommons = await fetch(commonsUrl, {
        headers: { 'User-Agent': userAgent },
        cache: 'no-store',
      });

      if (resCommons.ok) {
        const commonsData = await resCommons.json();
        const cPages = Object.values(commonsData.query?.pages || {}) as any[];
        for (const cp of cPages) {
          const info = cp.imageinfo?.[0];
          const url = info?.thumburl || info?.url;
          const lower = (cp.title || '').toLowerCase();
          if (url && !lower.includes('.pdf') && !lower.includes('.svg') && !lower.includes('logo') && !isExcluded(url)) {
            rawImageUrl = url;
            break;
          }
        }
      }
    }

    // LAYER 3: If still no image, simplify multi-word query (e.g. "Supernova nucleosynthesis" -> "Supernova")
    if (!rawImageUrl) {
      const words = cleanQuery.split(/\s+/).filter((w) => w.length > 2);
      if (words.length > 1) {
        const simplified = words[0];
        const simpUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages|extracts&redirects=1&titles=${encodeURIComponent(
          simplified
        )}&pithumbsize=600&format=json&origin=*`;

        const resSimp = await fetch(simpUrl, {
          headers: { 'User-Agent': userAgent },
          cache: 'no-store',
        });

        if (resSimp.ok) {
          const simpData = await resSimp.json();
          const simpPage = Object.values(simpData.query?.pages || {})[0] as any;
          if (simpPage?.thumbnail?.source && !isExcluded(simpPage.thumbnail.source)) {
            rawImageUrl = simpPage.thumbnail.source;
            if (!description || description.includes('Public domain')) {
              description = simpPage.extract ? simpPage.extract.slice(0, 220) + '...' : description;
            }
          }
        }
      }
    }

    // LAYER 4: DuckDuckGo Live Web Image Search (Universal free fallback for modern topics, gadgets, culture)
    if (!rawImageUrl) {
      const ddgResult = await searchDuckDuckGo(cleanQuery, excludeUrl, occurrence);
      if (ddgResult) {
        rawImageUrl = ddgResult.imageUrl;
        resolvedTitle = ddgResult.title || cleanQuery;
        resolvedSourceUrl = ddgResult.sourceUrl;
        resolvedVendor = 'duckduckgo';
        if (!description || description.includes('Public domain')) {
          description = `Live visual result for "${cleanQuery}" via DuckDuckGo web search.`;
        }
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
