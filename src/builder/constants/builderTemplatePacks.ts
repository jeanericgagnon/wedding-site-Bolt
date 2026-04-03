import { BuilderTemplateDefinition, TemplateMoodTag } from '../../types/builder/template';
import { getAllTemplates } from '../../templates/registry';
import { BuilderSectionType } from '../../types/builder/section';

const withBasePath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const BUILDER_TEMPLATE_PACKS: Record<string, BuilderTemplateDefinition> = {
  'modern-luxe': {
    id: 'modern-luxe',
    displayName: 'Modern Luxe',
    description: 'Editorial photography, sharp typography, and a polished black-and-gold palette for couples who want a refined wedding website from the start.',
    moodTags: ['modern', 'luxe', 'editorial'],
    previewThumbnailPath: withBasePath('/template-previews/luxury-opulent.webp'),
    defaultThemeId: 'elegant',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'filmStrip', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'venue', variant: 'splitMap', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'timeline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'hotelBlock', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'featured', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed',
      story: 'split',
      gallery: 'filmStrip',
      venue: 'splitMap',
      schedule: 'timeline',
      registry: 'featured',
      travel: 'hotelBlock',
      faq: 'accordion',
      rsvp: 'card',
    },
    suggestedFonts: { heading: 'Playfair Display', body: 'Inter' },
    spacingProfile: 'spacious',
    isNew: true,
  },

  'editorial-romance': {
    id: 'editorial-romance',
    displayName: 'Editorial Romance',
    description: 'Film warmth, generous white space, and a story-first layout that still keeps the important guest details easy to find.',
    moodTags: ['editorial', 'romantic', 'modern'],
    previewThumbnailPath: withBasePath('/template-previews/editorial-impact.webp'),
    defaultThemeId: 'editorial',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'centered', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'venue', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'masonry', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'minimal', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'inline', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed',
      story: 'centered',
      gallery: 'masonry',
      venue: 'card',
      schedule: 'agendaCards',
      travel: 'list',
      registry: 'minimal',
      rsvp: 'inline',
    },
    suggestedFonts: { heading: 'Cormorant Garamond', body: 'Lato' },
    spacingProfile: 'spacious',
  },

  'timeless-classic': {
    id: 'timeless-classic',
    displayName: 'Timeless Classic',
    description: 'Deep navy, heirloom ivory, and formal invitation energy with a clear, dependable structure for guests.',
    moodTags: ['classic', 'romantic', 'luxe'],
    previewThumbnailPath: withBasePath('/template-previews/timeless-classic.webp'),
    defaultThemeId: 'classic',
    sectionComposition: [
      { type: 'hero', variant: 'minimal', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'venue', variant: 'detailsFirst', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'hotelBlock', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'grid', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'default', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'minimal',
      story: 'split',
      venue: 'detailsFirst',
      schedule: 'agendaCards',
      travel: 'hotelBlock',
      faq: 'accordion',
      gallery: 'grid',
      registry: 'cards',
      rsvp: 'default',
    },
    suggestedFonts: { heading: 'EB Garamond', body: 'Source Sans Pro' },
    spacingProfile: 'balanced',
  },

  'destination-minimal': {
    id: 'destination-minimal',
    displayName: 'Destination Escape',
    description: 'Coastal blues, breezy white space, and travel-first structure for destination weddings where guest logistics matter early.',
    moodTags: ['minimal', 'destination', 'modern'],
    previewThumbnailPath: withBasePath('/template-previews/destination-adventure.webp'),
    defaultThemeId: 'ocean',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'venue', variant: 'mapFirst', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'timeline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'accommodations', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'centered', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'rsvp', variant: 'inline', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed',
      venue: 'mapFirst',
      travel: 'cards',
      story: 'centered',
      schedule: 'timeline',
      accommodations: 'cards',
      faq: 'accordion',
      rsvp: 'inline',
    },
    suggestedFonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    spacingProfile: 'spacious',
  },

  'bold-contemporary': {
    id: 'bold-contemporary',
    displayName: 'Bold Contemporary',
    description: 'Supersized type, sharp contrast, and bold modern energy without losing clarity around the important details.',
    moodTags: ['bold', 'modern', 'editorial'],
    previewThumbnailPath: withBasePath('/template-previews/bold-statement.webp'),
    defaultThemeId: 'elegant',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'dayTabs', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'venue', variant: 'splitMap', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'filmStrip', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'featured', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'twoColumn', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'multiEvent', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed',
      schedule: 'dayTabs',
      gallery: 'filmStrip',
      story: 'split',
      venue: 'splitMap',
      registry: 'featured',
      travel: 'list',
      faq: 'twoColumn',
      rsvp: 'multiEvent',
    },
    suggestedFonts: { heading: 'Syne', body: 'Instrument Sans' },
    spacingProfile: 'spacious',
    isNew: true,
  },

  'photo-storytelling': {
    id: 'photo-storytelling',
    displayName: 'Photo Storytelling',
    description: 'Photography-led, but still structured enough that guests can quickly find the key details they need.',
    moodTags: ['photo', 'romantic', 'editorial'],
    previewThumbnailPath: withBasePath('/template-previews/photo-storytelling.webp'),
    defaultThemeId: 'romantic',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'centered', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'venue', variant: 'mapFirst', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'masonry', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'rsvp', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed',
      gallery: 'masonry',
      story: 'centered',
      venue: 'mapFirst',
      schedule: 'agendaCards',
      travel: 'list',
      rsvp: 'card',
      registry: 'cards',
    },
    suggestedFonts: { heading: 'Libre Baskerville', body: 'Karla' },
    spacingProfile: 'balanced',
  },

  'floral-garden': {
    id: 'floral-garden',
    displayName: 'Floral Garden',
    description: 'Botanical warmth, sage and terracotta, and a guest-friendly structure suited to outdoor or garden weddings.',
    moodTags: ['floral', 'garden', 'romantic'],
    previewThumbnailPath: withBasePath('/template-previews/garden-escape.webp'),
    defaultThemeId: 'garden',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'venue', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'polaroid', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'dress-code', variant: 'moodBoard', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'default', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed',
      story: 'split',
      gallery: 'polaroid',
      venue: 'card',
      'dress-code': 'moodBoard',
      schedule: 'agendaCards',
      travel: 'list',
      registry: 'cards',
      faq: 'accordion',
      rsvp: 'default',
    },
    suggestedFonts: { heading: 'Gilda Display', body: 'Nunito' },
    spacingProfile: 'balanced',
  },

  'editorial-romance-ivory': {
    id: 'editorial-romance-ivory',
    displayName: 'Editorial Romance · Ivory',
    description: 'An airy editorial look with warm ivory tones and a cleaner first draft for guests to follow.',
    moodTags: ['editorial', 'romantic', 'classic'],
    previewThumbnailPath: withBasePath('/template-previews/editorial-impact.webp'),
    defaultThemeId: 'editorial',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'centered', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'gallery', variant: 'masonry', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'venue', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'minimal', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'inline', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'centered', gallery: 'masonry', venue: 'card', schedule: 'agendaCards', travel: 'list', registry: 'minimal', rsvp: 'inline',
    },
    suggestedFonts: { heading: 'Cormorant Garamond', body: 'Lato' },
    spacingProfile: 'spacious',
    isNew: true,
  },

  'editorial-romance-midnight': {
    id: 'editorial-romance-midnight',
    displayName: 'Editorial Romance · Midnight',
    description: 'Moody editorial romance with cinematic contrast and a stronger guest-facing structure.',
    moodTags: ['editorial', 'romantic', 'modern'],
    previewThumbnailPath: withBasePath('/template-previews/editorial-impact.webp'),
    defaultThemeId: 'elegant',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'filmStrip', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'venue', variant: 'splitMap', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'timeline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'hotelBlock', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'featured', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'split', gallery: 'filmStrip', venue: 'splitMap', schedule: 'timeline', travel: 'hotelBlock', registry: 'featured', rsvp: 'card',
    },
    suggestedFonts: { heading: 'Playfair Display', body: 'Inter' },
    spacingProfile: 'spacious',
    isNew: true,
  },

  'floral-garden-sage': {
    id: 'floral-garden-sage',
    displayName: 'Floral Garden · Sage',
    description: 'Soft botanical greens and elegant florals with a cleaner, guest-friendly structure.',
    moodTags: ['floral', 'garden', 'romantic'],
    previewThumbnailPath: withBasePath('/template-previews/garden-escape.webp'),
    defaultThemeId: 'garden',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'polaroid', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'venue', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'default', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'split', gallery: 'polaroid', venue: 'card', schedule: 'agendaCards', registry: 'cards', faq: 'accordion', rsvp: 'default',
    },
    suggestedFonts: { heading: 'Gilda Display', body: 'Nunito' },
    spacingProfile: 'balanced',
    isNew: true,
  },

  'floral-garden-rose': {
    id: 'floral-garden-rose',
    displayName: 'Floral Garden · Rose',
    description: 'A blush-forward floral look with a romantic tone and a clearer first-draft structure.',
    moodTags: ['floral', 'romantic', 'classic'],
    previewThumbnailPath: withBasePath('/template-previews/garden-escape.webp'),
    defaultThemeId: 'romantic',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'centered', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'gallery', variant: 'masonry', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'venue', variant: 'detailsFirst', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'inline', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'centered', gallery: 'masonry', venue: 'detailsFirst', schedule: 'agendaCards', travel: 'list', registry: 'cards', rsvp: 'inline',
    },
    suggestedFonts: { heading: 'Cormorant Garamond', body: 'Lato' },
    spacingProfile: 'spacious',
    isNew: true,
  },

  'modern-luxe-ivory': {
    id: 'modern-luxe-ivory',
    displayName: 'Modern Luxe · Ivory',
    description: 'A bright luxury look with ivory tones, clean lines, and a more polished default guest experience.',
    moodTags: ['modern', 'luxe', 'minimal'],
    previewThumbnailPath: withBasePath('/template-previews/luxury-opulent.webp'),
    defaultThemeId: 'classic',
    sectionComposition: [
      { type: 'hero', variant: 'fullbleed', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'filmStrip', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'venue', variant: 'splitMap', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'timeline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'featured', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'hotelBlock', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'split', gallery: 'filmStrip', venue: 'splitMap', schedule: 'timeline', registry: 'featured', travel: 'hotelBlock', rsvp: 'card',
    },
    suggestedFonts: { heading: 'Playfair Display', body: 'Inter' },
    spacingProfile: 'spacious',
    isNew: true,
  },

  'timeless-classic-navy': {
    id: 'timeless-classic-navy',
    displayName: 'Timeless Classic · Navy',
    description: 'Formal navy-and-gold invitation energy with traditional structure and polish.',
    moodTags: ['classic', 'luxe', 'romantic'],
    previewThumbnailPath: withBasePath('/template-previews/timeless-classic.webp'),
    defaultThemeId: 'classic',
    sectionComposition: [
      { type: 'hero', variant: 'minimal', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'venue', variant: 'detailsFirst', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'hotelBlock', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'grid', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'default', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'minimal', story: 'split', venue: 'detailsFirst', schedule: 'agendaCards', travel: 'hotelBlock', faq: 'accordion', gallery: 'grid', registry: 'cards', rsvp: 'default',
    },
    suggestedFonts: { heading: 'EB Garamond', body: 'Source Sans Pro' },
    spacingProfile: 'balanced',
    isNew: true,
  },
};

const LEGACY_MOOD_BY_THEME: Record<string, TemplateMoodTag[]> = {
  romantic: ['romantic'],
  editorial: ['editorial', 'modern'],
  classic: ['classic', 'romantic'],
  minimal: ['minimal', 'modern'],
  luxury: ['luxe', 'classic'],
  destination: ['destination', 'modern'],
  coastal: ['destination', 'romantic'],
  garden: ['garden', 'floral', 'romantic'],
  playful: ['bold', 'modern'],
  moody: ['editorial', 'bold'],
  modern: ['modern'],
};

function inferMoodTags(themeId: string, id: string, name: string): TemplateMoodTag[] {
  const fromTheme = LEGACY_MOOD_BY_THEME[themeId] ?? ['modern'];
  const text = `${id} ${name}`.toLowerCase();
  const extra: TemplateMoodTag[] = [];
  if (text.includes('photo')) extra.push('photo');
  if (text.includes('garden') || text.includes('floral')) extra.push('floral');
  if (text.includes('destination') || text.includes('coastal')) extra.push('destination');
  if (text.includes('bold')) extra.push('bold');
  return Array.from(new Set([...fromTheme, ...extra])).slice(0, 3);
}

function toBuilderTemplateFromLegacy(template: ReturnType<typeof getAllTemplates>[number]): BuilderTemplateDefinition {
  const sectionComposition = template.defaultLayout.sections.map((section, idx) => ({
    type: section.type as BuilderSectionType,
    variant: section.variant,
    enabled: section.enabled,
    locked: false,
    settings: { showTitle: true, ...(section.settings ?? {}) },
    orderIndex: idx,
  }));

  const sectionVariantMap: Record<string, string> = {};
  sectionComposition.forEach((s) => {
    if (!(s.type in sectionVariantMap)) sectionVariantMap[s.type] = s.variant;
  });

  return {
    id: template.id,
    displayName: template.name,
    description: template.description,
    moodTags: inferMoodTags(template.defaultThemePreset, template.id, template.name),
    previewThumbnailPath: withBasePath(`/template-previews/${template.id}.webp`),
    defaultThemeId: template.defaultThemePreset,
    sectionComposition,
    sectionVariantMap,
    suggestedFonts: { heading: 'Playfair Display', body: 'Inter' },
    spacingProfile: 'balanced',
  };
}

const LEGACY_TEMPLATE_PACKS: Record<string, BuilderTemplateDefinition> = Object.fromEntries(
  getAllTemplates().map((t) => [t.id, toBuilderTemplateFromLegacy(t)])
);

const MERGED_TEMPLATE_PACKS: Record<string, BuilderTemplateDefinition> = {
  ...LEGACY_TEMPLATE_PACKS,
  ...BUILDER_TEMPLATE_PACKS,
};

export function getAllTemplatePacks(): BuilderTemplateDefinition[] {
  return Object.values(MERGED_TEMPLATE_PACKS);
}

export function getTemplatePack(id: string): BuilderTemplateDefinition | null {
  return MERGED_TEMPLATE_PACKS[id] ?? null;
}
