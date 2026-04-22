import { describe, expect, it } from 'vitest';
import { getVariantPreviewSource } from './variantPreviewSource';

describe('getVariantPreviewSource', () => {
  it('maps registry aliases onto shipped public preview layouts', () => {
    expect(getVariantPreviewSource('registry', 'classic')).toBe('cards');
    expect(getVariantPreviewSource('registry', 'modern')).toBe('cards');
    expect(getVariantPreviewSource('registry', 'playful')).toBe('cards');
    expect(getVariantPreviewSource('registry', 'luxury')).toBe('featured');
    expect(getVariantPreviewSource('registry', 'experiences')).toBe('featured');
    expect(getVariantPreviewSource('registry', 'fundHighlight')).toBe('featured');
  });

  it('leaves non-registry previews untouched', () => {
    expect(getVariantPreviewSource('hero', 'countdown')).toBe('countdown');
  });
});
