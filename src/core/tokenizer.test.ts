import { describe, expect, it } from 'vitest';
import { tokenizeStreamingMarkdown } from './tokenizer';

describe('tokenizeStreamingMarkdown', () => {
  it('extracts the public media syntax without consuming surrounding prose', () => {
    expect(
      tokenizeStreamingMarkdown(
        'Before ![Neanderthal skull](neanderthal:image) after.'
      )
    ).toMatchObject([
      { type: 'text', content: 'Before ' },
      {
        type: 'media',
        query: 'Neanderthal skull',
        mediaType: 'image',
        vendorPreference: 'auto',
      },
      { type: 'text', content: ' after.' },
    ]);
  });

  it('keeps ordinary Markdown images as text for the real renderer', () => {
    expect(
      tokenizeStreamingMarkdown('![Alt text](https://example.com/image.jpg)')
    ).toEqual([
      { type: 'text', content: '![Alt text](https://example.com/image.jpg)' },
    ]);
  });

  it('continues to recognize legacy tokens during migration', () => {
    expect(tokenizeStreamingMarkdown('![media:Chloroplast|wiki]')[0]).toMatchObject({
      type: 'media',
      query: 'Chloroplast',
      vendorPreference: 'wikipedia',
    });
  });
});
