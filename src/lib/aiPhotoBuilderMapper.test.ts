import { describe, expect, it } from 'vitest';
import { mapPhotoPlacementToSectionSettings } from './aiPhotoBuilderMapper';

describe('aiPhotoBuilderMapper', () => {
  const placement = {
    heroImage: 'hero.jpg',
    storyImage: 'story.jpg',
    travelImage: 'travel.jpg',
    galleryImages: ['g1.jpg', 'g2.jpg'],
  };

  it('maps hero image settings', () => {
    expect(mapPhotoPlacementToSectionSettings('hero', placement)).toEqual({
      backgroundImage: 'hero.jpg',
      image: 'hero.jpg',
    });
  });

  it('maps gallery images', () => {
    expect(mapPhotoPlacementToSectionSettings('gallery', placement)).toEqual({
      images: ['g1.jpg', 'g2.jpg'],
    });
  });
});
