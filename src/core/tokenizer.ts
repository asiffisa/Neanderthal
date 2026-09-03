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
export function tokenizeStreamingMarkdown(
  text: string,
  _isStreaming: boolean = false
): MarkdownToken[] {
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
    tokens.push({
      type: 'text',
      content: normalizedText.slice(currentIndex),
    });
  }

  return tokens;
}
