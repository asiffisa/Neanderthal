import { MediaType } from './types';

export const NEANDERTHAL_MEDIA_SCHEME = 'neanderthal:';

export type MediaVendorPreference = 'wikipedia' | 'duckduckgo' | 'auto';

export interface NeanderthalMediaDescriptor {
  mediaType: MediaType;
  vendorPreference: MediaVendorPreference;
  fallbackUrl?: string;
  isPartial: boolean;
}

export interface LegacyMediaDescriptor {
  query: string;
  vendorPreference: MediaVendorPreference;
}

interface CreateMediaSourceOptions {
  mediaType?: MediaType;
  vendorPreference?: MediaVendorPreference;
  fallbackUrl?: string;
  partial?: boolean;
}

const LEGACY_MEDIA_REGEX = /!\[media:([^\]]+)\](?:\(([^)]+)\))?/g;

function normalizeVendor(value?: string | null): MediaVendorPreference {
  const normalized = value?.trim().toLowerCase();

  if (normalized === 'wiki' || normalized === 'wikipedia') {
    return 'wikipedia';
  }

  if (normalized === 'web' || normalized === 'ddg' || normalized === 'duckduckgo') {
    return 'duckduckgo';
  }

  return 'auto';
}

function normalizeMediaType(value?: string | null): MediaType {
  if (value === 'video' || value === 'gif' || value === 'lottie') {
    return value;
  }

  return 'image';
}

/** Parse the alt text used by the original `![media:Query|vendor]` form. */
export function parseLegacyMediaAlt(
  alt?: string | null
): LegacyMediaDescriptor | null {
  if (!alt?.startsWith('media:')) {
    return null;
  }

  const [rawQuery, rawVendor] = alt.slice('media:'.length).split('|', 2);
  const query = rawQuery.trim();

  if (!query) {
    return null;
  }

  return {
    query,
    vendorPreference: normalizeVendor(rawVendor),
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Create the destination used by a standard Markdown image node. */
export function createNeanderthalMediaSource({
  mediaType = 'image',
  vendorPreference = 'auto',
  fallbackUrl,
  partial = false,
}: CreateMediaSourceOptions = {}): string {
  const params = new URLSearchParams();

  if (vendorPreference !== 'auto') {
    params.set('provider', vendorPreference);
  }

  if (fallbackUrl && isHttpUrl(fallbackUrl)) {
    params.set('fallback', fallbackUrl);
  }

  if (partial) {
    params.set('partial', 'true');
  }

  const query = params.toString();
  return `${NEANDERTHAL_MEDIA_SCHEME}${mediaType}${query ? `?${query}` : ''}`;
}

/** Parse a Neanderthal media destination without accepting unrelated URLs. */
export function parseNeanderthalMediaSource(
  source?: string | null
): NeanderthalMediaDescriptor | null {
  if (!source?.startsWith(NEANDERTHAL_MEDIA_SCHEME)) {
    return null;
  }

  const payload = source.slice(NEANDERTHAL_MEDIA_SCHEME.length);
  const [rawType, rawQuery = ''] = payload.split('?', 2);
  const params = new URLSearchParams(rawQuery);
  const fallbackCandidate = params.get('fallback');

  return {
    mediaType: normalizeMediaType(rawType),
    vendorPreference: normalizeVendor(params.get('provider')),
    fallbackUrl:
      fallbackCandidate && isHttpUrl(fallbackCandidate) ? fallbackCandidate : undefined,
    isPartial: params.get('partial') === 'true',
  };
}

/** Build the public Markdown form used by models and authors. */
export function createNeanderthalMediaMarkdown(
  query: string,
  options: CreateMediaSourceOptions = {}
): string {
  const escapedQuery = query.trim().replace(/([\\\[\]])/g, '\\$1');
  return `![${escapedQuery}](${createNeanderthalMediaSource(options)})`;
}

/** Keep old demo content working while the public syntax moves to CommonMark images. */
export function normalizeLegacyMediaMarkdown(markdown: string): string {
  return markdown.replace(LEGACY_MEDIA_REGEX, (match, rawDescriptor, fallbackUrl) => {
    const descriptor = parseLegacyMediaAlt(`media:${String(rawDescriptor)}`);
    if (!descriptor) return match;

    return createNeanderthalMediaMarkdown(descriptor.query, {
      vendorPreference: descriptor.vendorPreference,
      fallbackUrl: typeof fallbackUrl === 'string' ? fallbackUrl.trim() : undefined,
    });
  });
}

function findTrailingIncompleteImage(markdown: string): number {
  const start = markdown.lastIndexOf('![');
  if (start < 0) return -1;

  const tail = markdown.slice(start);
  const altEnd = tail.indexOf(']');

  if (altEnd < 0) return start;

  const afterAlt = tail.slice(altEnd + 1);
  if (!afterAlt) return start;

  if (afterAlt.startsWith('(') && !afterAlt.includes(')')) {
    return start;
  }

  if (afterAlt.startsWith('[') && !afterAlt.includes(']')) {
    return start;
  }

  return -1;
}

/**
 * Hide an unfinished image marker during streaming.
 * Legacy tokens are upgraded later in the Markdown tree so code remains literal.
 * The temporary capsule never starts a network request.
 */
export function prepareNeanderthalMarkdown(
  markdown: string,
  isStreaming: boolean = false
): string {
  if (!isStreaming) return markdown;

  const partialStart = findTrailingIncompleteImage(markdown);
  if (partialStart < 0) return markdown;

  return `${markdown.slice(0, partialStart)}${createNeanderthalMediaMarkdown('Visualizing…', {
    partial: true,
  })}`;
}
