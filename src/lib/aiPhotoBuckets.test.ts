import { describe, expect, it } from 'vitest';
import { addPhotoToBucket, createEmptyPhotoBuckets } from './aiPhotoBuckets';

describe('aiPhotoBuckets', () => {
  it('creates all canonical buckets', () => {
    const buckets = createEmptyPhotoBuckets();
    expect(Object.keys(buckets)).toEqual([
      'main-couple',
      'couple-gallery',
      'weekend-vibe',
      'friends-family',
      'extras',
    ]);
  });

  it('adds photos to the requested bucket', () => {
    const buckets = createEmptyPhotoBuckets();
    const next = addPhotoToBucket(buckets, {
      id: '1',
      url: 'https://example.com/photo.jpg',
      bucket: 'main-couple',
    });

    expect(next['main-couple']).toHaveLength(1);
    expect(next['main-couple'][0].url).toBe('https://example.com/photo.jpg');
  });
});
