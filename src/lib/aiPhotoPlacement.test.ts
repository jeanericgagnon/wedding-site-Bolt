import { describe, expect, it } from 'vitest';
import { createEmptyPhotoBuckets } from './aiPhotoBuckets';
import { buildPhotoPlacementPlan } from './aiPhotoPlacement';

describe('aiPhotoPlacement', () => {
  it('uses the main couple photo for hero and couple gallery for story', () => {
    const buckets = createEmptyPhotoBuckets();
    buckets['main-couple'].push({ id: '1', url: 'hero.jpg', bucket: 'main-couple' });
    buckets['couple-gallery'].push({ id: '2', url: 'story.jpg', bucket: 'couple-gallery' });

    const plan = buildPhotoPlacementPlan(buckets);
    expect(plan.heroImage).toBe('hero.jpg');
    expect(plan.storyImage).toBe('story.jpg');
  });

  it('falls back to weekend vibe and builds a gallery list', () => {
    const buckets = createEmptyPhotoBuckets();
    buckets['weekend-vibe'].push({ id: '1', url: 'vibe-1.jpg', bucket: 'weekend-vibe' });
    buckets['weekend-vibe'].push({ id: '2', url: 'vibe-2.jpg', bucket: 'weekend-vibe' });
    buckets['friends-family'].push({ id: '3', url: 'family.jpg', bucket: 'friends-family' });

    const plan = buildPhotoPlacementPlan(buckets);
    expect(plan.heroImage).toBe('vibe-1.jpg');
    expect(plan.storyImage).toBe('vibe-2.jpg');
    expect(plan.galleryImages).toContain('family.jpg');
  });
});
