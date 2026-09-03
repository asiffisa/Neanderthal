import { describe, expect, it } from 'vitest';
import {
  createNeanderthalMediaMarkdown,
  createNeanderthalMediaSource,
  normalizeLegacyMediaMarkdown,
  parseNeanderthalMediaSource,
  prepareNeanderthalMarkdown,
} from './media-markdown';

describe('Neanderthal Markdown contract', () => {
  it('creates the minimal CommonMark-compatible image form', () => {
    expect(createNeanderthalMediaMarkdown('Neanderthal skull')).toBe(
      '![Neanderthal skull](neanderthal:image)'
    );
  });

  it('round-trips optional resolver hints', () => {
    const source = createNeanderthalMediaSource({
      vendorPreference: 'wikipedia',
      fallbackUrl: 'https://example.com/skull.jpg',
    });

    expect(parseNeanderthalMediaSource(source)).toEqual({
      mediaType: 'image',
      vendorPreference: 'wikipedia',
      fallbackUrl: 'https://example.com/skull.jpg',
      isPartial: false,
    });
  });

  it('rejects normal and unsafe fallback URLs', () => {
    expect(parseNeanderthalMediaSource('https://example.com/image.jpg')).toBeNull();
    expect(
      parseNeanderthalMediaSource(
        'neanderthal:image?fallback=javascript%3Aalert%281%29'
      )
    ).toEqual({
      mediaType: 'image',
      vendorPreference: 'auto',
      fallbackUrl: undefined,
      isPartial: false,
    });
  });

  it('normalizes the original token syntax', () => {
    expect(normalizeLegacyMediaMarkdown('See ![media:Anglerfish|web] here.')).toBe(
      'See ![Anglerfish](neanderthal:image?provider=duckduckgo) here.'
    );
  });

  it('turns an unfinished streamed image into a non-resolving placeholder', () => {
    expect(prepareNeanderthalMarkdown('Look at ![Mantis shrimp', true)).toBe(
      'Look at ![Visualizing…](neanderthal:image?partial=true)'
    );
  });

  it('leaves complete Markdown and ordinary prose unchanged', () => {
    const markdown =
      'A **complete** image ![Mantis shrimp](neanderthal:image) and [source](https://example.com).';
    expect(prepareNeanderthalMarkdown(markdown, true)).toBe(markdown);
  });
});
