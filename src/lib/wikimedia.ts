import { ResolvedMedia } from '../core/types';
import { BoundedCache } from './bounded-cache';
import { canonicalImageUrl } from './media-url';
import { abortable, fetchWithLimits } from './request-limits';

const memoryCache = new BoundedCache<ResolvedMedia>(256, 1024 * 1024, 15 * 60 * 1000);
const inFlightRequests = new Map<string, {
  promise: Promise<ResolvedMedia>;
  controller: AbortController;
  consumers: number;
}>();

function imageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 4096) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function mediaFallback(query: string, fallbackUrl?: string): ResolvedMedia {
  const url = imageUrl(fallbackUrl);
  return { query, title: query, thumbnailUrl: url, fullImageUrl: url, status: url ? 'loaded' : 'not-found' };
}

/** Cached metadata is shared; a caller's fallback never enters that shared cache. */
export async function resolveMedia(
  query: string,
  fallbackUrl?: string,
  vendorPreference: 'wikipedia' | 'duckduckgo' | 'auto' = 'auto',
  excludeUrl?: string | string[],
  occurrence = 0,
  context?: string,
  signal?: AbortSignal,
): Promise<ResolvedMedia> {
  signal?.throwIfAborted();
  const excluded = (Array.isArray(excludeUrl) ? excludeUrl : excludeUrl ? [excludeUrl] : []).map(canonicalImageUrl).sort();
  const key = JSON.stringify([query.trim().toLowerCase(), vendorPreference, excluded, occurrence, (context || '').trim().toLowerCase()]);
  const cached = memoryCache.get(key);
  if (cached) return { ...cached, query };

  let pending = inFlightRequests.get(key);
  if (!pending) {
    if (inFlightRequests.size >= 32) return mediaFallback(query, fallbackUrl);
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query });
    if (context) params.set('context', context);
    if (vendorPreference !== 'auto') params.set('source', vendorPreference);
    if (occurrence > 0) params.set('occurrence', String(occurrence));
    for (const url of excluded) params.append('exclude', url);

    const promise = (async (): Promise<ResolvedMedia> => {
      try {
        const response = await fetchWithLimits(`/api/resolve?${params}`, { signal: controller.signal }, 16000, 128 * 1024);
        if (response.ok) {
          const data = await response.json();
          const thumbnailUrl = imageUrl(data?.thumbnailUrl);
          if (thumbnailUrl) {
            const media: ResolvedMedia = {
              query,
              title: typeof data.title === 'string' ? data.title.slice(0, 500) : query,
              description: typeof data.description === 'string' ? data.description.slice(0, 2000) : undefined,
              thumbnailUrl,
              fullImageUrl: imageUrl(data.fullImageUrl) || thumbnailUrl,
              sourceUrl: imageUrl(data.sourceUrl),
              width: typeof data.width === 'number' ? data.width : undefined,
              height: typeof data.height === 'number' ? data.height : undefined,
              vendor: data.vendor === 'duckduckgo' ? 'duckduckgo' : 'wikipedia',
              status: 'loaded',
            };
            controller.signal.throwIfAborted();
            memoryCache.set(key, media, JSON.stringify(media).length * 2);
            return media;
          }
        }
      } catch {
        // Per-caller fallback below; transient errors are not cached.
      }
      return mediaFallback(query);
    })();
    pending = { promise, controller, consumers: 0 };
    inFlightRequests.set(key, pending);
    const entry = pending;
    void promise.finally(() => {
      if (inFlightRequests.get(key) === entry) inFlightRequests.delete(key);
    });
  }

  pending.consumers++;
  try {
    const media = await (signal ? abortable(pending.promise, signal) : pending.promise);
    return media.thumbnailUrl ? { ...media, query } : mediaFallback(query, fallbackUrl);
  } finally {
    pending.consumers--;
    if (!pending.consumers && inFlightRequests.get(key) === pending) {
      inFlightRequests.delete(key);
      pending.controller.abort();
    }
  }
}

/** Claim images synchronously after each await so simultaneous capsules cannot collide. */
export async function resolveUniqueMedia(
  resolve: (excluded: string[], attempt: number) => Promise<ResolvedMedia>,
  claims: Map<string, string>,
  id: string,
  signal: AbortSignal,
): Promise<ResolvedMedia> {
  let media: ResolvedMedia = { query: '', title: '', status: 'not-found' };
  let excluded: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    signal.throwIfAborted();
    media = await resolve(excluded, attempt);
    signal.throwIfAborted();
    if (!media.thumbnailUrl) return media;
    const identity = canonicalImageUrl(media.thumbnailUrl);
    const taken = [...claims].filter(([owner]) => owner !== id).map(([, url]) => canonicalImageUrl(url));
    if (!taken.includes(identity)) {
      claims.set(id, identity);
      return media;
    }
    excluded = [...new Set([...excluded, ...taken, identity])].slice(-16);
  }
  return { ...media, thumbnailUrl: undefined, fullImageUrl: undefined, status: 'not-found' };
}
