import { getAllTemplates } from '../../templates/registry';

export type TemplateCatalogItem = {
  id: string;
  name: string;
  previewImage: string;
  styleTags: string[];
  seasonTags: string[];
  colorwayId: string;
  designFamily: string;
  description: string;
  bestFor: string[];
  includedModules: string[];
  defaultSectionOrder: string[];
};

const PREVIEW_POOL = [
  'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg',
  'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg',
  'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg',
  'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg',
  'https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg',
  'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg',
];

const THEME_TO_COLORWAY: Record<string, string> = {
  editorial: 'ivory-ink',
  moody: 'midnight-ink',
  romantic: 'blush-sage',
  playful: 'mono-contrast',
  classic: 'ivory-black-gold',
  coastal: 'seafoam-sand',
  garden: 'blush-sage',
  minimal: 'ivory-ink',
  luxury: 'ivory-black-gold',
  destination: 'seafoam-sand',
  photography: 'ivory-ink',
  boho: 'terracotta-cream',
  rustic: 'terracotta-cream',
};

const words = (v: string) => v.toLowerCase();

const inferStyleTags = (id: string, name: string, description: string): string[] => {
  const src = `${id} ${name} ${description}`.toLowerCase();
  const tags: string[] = [];
  const add = (tag: string, match: boolean) => {
    if (match && !tags.includes(tag)) tags.push(tag);
  };

  add('Modern', /modern|minimal|clean|contemporary/.test(src));
  add('Minimal', /minimal|clean/.test(src));
  add('Floral', /garden|floral|botanical/.test(src));
  add('Romantic', /romantic|dreamy|love/.test(src));
  add('Destination', /destination|travel|coastal|beach|adventure/.test(src));
  add('Classic', /classic|timeless|traditional/.test(src));
  add('Formal', /formal|black.tie|black tie|luxury|elegant|opulent/.test(src));
  add('Rustic', /rustic|barn|vineyard/.test(src));
  add('Boho', /boho|earthy/.test(src));
  add('Bold', /bold|dramatic|cinematic|editorial/.test(src));

  if (tags.length === 0) tags.push('Modern');
  return tags.slice(0, 3);
};

const inferSeasonTags = (id: string, name: string, description: string): string[] => {
  const src = words(`${id} ${name} ${description}`);
  const tags: string[] = [];
  const add = (tag: string, ok: boolean) => {
    if (ok && !tags.includes(tag)) tags.push(tag);
  };
  add('Spring', /garden|floral|pastel|romantic/.test(src));
  add('Summer', /coastal|beach|destination|outdoor/.test(src));
  add('Fall', /rustic|barn|warm|earthy/.test(src));
  add('Winter', /moody|formal|black tie|luxury/.test(src));
  if (tags.length === 0) tags.push('Spring', 'Summer');
  return tags.slice(0, 2);
};

const titleCase = (s: string) =>
  s
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const buildCatalog = (): TemplateCatalogItem[] => {
  return getAllTemplates().map((tpl, idx) => {
    const styleTags = inferStyleTags(tpl.id, tpl.name, tpl.description);
    const seasonTags = inferSeasonTags(tpl.id, tpl.name, tpl.description);
    const defaultSectionOrder = tpl.defaultLayout.sections.map((s) => titleCase(String(s.type)));
    const includedModules = Array.from(new Set(defaultSectionOrder));
    const colorwayId = THEME_TO_COLORWAY[tpl.defaultThemePreset] ?? 'ivory-ink';

    return {
      id: tpl.id,
      name: tpl.name,
      previewImage: PREVIEW_POOL[idx % PREVIEW_POOL.length],
      styleTags,
      seasonTags,
      colorwayId,
      designFamily: tpl.id,
      description: tpl.description,
      bestFor: [styleTags[0] ? `${styleTags[0]} weddings` : 'All celebrations'],
      includedModules,
      defaultSectionOrder,
    };
  });
};

export const templateCatalog: TemplateCatalogItem[] = buildCatalog();

const uniqueSorted = (arr: string[]) => Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));

export const templateStyleFacets = uniqueSorted(templateCatalog.flatMap((t) => t.styleTags));
export const templateSeasonFacets = uniqueSorted(templateCatalog.flatMap((t) => t.seasonTags));
export const templateColorwayFacets = uniqueSorted(templateCatalog.map((t) => t.colorwayId));
