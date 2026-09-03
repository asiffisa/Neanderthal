import { MarkdownToken } from './types';
import {
  normalizeLegacyMediaMarkdown,
  parseNeanderthalMediaSource,
} from './media-markdown';

/**
 * Streaming Tokenizer for Neanderthal Inline Media Markdown
 * 
 * Public pattern: `![Query](neanderthal:image)`.
 * Legacy `![media:Query|vendor]` tokens are normalized during migration.
 */
export function tokenizeStreamingMarkdown(text: string, isStreaming: boolean = false): MarkdownToken[] {
  if (!text) return [];

  const normalizedText = normalizeLegacyMediaMarkdown(text);

  const tokens: MarkdownToken[] = [];
  let currentIndex = 0;
  const queryCounts = new Map<string, number>();

  const MEDIA_REGEX = /!\[([^\]]+)\]\((neanderthal:[^)]+)\)/g;

  let match: RegExpExecArray | null;

  while ((match = MEDIA_REGEX.exec(normalizedText)) !== null) {
    const matchStart = match.index;
    const matchEnd = MEDIA_REGEX.lastIndex;

    // Push any preceding text
    if (matchStart > currentIndex) {
      tokens.push({
        type: 'text',
        content: normalizedText.slice(currentIndex, matchStart),
      });
    }

    const query = match[1].replace(/\\([\\\[\]])/g, '$1').trim();
    const descriptor = parseNeanderthalMediaSource(match[2]);
    if (!descriptor) continue;
    const normalized = query.toLowerCase();
    const occurrenceIndex = queryCounts.get(normalized) || 0;
    queryCounts.set(normalized, occurrenceIndex + 1);

    tokens.push({
      type: 'media',
      raw: match[0],
      query,
      mediaType: descriptor.mediaType,
      vendorPreference: descriptor.vendorPreference,
      occurrenceIndex,
      fallbackUrl: descriptor.fallbackUrl,
      id: `media-${matchStart}-${encodeURIComponent(query).slice(0, 20)}`,
      isPartial: descriptor.isPartial,
    });

    currentIndex = matchEnd;
  }

  // Handle remainder text
  if (currentIndex < normalizedText.length) {
    const remaining = normalizedText.slice(currentIndex);

    // If text ends with an incomplete token like `![media:something`
    const partialMatch = remaining.match(/!\[media:([^\]]*)$/);
    if (partialMatch) {
      const prefix = remaining.slice(0, partialMatch.index);
      if (prefix) {
        tokens.push({
          type: 'text',
          content: prefix,
        });
      }

      let partialQuery = partialMatch[1].trim();
      let partialVendorPreference: 'wikipedia' | 'duckduckgo' | 'auto' = 'auto';

      if (partialQuery.includes('|')) {
        const parts = partialQuery.split('|');
        partialQuery = parts[0].trim();
        const pref = parts[1]?.trim().toLowerCase();
        if (pref === 'duckduckgo' || pref === 'ddg' || pref === 'web') {
          partialVendorPreference = 'duckduckgo';
        } else if (pref === 'wiki' || pref === 'wikipedia') {
          partialVendorPreference = 'wikipedia';
        }
      }

      if (isStreaming) {
        // While streaming, render as an early resolving capsule so the bubble appears immediately
        tokens.push({
          type: 'media',
          raw: partialMatch[0],
          query: partialQuery || 'Visualizing...',
          mediaType: 'image',
          vendorPreference: partialVendorPreference,
          id: `media-streaming-${currentIndex}`,
          isPartial: true,
        });
      } else if (partialQuery) {
        // If stream ended but bracket was unclosed, auto-heal it into a resolved visual capsule
        tokens.push({
          type: 'media',
          raw: partialMatch[0],
          query: partialQuery,
          mediaType: 'image',
          vendorPreference: partialVendorPreference,
          id: `media-healed-${currentIndex}`,
          isPartial: false,
        });
      }
      // If stream ended and query is empty (bare "![media:"), drop it cleanly so raw syntax never leaks
    } else {
      tokens.push({
        type: 'text',
        content: remaining,
      });
    }
  }

  return tokens;
}
