import { describe, expect, it } from 'vitest';
import { getVariantQualityLabel, getVariantQualityScore } from './variantQuality';

describe('variant quality scoring', () => {
  it('flags shared registry preview aliases', () => {
    const result = getVariantQualityScore('registry', {
      id: 'luxury',
      label: 'Luxury',
      description: 'Premium cash fund presentation with elevated editorial hierarchy',
      bestFor: 'couples with a polished cash fund or curated registry story',
      effort: 'medium',
    }, 14);

    expect(result.flags).toContain('shared-preview');
    expect(result.previewSource).toBe('featured');
  });

  it('flags mobile-risk layouts based on variant language', () => {
    const result = getVariantQualityScore('hero', {
      id: 'fullbleed',
      label: 'Full Bleed',
      description: 'Edge-to-edge image with bold text overlay',
      bestFor: 'dramatic venue or portrait photography',
      effort: 'medium',
    }, 8);

    expect(result.flags).toContain('mobile-risk');
  });

  it('returns strong for specific well-described variants', () => {
    const result = getVariantQualityScore('gallery', {
      id: 'spotlight',
      label: 'Spotlight',
      description: 'Large featured photo with supporting images and balanced captions',
      bestFor: 'highlighting the best five to eight images',
      effort: 'medium',
    }, 8);

    expect(result.status).toBe('strong');
  });

  it('maps flags to readable labels', () => {
    expect(getVariantQualityLabel('thin-description')).toBe('Thin notes');
    expect(getVariantQualityLabel('missing-guidance')).toBe('Missing guidance');
  });
});
