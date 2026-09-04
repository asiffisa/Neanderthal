import { describe, expect, it } from 'vitest';
import { shouldShowHoverPreview } from './InlineCapsule';

describe('shouldShowHoverPreview', () => {
  it.each([
    ['touch input', 'touch', true, false],
    ['a non-hover-capable device', 'mouse', false, false],
    ['a mouse hover', 'mouse', true, true],
    ['a pen hover', 'pen', true, true],
  ])('returns %s as expected', (_case, pointerType, canHover, expected) => {
    expect(shouldShowHoverPreview(pointerType, canHover)).toBe(expected);
  });
});
