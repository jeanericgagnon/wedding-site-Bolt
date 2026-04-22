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

  it('maps legacy registry aliases onto canonical public preview fixtures', () => {
    expect(getVariantPreviewSource('registry', 'default')).toBe('cards');
    expect(getVariantPreviewSource('registry', 'grid')).toBe('cards');
    expect(getVariantPreviewSource('registry', 'tabs')).toBe('cards');
    expect(getVariantPreviewSource('registry', 'illustrated')).toBe('cards');
    expect(getVariantPreviewSource('registry', 'featured')).toBe('featured');
    expect(getVariantPreviewSource('registry', 'honeymoon')).toBe('featured');
  });
});
