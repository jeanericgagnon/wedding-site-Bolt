import { SectionType } from '../types/layoutConfig';
import { resolveCanonicalRegistrySectionInput } from '../sections/registry';

const LEGACY_SELECTOR_VARIANTS: Record<SectionType, string[]> = {
  hero: ['default', 'minimal', 'fullbleed', 'countdown'],
  story: ['default', 'centered', 'split', 'timeline'],
  venue: ['default', 'card'],
  schedule: ['default', 'timeline', 'dayTabs'],
  travel: ['default', 'cards', 'localGuide'],
  registry: ['default', 'cards', 'grid', 'fundHighlight', 'featured', 'minimal', 'honeymoon', 'tabs', 'illustrated', 'classic', 'luxury', 'experiences', 'modern', 'playful'],
  rsvp: ['default', 'inline'],
  faq: ['default', 'accordion', 'iconGrid'],
  gallery: ['default', 'masonry'],
  countdown: ['default', 'banner'],
  'wedding-party': ['default', 'grid'],
  'dress-code': ['default', 'banner'],
  accommodations: ['default', 'cards'],
  contact: ['default', 'minimal'],
  'footer-cta': ['default', 'minimal'],
  custom: ['default'],
  quotes: ['default', 'carousel', 'grid', 'featured'],
  menu: ['default', 'tabs', 'card', 'simple'],
  music: ['default', 'playlist', 'setlist', 'compact'],
  directions: ['default', 'pin', 'split', 'card'],
  video: ['default', 'full', 'card', 'inline'],
};

const VARIANT_ALIASES: Partial<Record<SectionType, Record<string, string>>> = {
  hero: {
    editorial: 'fullbleed',
    fullscreen: 'fullbleed',
    stacked: 'default',
    invitation: 'default',
    split: 'default',
    classic: 'default',
    playful: 'default',
    dramatic: 'fullbleed',
  },
  story: {
    editorial: 'timeline',
    milestones: 'timeline',
    classic: 'default',
    playful: 'default',
    cinematic: 'timeline',
    narrative: 'timeline',
    twoColumn: 'split',
  },
  venue: {
    split: 'default',
    cinematic: 'default',
    classic: 'default',
    playful: 'default',
    cards: 'card',
    mapFirst: 'default',
    detailsFirst: 'card',
    splitMap: 'default',
    minimal: 'card',
  },
  schedule: {
    minimal: 'default',
    classic: 'default',
    playful: 'default',
    agendaCards: 'dayTabs',
    itinerary: 'timeline',
    program: 'default',
  },
  travel: {
    luxury: 'cards',
    classic: 'cards',
    destination: 'cards',
    compact: 'default',
    mapPins: 'localGuide',
    tiers: 'cards',
    hotelBlock: 'cards',
    thingsToDo: 'localGuide',
    splitAirHotel: 'cards',
    list: 'default',
  },
  registry: {
    classic: 'grid',
    luxury: 'fundHighlight',
    experiences: 'fundHighlight',
    modern: 'grid',
    playful: 'grid',
    cards: 'default',
    featured: 'fundHighlight',
    minimal: 'default',
    honeymoon: 'fundHighlight',
    tabs: 'default',
    illustrated: 'default',
  },
  rsvp: {
    form: 'default',
    extended: 'default',
    classic: 'default',
    playful: 'default',
    multiEvent: 'inline',
    formal: 'default',
  },
  faq: {
    compact: 'accordion',
  },
  gallery: {
    fullwidth: 'default',
    carousel: 'default',
    playful: 'default',
    classic: 'default',
    filmStrip: 'default',
    polaroid: 'masonry',
    grid: 'default',
  },
  countdown: {
    detailed: 'default',
    flip: 'default',
    elegant: 'default',
    playful: 'default',
    simple: 'default',
  },
  'wedding-party': {
    cards: 'default',
    polaroid: 'default',
    minimal: 'default',
    splitSides: 'default',
    storyBios: 'default',
    scroll: 'default',
  },
  'dress-code': {
    moodBoard: 'default',
    elegant: 'default',
  },
  accommodations: {
    list: 'default',
    cards: 'cards',
  },
  contact: {
    form: 'default',
    interactiveHub: 'default',
  },
  'footer-cta': {
    expanded: 'default',
    classic: 'default',
    playful: 'default',
    rsvpPush: 'default',
  },
};

const CANONICAL_VARIANT_ALIASES: Partial<Record<SectionType, Record<string, string>>> = {
  hero: {
    fullBleed: 'fullbleed',
  },
  story: {
    twoColumn: 'split',
  },
  venue: {
    mapFirst: 'default',
    splitMap: 'default',
    detailsFirst: 'card',
  },
  schedule: {
    agendaCards: 'dayTabs',
  },
  travel: {
    list: 'default',
    hotelBlock: 'cards',
    thingsToDo: 'localGuide',
    compact: 'default',
    tiers: 'cards',
    mapPins: 'localGuide',
    splitAirHotel: 'cards',
  },
  registry: {
    cards: 'cards',
    featured: 'featured',
  },
  rsvp: {
    multiEvent: 'inline',
  },
  faq: {
    accordion: 'accordion',
  },
  gallery: {
    masonry: 'masonry',
    grid: 'default',
    filmStrip: 'default',
    polaroid: 'masonry',
    carousel: 'default',
    spotlight: 'default',
    mosaic: 'default',
    categorized: 'default',
  },
  countdown: {
    simple: 'default',
  },
  'wedding-party': {
    storyBios: 'default',
    splitSides: 'default',
    scroll: 'default',
  },
  'dress-code': {
    moodBoard: 'default',
  },
  accommodations: {
    cards: 'cards',
  },
  contact: {
    form: 'default',
    interactiveHub: 'default',
  },
  'footer-cta': {
    rsvpPush: 'default',
  },
  quotes: {
    guestbook: 'featured',
  },
};

const normalizeVariantKey = (value: unknown) => typeof value === 'string'
  ? value.toLowerCase().replace(/[^a-z0-9]/g, '')
  : '';

function normalizeBuilderSectionType(type: SectionType): SectionType {
  return (normalizeVariantKey(type) === 'registrysection' ? 'registry' : type) as SectionType;
}

function getPreferredBuilderFallbackVariant(type: SectionType, supported: string[]): string {
  const normalizedType = normalizeBuilderSectionType(type);
  if (normalizedType === 'registry') return supported.includes('cards') ? 'cards' : supported[0] ?? 'default';
  return supported[0] ?? 'default';
}

export function resolveBuilderVariant(type: SectionType, variant: unknown): string {
  const normalizedType = normalizeBuilderSectionType(type);
  const supported = LEGACY_SELECTOR_VARIANTS[normalizedType] ?? ['default'];
  const fallbackVariant = getPreferredBuilderFallbackVariant(normalizedType, supported);
  const normalizedVariant = typeof variant === 'string' ? variant.trim() : '';
  const normalizedVariantKey = normalizeVariantKey(normalizedVariant);
  const supportedByKey = new Map(supported.map((supportedVariant) => [normalizeVariantKey(supportedVariant), supportedVariant]));
  const canonicalVariant = supportedByKey.get(normalizedVariantKey) ?? normalizedVariant;
  if (supported.includes(canonicalVariant)) return canonicalVariant;

  if (normalizedVariantKey) {
    const runtimeCanonicalVariant = resolveCanonicalRegistrySectionInput(normalizedType, normalizedVariant).variant;
    const runtimeAlias = CANONICAL_VARIANT_ALIASES[normalizedType]?.[runtimeCanonicalVariant];
    if (runtimeAlias) {
      const resolvedRuntimeAlias = supportedByKey.get(normalizeVariantKey(runtimeAlias))
        ?? (supported.includes(runtimeAlias) ? runtimeAlias : undefined);
      if (resolvedRuntimeAlias) return resolvedRuntimeAlias;
    }
  }

  const aliases = VARIANT_ALIASES[normalizedType] ?? {};
  const alias = aliases[canonicalVariant]
    ?? aliases[normalizedVariant]
    ?? Object.entries(aliases).find(([aliasVariant]) => normalizeVariantKey(aliasVariant) === normalizedVariantKey)?.[1];
  if (!alias) return fallbackVariant;

  return supportedByKey.get(normalizeVariantKey(alias)) ?? (supported.includes(alias) ? alias : fallbackVariant);
}
