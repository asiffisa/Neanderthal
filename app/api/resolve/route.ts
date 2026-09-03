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

function cleanSearchQuery(query: string): string {
  return query
    .replace(/\b(portrait|photograph|photo|picture|image|illustration|diagram|stills|wallpaper)\b/gi, '')
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

function isRelevantWikipediaPage(pageTitle: string, query: string, context?: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => !STOP_WORDS.has(w) && w.length > 2);

  const titleTokens = normalize(pageTitle);
  const queryTokens = normalize(query);
  const contextTokens = context ? normalize(context) : [];

  // Direct containment: if title contains query or query contains title
  const lowerTitle = pageTitle.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (lowerTitle.includes(lowerQuery) || lowerQuery.includes(lowerTitle)) {
    return true;
  }

  // Token overlap check with query
  const hasQueryTokenMatch = queryTokens.some(q => titleTokens.includes(q) || lowerTitle.includes(q));
  if (hasQueryTokenMatch) return true;

  // Token overlap check with context (if context is a concise entity)
  if (contextTokens.length > 0 && contextTokens.length <= 3) {
    const hasContextMatch = contextTokens.some(c => titleTokens.includes(c) || lowerTitle.includes(c));
    if (hasContextMatch) return true;
  }

  return false;
}

async function searchDuckDuckGoFast(
  query: string,
  excludeUrl?: string,
  occurrence = 0
): Promise<{ title: string; imageUrl: string; sourceUrl: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout cap

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

async function searchWikipedia(
  searchTerm: string,
  occurrence: number,
  isExcluded: (url: string | null | undefined) => boolean,
  context?: string
): Promise<{ title: string; imageUrl: string; sourceUrl: string; extract?: string } | null> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    searchTerm
  )}&gsrlimit=6&prop=pageimages|extracts&pithumbsize=600&pilimit=6&exintro=1&explaintext=1&redirects=1&format=json&origin=*`;

  try {
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {}) as any[];

    // 1. Filter out pages without thumbnails or matching excludeUrl
    const validPages = pages.filter((p) => {
      const thumb = p.thumbnail?.source;
      return thumb && !isExcluded(thumb);
    });

    if (validPages.length === 0) return null;

    // 2. Filter strictly for relevant pages that actually match the query or context
    const relevantPages = validPages.filter((p) =>
      isRelevantWikipediaPage(p.title || '', searchTerm, context)
    );

    // If none of the returned pages match the query (e.g. Wikipedia returned Ben Kingsley for Mohanlal), reject!
    if (relevantPages.length === 0) {
      return null;
    }

    const targetPage = relevantPages[occurrence] || relevantPages[0];
    if (targetPage && targetPage.thumbnail?.source) {
      const title = targetPage.title || searchTerm;
      return {
        title,
        imageUrl: targetPage.thumbnail.source,
        sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`,
        extract: targetPage.extract,
      };
    }
  } catch {
    // Network error
  }
  return null;
}

async function searchCommons(
  searchTerm: string,
  isExcluded: (url: string | null | undefined) => boolean
): Promise<{ title: string; imageUrl: string; sourceUrl: string } | null> {
  const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    searchTerm + ' -filetype:pdf -icon'
  )}&gsrnamespace=6&gsrlimit=4&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;

  try {
    const res = await fetch(commonsUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!res.ok) return null;
    const commonsData = await res.json();
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
        const title = (cp.title || searchTerm).replace(/^File:/i, '');
        return {
          title,
          imageUrl: url,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent((cp.title || searchTerm).replace(/\s+/g, '_'))}`,
        };
      }
    }
  } catch {
    // Network error
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
  const context = searchParams.get('context')?.trim() || '';
  const requestedVendor =
    searchParams.get('source')?.toLowerCase() ||
    searchParams.get('vendor')?.toLowerCase() ||
    'auto';
  const excludeUrl = searchParams.get('exclude')?.trim() || '';
  const occurrence = Math.max(0, parseInt(searchParams.get('occurrence') || '0', 10) || 0);

  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 });
  }

  const cleanQuery = query.trim();
  const cacheKey = `${cleanQuery.toLowerCase()}:${context.toLowerCase()}:${requestedVendor}:${excludeUrl}:${occurrence}`;

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
    let description = 'Public domain knowledge reference.';
    let resolvedTitle = cleanQuery;
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

    // Clean filler words like "portrait photograph", "photo of", etc.
    const sanitizedQuery = cleanSearchQuery(cleanQuery) || cleanQuery;

    // Detect if this subject or overall topic is related to cinema, people, entertainment, or pop culture
    const combinedContext = `${sanitizedQuery} ${context}`.toLowerCase();
    const isCultureOrEntertainment =
      /\b(actor|actress|film|movie|cinema|director|singer|album|song|celebrity|wedding|stills|starring|tamil|telugu|malayalam|bollywood|hollywood|series|tv|show|character|husband|wife|marriage|sons|daughter|family)\b/i.test(
        combinedContext
      );

    // Context is ONLY valid if it is a concise entity (<= 3 words, no questions, not a paragraph)
    const isContextValid =
      context && !context.includes('?') && context.split(/\s+/).length <= 3;
    const hasContextInQuery =
      isContextValid && sanitizedQuery.toLowerCase().includes(context.toLowerCase());
    const wordsInQuery = sanitizedQuery.split(/\s+/).length;

    // Only enrich if context is a concise entity AND query is short (e.g. Maya -> Maya Nayanthara)
    const enrichedQuery =
      isContextValid && !hasContextInQuery && (wordsInQuery <= 2 || isCultureOrEntertainment)
        ? `${sanitizedQuery} ${context}`.trim()
        : sanitizedQuery;

    // Determine vendor priority:
    // 1. If explicitly requested as DuckDuckGo -> DDG first
    // 2. If explicitly requested as Wikipedia -> Wikipedia first
    // 3. If 'auto':
    //    - If cinema/entertainment/people -> DuckDuckGo first! (Wikipedia excludes copyrighted stills/press photos)
    //    - Else -> Balanced spread: alternate 50/50 (odd occurrence -> DDG, even occurrence -> Wikipedia)
    const wantsDuckDuckGo =
      requestedVendor === 'duckduckgo' ||
      requestedVendor === 'ddg' ||
      requestedVendor === 'web';
    const wantsWikipedia =
      requestedVendor === 'wikipedia' ||
      requestedVendor === 'wiki';

    const preferDDGFirst =
      wantsDuckDuckGo ||
      (!wantsWikipedia && (isCultureOrEntertainment || occurrence % 2 === 1));

    // ROUTE A: Try DuckDuckGo First
    if (preferDDGFirst) {
      // Try with context-enriched query first, then base query
      let ddgResult = await searchDuckDuckGoFast(enrichedQuery, excludeUrl, occurrence);
      if (!ddgResult && enrichedQuery !== sanitizedQuery) {
        ddgResult = await searchDuckDuckGoFast(sanitizedQuery, excludeUrl, occurrence);
      }

      if (ddgResult) {
        rawImageUrl = ddgResult.imageUrl;
        resolvedTitle = ddgResult.title || cleanQuery;
        resolvedSourceUrl = ddgResult.sourceUrl;
        resolvedVendor = 'duckduckgo';
        description = `Live photography for "${cleanQuery}" via DuckDuckGo.`;
      }
    }

    // ROUTE B: Try Wikipedia First (or Fallback if DDG was empty)
    if (!rawImageUrl) {
      // 1. Try context-enriched Wikipedia search first
      let wikiResult = await searchWikipedia(
        enrichedQuery,
        occurrence,
        isExcluded,
        isContextValid ? context : undefined
      );
      // 2. If enriched search had no relevant thumbnail, try sanitized query
      if (!wikiResult && enrichedQuery !== sanitizedQuery) {
        wikiResult = await searchWikipedia(
          sanitizedQuery,
          occurrence,
          isExcluded,
          isContextValid ? context : undefined
        );
      }

      if (wikiResult) {
        rawImageUrl = wikiResult.imageUrl;
        resolvedTitle = wikiResult.title;
        resolvedSourceUrl = wikiResult.sourceUrl;
        resolvedVendor = 'wikipedia';
        if (wikiResult.extract) {
          description = cleanExtractText(wikiResult.extract).slice(0, 240) + '...';
        }
      }
    }

    // ROUTE C: Wikimedia Commons (For scientific/diagrammatic subjects)
    if (!rawImageUrl) {
      let commonsResult = await searchCommons(enrichedQuery, isExcluded);
      if (!commonsResult && enrichedQuery !== sanitizedQuery) {
        commonsResult = await searchCommons(sanitizedQuery, isExcluded);
      }

      if (commonsResult) {
        rawImageUrl = commonsResult.imageUrl;
        resolvedTitle = commonsResult.title;
        resolvedSourceUrl = commonsResult.sourceUrl;
        resolvedVendor = 'wikipedia';
        description = `Scientific media archive illustration for "${cleanQuery}".`;
      }
    }

    // ROUTE D: Simplified Query (for long descriptive phrases)
    if (!rawImageUrl) {
      const simplified = simplifyQuery(sanitizedQuery);
      if (simplified && simplified.toLowerCase() !== sanitizedQuery.toLowerCase()) {
        const simpResult = await searchWikipedia(simplified, 0, isExcluded);
        if (simpResult) {
          rawImageUrl = simpResult.imageUrl;
          resolvedTitle = simpResult.title;
          resolvedSourceUrl = simpResult.sourceUrl;
          resolvedVendor = 'wikipedia';
          if (simpResult.extract) {
            description = cleanExtractText(simpResult.extract).slice(0, 240) + '...';
          }
        }
      }
    }

    // ROUTE E: DuckDuckGo Final Fallback (if Wikipedia route was attempted first and found nothing)
    if (!rawImageUrl && !preferDDGFirst) {
      let ddgResult = await searchDuckDuckGoFast(enrichedQuery, excludeUrl, occurrence);
      if (!ddgResult && enrichedQuery !== sanitizedQuery) {
        ddgResult = await searchDuckDuckGoFast(sanitizedQuery, excludeUrl, occurrence);
      }

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
