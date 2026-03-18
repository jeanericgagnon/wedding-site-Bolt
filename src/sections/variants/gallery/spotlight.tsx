import { SectionDefinition } from '../../types';
import { galleryCarouselSchema, defaultGalleryCarouselData, type GalleryCarouselData, galleryCarouselDefinition } from './carousel';

const defaultSpotlightData: GalleryCarouselData = {
  ...defaultGalleryCarouselData,
  headline: 'Spotlight Moments',
  showCaptions: true,
  autoplay: false,
};

export const gallerySpotlightDefinition: SectionDefinition<GalleryCarouselData> = {
  type: 'gallery',
  variant: 'spotlight',
  schema: galleryCarouselSchema,
  defaultData: defaultSpotlightData,
  Component: galleryCarouselDefinition.Component,
};
