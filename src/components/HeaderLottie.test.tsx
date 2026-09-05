import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HeaderLottie } from './HeaderLottie';

describe('HeaderLottie', () => {
  it('renders a valid container element for SSR without crashing', () => {
    const html = renderToStaticMarkup(<HeaderLottie />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('aspect-[219/215]');
    expect(html).toContain('rounded-[8px]');
    expect(html).toContain('overflow-hidden');
    expect(html).toContain('w-[32px]');
    expect(html).toContain('md:w-[44px]');
  });
});


