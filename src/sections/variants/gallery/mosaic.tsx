import { SectionDefinition } from '../../types';
import { galleryGridSchema, defaultGalleryGridData, type GalleryGridData, galleryGridDefinition } from './grid';

const defaultMosaicData: GalleryGridData = {
  ...defaultGalleryGridData,
  headline: 'Photo Mosaic',
  columns: '4',
  aspectRatio: 'landscape',
};

export const galleryMosaicDefinition: SectionDefinition<GalleryGridData> = {
  type: 'gallery',
  variant: 'mosaic',
  schema: galleryGridSchema,
  defaultData: defaultMosaicData,
  Component: galleryGridDefinition.Component,
};
