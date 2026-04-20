import { describe, expect, it } from 'vitest';
import { getSectionPrimaryImage } from './sectionMedia';

describe('getSectionPrimaryImage', () => {
  it('prefers backgroundImage first', () => {
    expect(getSectionPrimaryImage({ backgroundImage: 'https://example.com/bg.jpg', heroImage: 'https://example.com/hero.jpg' })).toBe('https://example.com/bg.jpg');
  });

  it('falls back through hero image aliases before weddingData media', () => {
    expect(getSectionPrimaryImage({ heroImage: 'https://example.com/hero.jpg' }, 'https://example.com/fallback.jpg')).toBe('https://example.com/hero.jpg');
    expect(getSectionPrimaryImage({ heroImageUrl: 'https://example.com/hero-url.jpg' }, 'https://example.com/fallback.jpg')).toBe('https://example.com/hero-url.jpg');
    expect(getSectionPrimaryImage({ image: 'https://example.com/image.jpg' }, 'https://example.com/fallback.jpg')).toBe('https://example.com/image.jpg');
    expect(getSectionPrimaryImage({ coverImage: 'https://example.com/cover.jpg' }, 'https://example.com/fallback.jpg')).toBe('https://example.com/cover.jpg');
  });

  it('supports builder value objects and final fallback', () => {
    expect(getSectionPrimaryImage({ heroImage: { value: 'https://example.com/object.jpg' } }, 'https://example.com/fallback.jpg')).toBe('https://example.com/object.jpg');
    expect(getSectionPrimaryImage({}, 'https://example.com/fallback.jpg')).toBe('https://example.com/fallback.jpg');
  });
});
