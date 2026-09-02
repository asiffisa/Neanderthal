import { MarkdownToken } from './types';

/**
 * Streaming Tokenizer for Neanderthal Inline Media Markdown
 * 
 * Pattern: `![media:Query]` or `![media:Query|type](fallbackUrl)`
 * Gracefully extracts tokens from partial or complete streaming text.
 */
export function tokenizeStreamingMarkdown(text: string, isStreaming: boolean = false): MarkdownToken[] {
  if (!text) return [];

  const tokens: MarkdownToken[] = [];
  let currentIndex = 0;

  // Regular expression to match complete media tokens:
  // Group 1: query and optional type (e.g. "Neanderthal skull" or "Neanderthal skull|image")
  // Group 2: optional fallback URL inside ()
  const MEDIA_REGEX = /!\[media:([^\]]+)\](?:\(([^)]+)\))?/g;

  let match: RegExpExecArray | null;

  while ((match = MEDIA_REGEX.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = MEDIA_REGEX.lastIndex;

    // Push any preceding text
    if (matchStart > currentIndex) {
      tokens.push({
        type: 'text',
        content: text.slice(currentIndex, matchStart),
      });
    }

    let query = match[1].trim();
    let vendorPreference: 'wikipedia' | 'duckduckgo' | 'auto' = 'auto';

    if (query.includes('|')) {
      const parts = query.split('|');
      query = parts[0].trim();
      const pref = parts[1]?.trim().toLowerCase();
      if (pref === 'duckduckgo' || pref === 'ddg' || pref === 'web') {
        vendorPreference = 'duckduckgo';
      } else if (pref === 'wiki' || pref === 'wikipedia') {
        vendorPreference = 'wikipedia';
      }
    }

    const fallbackUrl = match[2]?.trim();

    tokens.push({
      type: 'media',
      raw: match[0],
      query,
      mediaType: 'image',
      vendorPreference,
      fallbackUrl,
      id: `media-${matchStart}-${encodeURIComponent(query).slice(0, 20)}`,
    });

    currentIndex = matchEnd;
  }

  // Handle remainder text
  if (currentIndex < text.length) {
    const remaining = text.slice(currentIndex);

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
