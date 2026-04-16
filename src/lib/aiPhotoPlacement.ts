import { CanonicalPhotoBuckets } from './aiPhotoBuckets';

export type PhotoPlacementPlan = {
  heroImage?: string;
  storyImage?: string;
  galleryImages: string[];
  travelImage?: string;
};

export const buildPhotoPlacementPlan = (buckets: CanonicalPhotoBuckets): PhotoPlacementPlan => {
  const main = buckets['main-couple'];
  const couple = buckets['couple-gallery'];
  const vibe = buckets['weekend-vibe'];
  const family = buckets['friends-family'];
  const extras = buckets.extras;

  return {
    heroImage: main[0]?.url ?? vibe[0]?.url,
    storyImage: couple[0]?.url ?? main[1]?.url ?? vibe[1]?.url,
    travelImage: vibe[0]?.url,
    galleryImages: [
      ...couple.map((item) => item.url),
      ...vibe.slice(1).map((item) => item.url),
      ...family.map((item) => item.url),
      ...extras.map((item) => item.url),
    ],
  };
};
