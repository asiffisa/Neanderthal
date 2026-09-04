import { MarkdownToken } from './types';
import { normalizeLegacyMediaMarkdown, parseNeanderthalMediaSource, visitMarkdown } from './media-markdown';

/** Collect real image nodes; code, escaped examples and ordinary images stay literal. */
export function tokenizeStreamingMarkdown(text: string, _isStreaming = false): MarkdownToken[] {
  if (!text) return [];
  const normalizedText = normalizeLegacyMediaMarkdown(text);
  const tokens: MarkdownToken[] = [];
  const queryCounts = new Map<string, number>();
  let currentIndex = 0;

  visitMarkdown(normalizedText, (node) => {
    if (node.type !== 'image') return;
    const descriptor = parseNeanderthalMediaSource(node.url);
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (!descriptor || start === undefined || end === undefined) return;
    if (start > currentIndex) tokens.push({ type: 'text', content: normalizedText.slice(currentIndex, start) });
    const query = node.alt?.trim() || '';
    const normalized = query.toLowerCase();
    const occurrenceIndex = queryCounts.get(normalized) || 0;
    queryCounts.set(normalized, occurrenceIndex + 1);
    tokens.push({
      type: 'media', raw: normalizedText.slice(start, end), query,
      mediaType: descriptor.mediaType, vendorPreference: descriptor.vendorPreference,
      occurrenceIndex, fallbackUrl: descriptor.fallbackUrl,
      id: `media-${start}-${encodeURIComponent(query).slice(0, 20)}`,
      isPartial: descriptor.isPartial,
    });
    currentIndex = end;
  });
  if (currentIndex < normalizedText.length) tokens.push({ type: 'text', content: normalizedText.slice(currentIndex) });
  return tokens;
}
