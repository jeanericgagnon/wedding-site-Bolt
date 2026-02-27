export type TemplateCatalogItem = {
  id: string;
  name: string;
  previewImage: string;
  styleTags: string[];
  seasonTags: string[];
  colorwayId: string;
  designFamily: string;
  description: string;
};

export const templateCatalog: TemplateCatalogItem[] = [
  {
    id: 'modern-luxe',
    name: 'Modern Luxe',
    previewImage: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg',
    styleTags: ['Modern', 'Minimal'],
    seasonTags: ['Summer', 'Fall'],
    colorwayId: 'ivory-ink',
    designFamily: 'modern-luxe',
    description: 'Editorial modern layout with clean spacing and soft serif accents.',
  },
  {
    id: 'garden-romance',
    name: 'Garden Romance',
    previewImage: 'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg',
    styleTags: ['Floral', 'Romantic'],
    seasonTags: ['Spring', 'Summer'],
    colorwayId: 'blush-sage',
    designFamily: 'garden-romance',
    description: 'Soft floral-forward design with warm romantic typography.',
  },
  {
    id: 'coastal-breeze',
    name: 'Coastal Breeze',
    previewImage: 'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg',
    styleTags: ['Destination', 'Minimal'],
    seasonTags: ['Summer'],
    colorwayId: 'seafoam-sand',
    designFamily: 'coastal-breeze',
    description: 'Airy destination aesthetic with clean sections and map-friendly blocks.',
  },
  {
    id: 'classic-elegance',
    name: 'Classic Elegance',
    previewImage: 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg',
    styleTags: ['Classic', 'Formal'],
    seasonTags: ['Fall', 'Winter'],
    colorwayId: 'ivory-black-gold',
    designFamily: 'classic-elegance',
    description: 'Timeless wedding style with formal typography and structured flow.',
  },
  {
    id: 'rustic-warmth',
    name: 'Rustic Warmth',
    previewImage: 'https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg',
    styleTags: ['Rustic', 'Boho'],
    seasonTags: ['Fall'],
    colorwayId: 'terracotta-cream',
    designFamily: 'rustic-warmth',
    description: 'Organic textures and warm tones for barn, vineyard, and outdoors weddings.',
  },
  {
    id: 'bold-minimal',
    name: 'Bold Minimal',
    previewImage: 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg',
    styleTags: ['Bold', 'Modern'],
    seasonTags: ['Spring', 'Winter'],
    colorwayId: 'mono-contrast',
    designFamily: 'bold-minimal',
    description: 'High-contrast layout with statement headlines and sharp section breaks.',
  },
];

export const templateStyleFacets = ['Modern', 'Minimal', 'Floral', 'Romantic', 'Destination', 'Classic', 'Formal', 'Rustic', 'Boho', 'Bold'] as const;
export const templateSeasonFacets = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
export const templateColorwayFacets = ['ivory-ink', 'blush-sage', 'seafoam-sand', 'ivory-black-gold', 'terracotta-cream', 'mono-contrast'] as const;
