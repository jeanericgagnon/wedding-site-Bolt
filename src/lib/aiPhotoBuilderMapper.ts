import { PhotoPlacementPlan } from './aiPhotoPlacement';

export const mapPhotoPlacementToSectionSettings = (
  type: string,
  placement: PhotoPlacementPlan
): Record<string, unknown> | null => {
  switch (type) {
    case 'hero':
      return placement.heroImage ? { backgroundImage: placement.heroImage, image: placement.heroImage } : null;
    case 'story':
      return placement.storyImage ? { image: placement.storyImage } : null;
    case 'travel':
      return placement.travelImage ? { image: placement.travelImage } : null;
    case 'gallery':
      return placement.galleryImages.length > 0 ? { images: placement.galleryImages } : null;
    default:
      return null;
  }
};
