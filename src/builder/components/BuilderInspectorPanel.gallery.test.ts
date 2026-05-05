import { describe, expect, it } from 'vitest';
import { normalizeGalleryImages } from './BuilderInspectorPanel';

describe('normalizeGalleryImages', () => {
  it('unwraps provenance-wrapped gallery arrays before rendering the inspector', () => {
    const image = { id: 'img-1', url: 'https://example.com/photo.jpg', alt: 'Couple', caption: 'Weekend' };

    expect(normalizeGalleryImages({
      value: [image],
      source: 'user-edited',
      updatedAt: '2026-05-03T00:00:00.000Z',
    })).toEqual([image]);
  });

  it('falls back to an empty array when persisted gallery images are malformed', () => {
    expect(normalizeGalleryImages({ value: { id: 'not-an-array' } })).toEqual([]);
    expect(normalizeGalleryImages(null)).toEqual([]);
  });
});
