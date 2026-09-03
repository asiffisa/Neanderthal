import { ResolvedMedia } from '../core/types';

// In-memory runtime cache across the active browser session
const memoryCache = new Map<string, ResolvedMedia>();
// In-flight request deduplication map to prevent redundant concurrent fetches
const inFlightRequests = new Map<string, Promise<ResolvedMedia>>();

/**
 * Resolve media metadata from in-memory cache or Next.js live resolution API.
 * Deduplicates in-flight requests so simultaneous tokens share one network fetch.
 */
export async function resolveMedia(
  query: string,
  fallbackUrl?: string,
  vendorPreference: 'wikipedia' | 'duckduckgo' | 'auto' = 'auto',
  excludeUrl?: string,
  occurrence: number = 0,
  context?: string
): Promise<ResolvedMedia> {
  const normalizedKey = `${query.trim().toLowerCase()}:${vendorPreference}:${excludeUrl || ''}:${occurrence}:${(context || '').trim().toLowerCase()}`;

  // 1. Check in-memory session cache
  if (memoryCache.has(normalizedKey)) {
    return memoryCache.get(normalizedKey)!;
  }

  // 2. Check if a request for this query is already in-flight
  if (inFlightRequests.has(normalizedKey)) {
    return inFlightRequests.get(normalizedKey)!;
  }

  // 3. Initiate fetch and store in-flight promise
  const fetchPromise = (async (): Promise<ResolvedMedia> => {
    try {
      const url = `/api/resolve?q=${encodeURIComponent(query)}${
        context ? `&context=${encodeURIComponent(context)}` : ''
      }${
        vendorPreference !== 'auto' ? `&source=${vendorPreference}` : ''
      }${excludeUrl ? `&exclude=${encodeURIComponent(excludeUrl)}` : ''}${
        occurrence > 0 ? `&occurrence=${occurrence}` : ''
      }`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.thumbnailUrl) {
          const resolved: ResolvedMedia = {
            query,
            title: data.title || query,
            description: data.description,
            thumbnailUrl: data.thumbnailUrl,
            fullImageUrl: data.fullImageUrl || data.thumbnailUrl,
            sourceUrl: data.sourceUrl,
            width: data.width,
            height: data.height,
            vendor: data.vendor || (data.sourceUrl?.includes('duckduckgo') ? 'duckduckgo' : 'wikipedia'),
            status: 'loaded',
          };
          memoryCache.set(normalizedKey, resolved);

          // Eagerly preload the image into the browser's cache so it renders instantly
          if (typeof window !== 'undefined' && resolved.thumbnailUrl) {
            const img = new Image();
            img.src = resolved.thumbnailUrl;
          }

          return resolved;
        }
      }
    } catch (err) {
      console.warn(`[Neanderthal] Failed to resolve media for query "${query}":`, err);
    } finally {
      inFlightRequests.delete(normalizedKey);
    }

    // 4. Fallback if not found or network fails
    const fallbackResult: ResolvedMedia = {
      query,
      title: query,
      thumbnailUrl: fallbackUrl,
      fullImageUrl: fallbackUrl,
      vendor: vendorPreference === 'duckduckgo' ? 'duckduckgo' : 'wikipedia',
      status: fallbackUrl ? 'loaded' : 'not-found',
    };

    // Only cache if it has a valid fallback URL; do not cache transient network failures forever
    if (fallbackUrl) {
      memoryCache.set(normalizedKey, fallbackResult);
    }

    return fallbackResult;
  })();

  inFlightRequests.set(normalizedKey, fetchPromise);
  return fetchPromise;
}
