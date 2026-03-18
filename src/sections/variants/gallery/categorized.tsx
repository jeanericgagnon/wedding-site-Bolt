import { SectionDefinition } from '../../types';
import { galleryMasonrySchema, defaultGalleryMasonryData, type GalleryMasonryData, galleryMasonryDefinition } from './masonry';

const defaultCategorizedData: GalleryMasonryData = {
  ...defaultGalleryMasonryData,
  headline: 'Moments by Chapter',
};

export const galleryCategorizedDefinition: SectionDefinition<GalleryMasonryData> = {
  type: 'gallery',
  variant: 'categorized',
  schema: galleryMasonrySchema,
  defaultData: defaultCategorizedData,
  Component: galleryMasonryDefinition.Component,
};
