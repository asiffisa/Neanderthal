import { describe, expect, it } from 'vitest';
import {
  collectMediaTokens,
  createNeanderthalMediaMarkdown,
  createNeanderthalMediaSource,
  normalizeLegacyMediaMarkdown,
  parseNeanderthalMediaSource,
  prepareNeanderthalMarkdown,
} from './media-markdown';

describe('Neanderthal Markdown contract', () => {
  it.each([
    '`The ![Electric eel](neanderthal:image)`',
    '``The ![Electric eel](neanderthal:image) and `code` ``',
    '```md\nThe ![Electric eel](neanderthal:image)\n```',
    '````md\n```\nThe ![Electric eel](neanderthal:image)\n```\n````',
    '    The ![Electric eel](neanderthal:image)',
    '```md\n![Unfinished',
    '~~~md\n![media:Unfinished',
    '\\![Unfinished',
    'The \\![Electric eel](neanderthal:image)',
    '<div>\nThe ![Electric eel](neanderthal:image)\n</div>',
  ])('preserves literal code/escaped content: %s', (markdown) => {
    expect(prepareNeanderthalMarkdown(markdown, true)).toBe(markdown);
  });

  it('preserves legacy-looking tokens in long and unfinished fences', () => {
    const markdown = '````md\n```\n![media:Example|wiki]\n```\n';
    expect(normalizeLegacyMediaMarkdown(markdown)).toBe(markdown);
  });

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

  it('restores omitted nouns so text is readable without hovering', () => {
    const omitted =
      'The ![Electric eel](neanderthal:image) generates charge using modified ![muscle](neanderthal:image) tissue.';
    expect(prepareNeanderthalMarkdown(omitted, false)).toBe(
      'The Electric eel ![Electric eel](neanderthal:image) generates charge using modified muscle ![muscle](neanderthal:image) tissue.'
    );
  });

  it('does not duplicate nouns when already present in prose', () => {
    const alreadyPresent =
      'The electric eel ![Electric eel](neanderthal:image) generates charge.';
    expect(prepareNeanderthalMarkdown(alreadyPresent, false)).toBe(alreadyPresent);
  });

  it('snaps trailing punctuation flush against capsules without stray spaces', () => {
    const spaced =
      'The perivascular space ![Perivascular space](neanderthal:image) . Simultaneously, delta waves ![Delta waves](neanderthal:image) , synchronize.';
    expect(prepareNeanderthalMarkdown(spaced, false)).toBe(
      'The perivascular space ![Perivascular space](neanderthal:image). Simultaneously, delta waves ![Delta waves](neanderthal:image), synchronize.'
    );
  });
});

describe('collectMediaTokens', () => {
  it('does not collect code or escaped examples as media', () => {
    expect(
      collectMediaTokens(
        '`![Code](neanderthal:image)` and \\![Escaped](neanderthal:image).\n\n```md\n![Fenced](neanderthal:image)\n```'
      )
    ).toEqual([]);
  });

  it('parses escaped brackets in descriptions consistently with Markdown', () => {
    expect(collectMediaTokens('![A \\[specimen\\]](neanderthal:image)')).toEqual([
      { query: 'A [specimen]', vendorPreference: 'auto', fallbackUrl: undefined },
    ]);
  });

  it('collects the public media syntax in reading order', () => {
    expect(
      collectMediaTokens(
        'Before ![Neanderthal skull](neanderthal:image) then ![Mantis shrimp](neanderthal:image?provider=duckduckgo) after.'
      )
    ).toMatchObject([
      { query: 'Neanderthal skull', vendorPreference: 'auto' },
      { query: 'Mantis shrimp', vendorPreference: 'duckduckgo' },
    ]);
  });

  it('ignores ordinary Markdown images meant for the real renderer', () => {
    expect(collectMediaTokens('![Alt text](https://example.com/image.jpg)')).toEqual([]);
  });

  it('continues to recognize legacy tokens during migration', () => {
    expect(collectMediaTokens('![media:Chloroplast|wiki]')).toMatchObject([
      { query: 'Chloroplast', vendorPreference: 'wikipedia' },
    ]);
  });
});
