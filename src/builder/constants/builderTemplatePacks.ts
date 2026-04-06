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
      { type: 'venue', variant: 'splitMap', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'timeline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'hotelBlock', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'filmStrip', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'featured', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'split', venue: 'splitMap', schedule: 'timeline', travel: 'hotelBlock', rsvp: 'card', gallery: 'filmStrip', registry: 'featured', faq: 'accordion',
    },
    suggestedFonts: { heading: 'Playfair Display', body: 'Inter' },
    spacingProfile: 'spacious',
    structureFocus: 'Balanced first impression with guest details close behind.',
    bestFor: ['formal weddings', 'city weddings', 'couples who want polished structure early'],
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
      { type: 'rsvp', variant: 'inline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'masonry', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'minimal', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'centered', venue: 'card', schedule: 'agendaCards', travel: 'list', rsvp: 'inline', gallery: 'masonry', registry: 'minimal',
    },
    suggestedFonts: { heading: 'Cormorant Garamond', body: 'Lato' },
    spacingProfile: 'spacious',
    structureFocus: 'Story-led opening with guest logistics still easy to find.',
    bestFor: ['editorial weddings', 'romantic city weddings', 'couples who want warmth without clutter'],
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
      { type: 'rsvp', variant: 'default', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'grid', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'minimal', story: 'split', venue: 'detailsFirst', schedule: 'agendaCards', travel: 'hotelBlock', rsvp: 'default', faq: 'accordion', gallery: 'grid', registry: 'cards',
    },
    suggestedFonts: { heading: 'EB Garamond', body: 'Source Sans Pro' },
    spacingProfile: 'balanced',
    structureFocus: 'Traditional flow with the key guest details presented clearly and early.',
    bestFor: ['formal weddings', 'family-heavy guest lists', 'traditional ceremony structure'],
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
      { type: 'rsvp', variant: 'inline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'centered', enabled: true, locked: false, settings: { showTitle: false } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', venue: 'mapFirst', travel: 'cards', schedule: 'timeline', accommodations: 'cards', rsvp: 'inline', faq: 'accordion', story: 'centered',
    },
    suggestedFonts: { heading: 'DM Serif Display', body: 'DM Sans' },
    spacingProfile: 'spacious',
    structureFocus: 'Travel and logistics come forward quickly for destination guests.',
    bestFor: ['destination weddings', 'multi-day celebrations', 'guest travel coordination'],
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
      { type: 'venue', variant: 'splitMap', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'multiEvent', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'story', variant: 'split', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'filmStrip', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'featured', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'twoColumn', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', schedule: 'dayTabs', venue: 'splitMap', travel: 'list', rsvp: 'multiEvent', story: 'split', gallery: 'filmStrip', registry: 'featured', faq: 'twoColumn',
    },
    suggestedFonts: { heading: 'Syne', body: 'Instrument Sans' },
    spacingProfile: 'spacious',
    structureFocus: 'High-energy visual rhythm without hiding the schedule and RSVP path.',
    bestFor: ['modern weddings', 'fashion-forward couples', 'multi-event weekends'],
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
      { type: 'rsvp', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'masonry', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'centered', venue: 'mapFirst', schedule: 'agendaCards', travel: 'list', rsvp: 'card', gallery: 'masonry', registry: 'cards',
    },
    suggestedFonts: { heading: 'Libre Baskerville', body: 'Karla' },
    spacingProfile: 'balanced',
    structureFocus: 'Photo-led but still grounded by venue, schedule, and RSVP near the top.',
    bestFor: ['engagement photography heavy sites', 'romantic storytelling', 'visual-first couples'],
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
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'dress-code', variant: 'moodBoard', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'default', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'polaroid', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'split', venue: 'card', schedule: 'agendaCards', travel: 'list', 'dress-code': 'moodBoard', rsvp: 'default', gallery: 'polaroid', registry: 'cards', faq: 'accordion',
    },
    suggestedFonts: { heading: 'Gilda Display', body: 'Nunito' },
    spacingProfile: 'balanced',
    structureFocus: 'Soft romantic look with guest information layered in before extra flourishes.',
    bestFor: ['garden weddings', 'outdoor weddings', 'soft romantic style'],
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
      { type: 'venue', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'inline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'masonry', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'minimal', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'centered', venue: 'card', schedule: 'agendaCards', travel: 'list', rsvp: 'inline', gallery: 'masonry', registry: 'minimal',
    },
    suggestedFonts: { heading: 'Cormorant Garamond', body: 'Lato' },
    spacingProfile: 'spacious',
    structureFocus: 'Editorial softness up front with a clean RSVP and guest-information path.',
    bestFor: ['light editorial weddings', 'classic romance', 'soft minimal styling'],
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
      { type: 'venue', variant: 'splitMap', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'timeline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'hotelBlock', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'filmStrip', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'featured', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'split', venue: 'splitMap', schedule: 'timeline', travel: 'hotelBlock', rsvp: 'card', gallery: 'filmStrip', registry: 'featured',
    },
    suggestedFonts: { heading: 'Playfair Display', body: 'Inter' },
    spacingProfile: 'spacious',
    structureFocus: 'Cinematic opening with a strong venue-to-schedule path immediately underneath.',
    bestFor: ['moody editorial weddings', 'evening celebrations', 'luxury modern style'],
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
      { type: 'venue', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'default', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'polaroid', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'split', venue: 'card', schedule: 'agendaCards', travel: 'list', rsvp: 'default', gallery: 'polaroid', registry: 'cards', faq: 'accordion',
    },
    suggestedFonts: { heading: 'Gilda Display', body: 'Nunito' },
    spacingProfile: 'balanced',
    structureFocus: 'A softer floral version that still gets guests to venue, schedule, and RSVP quickly.',
    bestFor: ['garden weddings', 'outdoor receptions', 'soft botanical styling'],
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
      { type: 'venue', variant: 'detailsFirst', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'agendaCards', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'list', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'inline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'masonry', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'centered', venue: 'detailsFirst', schedule: 'agendaCards', travel: 'list', rsvp: 'inline', gallery: 'masonry', registry: 'cards',
    },
    suggestedFonts: { heading: 'Cormorant Garamond', body: 'Lato' },
    spacingProfile: 'spacious',
    structureFocus: 'Romantic opening with guest essentials placed ahead of the decorative moments.',
    bestFor: ['floral weddings', 'classic romance', 'soft editorial feel'],
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
      { type: 'venue', variant: 'splitMap', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'schedule', variant: 'timeline', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'travel', variant: 'hotelBlock', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'rsvp', variant: 'card', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'filmStrip', enabled: true, locked: false, settings: { showTitle: false } },
      { type: 'registry', variant: 'featured', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'fullbleed', story: 'split', venue: 'splitMap', schedule: 'timeline', travel: 'hotelBlock', rsvp: 'card', gallery: 'filmStrip', registry: 'featured',
    },
    suggestedFonts: { heading: 'Playfair Display', body: 'Inter' },
    spacingProfile: 'spacious',
    structureFocus: 'Luxury styling with the same clear guest path as the darker modern luxe version.',
    bestFor: ['light luxury weddings', 'hotel weddings', 'clean editorial styling'],
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
      { type: 'rsvp', variant: 'default', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'faq', variant: 'accordion', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'gallery', variant: 'grid', enabled: true, locked: false, settings: { showTitle: true } },
      { type: 'registry', variant: 'cards', enabled: true, locked: false, settings: { showTitle: true } },
    ],
    sectionVariantMap: {
      hero: 'minimal', story: 'split', venue: 'detailsFirst', schedule: 'agendaCards', travel: 'hotelBlock', rsvp: 'default', faq: 'accordion', gallery: 'grid', registry: 'cards',
    },
    suggestedFonts: { heading: 'EB Garamond', body: 'Source Sans Pro' },
    spacingProfile: 'balanced',
    structureFocus: 'Classic invitation-style sequencing with dependable guest information built in.',
    bestFor: ['formal weddings', 'traditional weekends', 'classic hotel or ballroom events'],
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
    structureFocus: 'A balanced starting layout that can be refined after you add your own details.',
    bestFor: ['general wedding sites'],
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
