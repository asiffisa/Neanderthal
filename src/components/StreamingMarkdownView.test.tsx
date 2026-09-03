import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CAPSULE_SETTINGS } from '../core/types';
import { StreamingMarkdownView } from './StreamingMarkdownView';

function render(content: string, isStreaming: boolean = false): string {
  return renderToStaticMarkup(
    <StreamingMarkdownView
      content={content}
      isStreaming={isStreaming}
      settings={DEFAULT_CAPSULE_SETTINGS}
    />
  );
}

describe('StreamingMarkdownView', () => {
  it('preserves rich Markdown while upgrading only Neanderthal images', () => {
    const html = render(`## Visual prose

A **bold** and *emphasized* [source](https://example.com).

- First item
- Second item

| Kind | Value |
| --- | --- |
| Image | Useful |

\`\`\`ts
const answer = 42
\`\`\`

An ordinary image ![Ordinary](https://example.com/image.jpg) and an inline visual ![Mantis shrimp](neanderthal:image).`);

    expect(html).toContain('<h2');
    expect(html).toContain('<strong');
    expect(html).toContain('<em');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('<ul');
    expect(html).toContain('<table');
    expect(html).toContain('<pre');
    expect(html).toContain('src="https://example.com/image.jpg"');
    expect(html).toContain('Mantis shrimp');
    expect(html).not.toContain('neanderthal:image');
    expect(html).not.toContain('target="_blank"');
  });

  it('uses a non-resolving capsule for an unfinished streamed image', () => {
    const html = render('See ![Mantis shrimp', true);

    expect(html).toContain('Visualizing…');
    expect(html).not.toContain('![Mantis shrimp');
  });

  it('renders the legacy syntax through the same capsule path', () => {
    const html = render('See ![media:Anglerfish|wiki].');

    expect(html).toContain('Anglerfish');
    expect(html).not.toContain('![media:');
  });

  it('keeps legacy-looking examples literal inside code', () => {
    const html = render(`Inline \`![media:Inline example|wiki]\`.

\`\`\`md
![media:Fenced example|web]
\`\`\``);

    expect(html).toContain('![media:Inline example|wiki]');
    expect(html).toContain('![media:Fenced example|web]');
  });

  it('does not activate the private scheme on ordinary links', () => {
    const html = render('[Not an image](neanderthal:image)');

    expect(html).not.toContain('href="neanderthal:image"');
  });
});
