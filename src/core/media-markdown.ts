import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Nodes } from 'mdast';
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

/** Reuse the CommonMark parser so fences, escapes and inline code agree with rendering. */
export function visitMarkdown(markdown: string, visit: (node: Nodes) => void): void {
  const pending: Nodes[] = [fromMarkdown(markdown)];
  while (pending.length) {
    const node = pending.pop()!;
    visit(node);
    if ('children' in node) pending.push(...[...node.children].reverse());
  }
}

function isEscaped(markdown: string, index: number): boolean {
  let slashes = 0;
  while (index > 0 && markdown[--index] === '\\') slashes++;
  return slashes % 2 === 1;
}

function literalRanges(markdown: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  visitMarkdown(markdown, (node) => {
    if (['code', 'inlineCode', 'html', 'definition'].includes(node.type) && node.position) {
      ranges.push([node.position.start.offset!, node.position.end.offset!]);
    }
  });
  return ranges;
}

/** Upgrade legacy markers, preserving literal examples and escaped Markdown. */
export function normalizeLegacyMediaMarkdown(markdown: string): string {
  if (!markdown.includes('![media:')) return markdown;
  const literals = literalRanges(markdown);
  return markdown.replace(LEGACY_MEDIA_REGEX, (match, rawDescriptor, fallbackUrl, offset) => {
    if (isEscaped(markdown, offset) || literals.some(([start, end]) => offset >= start && offset < end)) return match;
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
  if (start < 0 || isEscaped(markdown, start)) return -1;
  let depth = 1;
  let index = start + 2;
  for (; index < markdown.length; index++) {
    if (isEscaped(markdown, index)) continue;
    if (markdown[index] === '[') depth++;
    if (markdown[index] === ']' && --depth === 0) break;
  }
  if (depth > 0) return start;
  const afterAlt = markdown.slice(index + 1);
  if (!afterAlt) return start;
  if (afterAlt[0] !== '(' && afterAlt[0] !== '[') return -1;
  const open = afterAlt[0], close = open === '(' ? ')' : ']';
  depth = 1;
  for (let i = 1; i < afterAlt.length; i++) {
    if (isEscaped(afterAlt, i)) continue;
    if (afterAlt[i] === open) depth++;
    if (afterAlt[i] === close && --depth === 0) return -1;
  }
  return start;
}

function rewriteMediaProse(markdown: string, isStreaming: boolean): string {
  if (!markdown.includes('![')) return markdown;
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const partialStart = isStreaming ? findTrailingIncompleteImage(markdown) : -1;
  let partialIsLiteral = false;
  visitMarkdown(markdown, (node) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;
    if (['code', 'inlineCode', 'html', 'definition'].includes(node.type) && partialStart >= start && partialStart < end) {
      partialIsLiteral = true;
    }
    if (node.type !== 'image') return;
    const descriptor = parseNeanderthalMediaSource(node.url);
    const query = node.alt?.trim();
    if (!descriptor || descriptor.isPartial || !query || query.toLowerCase() === 'visualizing…') return;
    const before = markdown.slice(0, start);
    const prefix = before.match(/\b(?:the|a|an|this|that|these|those|each|every|all|its|their|his|her|individual|modified|specialized|serial|single|disc-like)\s+$/i)?.[0];
    if ((prefix && !prefix.toLowerCase().includes(query.toLowerCase())) || /(^|[.!?]\s+)$/.test(before)) {
      // Alt text is decoded by the parser; escape it before inserting it into prose.
      const text = query.replace(/&/g, '&amp;').replace(/([\\`*_[\]<>])/g, '\\$1');
      edits.push({ start, end: start, text: `${text} ` });
    }

    // Eliminate ugly gaps between an inline capsule and trailing punctuation (e.g. `[capsule] .` -> `[capsule].`)
    const after = markdown.slice(end);
    const punctMatch = after.match(/^([ \t]+)([.,;:!?])/);
    if (punctMatch) {
      edits.push({ start: end, end: end + punctMatch[1].length, text: '' });
    }
  });
  if (partialStart >= 0 && !partialIsLiteral) {
    edits.push({ start: partialStart, end: markdown.length, text: createNeanderthalMediaMarkdown('Visualizing…', { partial: true }) });
  }
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    markdown = markdown.slice(0, edit.start) + edit.text + markdown.slice(edit.end);
  }
  return markdown;
}

/** Repair omitted nouns only on actual Markdown image nodes, never inside code. */
export function ensureTextAccompaniesPills(markdown: string): string {
  return rewriteMediaProse(markdown, false);
}

/** Unfinished prose images become non-resolving placeholders during a stream. */
export function prepareNeanderthalMarkdown(markdown: string, isStreaming = false): string {
  return rewriteMediaProse(normalizeLegacyMediaMarkdown(markdown), isStreaming);
}
