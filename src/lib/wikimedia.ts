import { ResolvedMedia } from '../core/types';

// In-memory runtime cache across the active browser session
const memoryCache = new Map<string, ResolvedMedia>();

/**
 * Resolve media metadata from in-memory cache or Next.js live resolution API.
 */
export async function resolveMedia(query: string, fallbackUrl?: string): Promise<ResolvedMedia> {
  const normalizedKey = query.trim().toLowerCase();

  // 1. Check in-memory session cache
  if (memoryCache.has(normalizedKey)) {
    return memoryCache.get(normalizedKey)!;
  }

  // 2. Query live 4-tier resolver route
  try {
    const res = await fetch(`/api/resolve?q=${encodeURIComponent(query)}`);
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
          status: 'loaded',
        };
        memoryCache.set(normalizedKey, resolved);
        return resolved;
      }
    }
  } catch (err) {
    console.warn(`[Neanderthal] Failed to resolve media for query "${query}":`, err);
  }

  // 3. Fallback if not found or network fails
  const fallbackResult: ResolvedMedia = {
    query,
    title: query,
    thumbnailUrl: fallbackUrl,
    fullImageUrl: fallbackUrl,
    status: fallbackUrl ? 'loaded' : 'not-found',
  };
  memoryCache.set(normalizedKey, fallbackResult);
  return fallbackResult;
}
