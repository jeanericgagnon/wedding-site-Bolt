import { SectionDefinition, parseSectionData } from './types';
import { heroFullBleedDefinition } from './variants/hero/fullBleed';
import { storyTwoColumnDefinition } from './variants/story/twoColumn';
import { venueCardDefinition } from './variants/venue/card';
import { venueMapFirstDefinition } from './variants/venue/mapFirst';
import { venueSplitMapDefinition } from './variants/venue/splitMap';
import { venueDetailsFirstDefinition } from './variants/venue/detailsFirst';
import { scheduleTimelineDefinition } from './variants/schedule/timeline';
import { scheduleDayTabsDefinition } from './variants/schedule/dayTabs';
import { scheduleAgendaCardsDefinition } from './variants/schedule/agendaCards';
import { travelListDefinition } from './variants/travel/list';
import { travelHotelBlockDefinition } from './variants/travel/hotelBlock';
import { travelThingsToDoDefinition } from './variants/travel/thingsToDo';
import { travelLocalGuideDefinition } from './variants/travel/localGuide';
import { travelCompactDefinition } from './variants/travel/compact';
import { travelTiersDefinition } from './variants/travel/tiers';
import { travelMapPinsDefinition } from './variants/travel/mapPins';
import { travelSplitAirHotelDefinition } from './variants/travel/splitAirHotel';
import { registryCardsDefinition } from './variants/registry/cards';
import { registryFeaturedDefinition } from './variants/registry/featured';
import { faqAccordionDefinition } from './variants/faq/accordion';
import { rsvpMultiEventDefinition } from './variants/rsvp/multiEvent';
import { galleryMasonryDefinition } from './variants/gallery/masonry';
import { galleryGridDefinition } from './variants/gallery/grid';
import { galleryFilmStripDefinition } from './variants/gallery/filmStrip';
import { galleryPolaroidDefinition } from './variants/gallery/polaroid';
import { galleryCarouselDefinition } from './variants/gallery/carousel';
import { gallerySpotlightDefinition } from './variants/gallery/spotlight';
import { galleryMosaicDefinition } from './variants/gallery/mosaic';
import { galleryCategorizedDefinition } from './variants/gallery/categorized';
import { countdownSimpleDefinition } from './variants/countdown/simple';
import { weddingPartyGridDefinition } from './variants/weddingParty/grid';
import { weddingPartyStoryBiosDefinition } from './variants/weddingParty/storyBios';
import { weddingPartyMinimalDefinition } from './variants/weddingParty/minimal';
import { weddingPartySplitSidesDefinition } from './variants/weddingParty/splitSides';
import { weddingPartyScrollDefinition } from './variants/weddingParty/scroll';
import { dressCodeMoodBoardDefinition } from './variants/dressCode/moodBoard';
import { accommodationsCardsDefinition } from './variants/accommodations/cards';
import { contactFormDefinition } from './variants/contact/form';
import { contactInteractiveHubDefinition } from './variants/contact/interactiveHub';
import { footerCtaRsvpPushDefinition } from './variants/footerCta/rsvpPush';
import { customSectionDefinition } from './variants/custom/customSection';
import { quotesCarouselDefinition } from './variants/quotes/carousel';
import { quotesGridDefinition } from './variants/quotes/grid';
import { quotesFeaturedDefinition } from './variants/quotes/featured';
import { quotesGuestbookDefinition } from './variants/quotes/guestbook';
import { menuTabsDefinition } from './variants/menu/tabs';
import { menuCardDefinition } from './variants/menu/card';
import { menuSimpleDefinition } from './variants/menu/simple';
import { musicPlaylistDefinition } from './variants/music/playlist';
import { musicSetlistDefinition } from './variants/music/setlist';
import { musicCompactDefinition } from './variants/music/compact';
import { directionsPinDefinition } from './variants/directions/pin';
import { directionsSplitDefinition } from './variants/directions/split';
import { directionsCardDefinition } from './variants/directions/card';
import { videoFullDefinition } from './variants/video/full';
import { videoCardDefinition } from './variants/video/card';
import { videoInlineDefinition } from './variants/video/inline';

type RegistryKey = string;

const SECTION_REGISTRY = new Map<RegistryKey, SectionDefinition>();

const VARIANT_FALLBACKS: Record<string, Record<string, string>> = {
  hero: {
    editorial: 'fullBleed',
    artistic: 'fullBleed',
    fullscreen: 'fullBleed',
    stacked: 'fullBleed',
    split: 'fullBleed',
    playful: 'fullBleed',
    classic: 'fullBleed',
    coastal: 'fullBleed',
    garden: 'fullBleed',
    centered: 'fullBleed',
    modern: 'fullBleed',
    luxury: 'fullBleed',
    elegant: 'fullBleed',
    minimal: 'fullBleed',
    magazine: 'fullBleed',
    bold: 'fullBleed',
    floating: 'fullBleed',
    layered: 'fullBleed',
    moody: 'fullBleed',
    refined: 'fullBleed',
  },
  story: {
    editorial: 'twoColumn',
    cards: 'twoColumn',
    classic: 'twoColumn',
    modern: 'twoColumn',
    playful: 'twoColumn',
    luxury: 'twoColumn',
    elegant: 'twoColumn',
    split: 'twoColumn',
    timeline: 'twoColumn',
    compact: 'twoColumn',
    minimal: 'twoColumn',
    bold: 'twoColumn',
    immersive: 'twoColumn',
    magazine: 'twoColumn',
  },
  gallery: {
    fullwidth: 'filmStrip',
    classic: 'grid',
    modern: 'masonry',
    playful: 'polaroid',
    luxury: 'spotlight',
    elegant: 'masonry',
    minimal: 'grid',
    bold: 'spotlight',
    split: 'mosaic',
    timeline: 'categorized',
  },
  venue: {
    banner: 'splitMap',
    stacked: 'detailsFirst',
    minimal: 'card',
    split: 'splitMap',
    cinematic: 'splitMap',
    classic: 'card',
    cards: 'card',
    modern: 'splitMap',
    luxury: 'detailsFirst',
    playfull: 'card',
    playful: 'card',
    garden: 'card',
    artistic: 'splitMap',
    bold: 'splitMap',
    compact: 'card',
    immersive: 'splitMap',
    magazine: 'splitMap',
    refined: 'detailsFirst',
    timeline: 'detailsFirst',
  },
  schedule: {
    minimal: 'agendaCards',
    classic: 'timeline',
    cards: 'agendaCards',
    modern: 'dayTabs',
    playful: 'dayTabs',
    luxury: 'timeline',
    itinerary: 'timeline',
    vertical: 'timeline',
    detailed: 'agendaCards',
    elegant: 'timeline',
    flip: 'dayTabs',
    bold: 'dayTabs',
    compact: 'agendaCards',
    program: 'timeline',
  },
  rsvp: {
    form: 'multiEvent',
    classic: 'multiEvent',
    modern: 'multiEvent',
    playful: 'multiEvent',
    luxury: 'multiEvent',
    extended: 'multiEvent',
    minimal: 'multiEvent',
    bold: 'multiEvent',
    elegant: 'multiEvent',
    quick: 'multiEvent',
  },
  travel: {
    map: 'splitAirHotel',
    classic: 'list',
    modern: 'localGuide',
    luxury: 'hotelBlock',
    cards: 'tiers',
    minimal: 'compact',
    playful: 'thingsToDo',
    split: 'splitAirHotel',
  },
  faq: {
    grid: 'accordion',
    categorized: 'accordion',
    luxury: 'accordion',
    minimal: 'accordion',
    modern: 'accordion',
    playful: 'accordion',
    tabbed: 'accordion',
  },
  footer: {
    classic: 'rsvpPush',
    elegant: 'rsvpPush',
    modern: 'rsvpPush',
    expanded: 'rsvpPush',
    minimal: 'rsvpPush',
    playful: 'rsvpPush',
    luxury: 'rsvpPush',
  },
  'footer-cta': {
    classic: 'rsvpPush',
    elegant: 'rsvpPush',
    modern: 'rsvpPush',
    expanded: 'rsvpPush',
    minimal: 'rsvpPush',
    playful: 'rsvpPush',
    luxury: 'rsvpPush',
    bold: 'rsvpPush',
  },
  directions: {
    illustrated: 'split',
    multiVenue: 'split',
    transport: 'pin',
    fromHotel: 'pin',
  },
  registry: {
    default: 'cards',
    grid: 'cards',
    fundHighlight: 'featured',
    honeymoon: 'featured',
    tabs: 'cards',
    illustrated: 'cards',
    minimal: 'cards',
    classic: 'cards',
    luxury: 'featured',
    experiences: 'featured',
    modern: 'cards',
    playful: 'cards',
  },
  countdown: {
    detailed: 'simple',
    flip: 'simple',
    elegant: 'simple',
    playful: 'simple',
    classic: 'simple',
    modern: 'simple',
    luxury: 'simple',
    bold: 'simple',
    compact: 'simple',
    floating: 'simple',
    minimal: 'simple',
    progress: 'simple',
  },
  'wedding-party': {
    luxury: 'grid',
    polaroid: 'grid',
    classic: 'grid',
    modern: 'grid',
    artistic: 'grid',
    cards: 'grid',
    filmstrip: 'scroll',
    grid: 'grid',
    magazine: 'storyBios',
    minimal: 'minimal',
  },
  'dress-code': {
    cards: 'moodBoard',
    classic: 'moodBoard',
    creative: 'moodBoard',
    elegant: 'moodBoard',
    luxury: 'moodBoard',
    minimal: 'moodBoard',
    modern: 'moodBoard',
    playful: 'moodBoard',
  },
  accommodations: {
    showcase: 'cards',
    classic: 'cards',
    luxury: 'cards',
    minimal: 'cards',
    modern: 'cards',
  },
};

function makeKey(type: string, variant: string): RegistryKey {
  return `${type}::${variant}`;
}

function normalizeRegistryVariantKey(variant: unknown): string {
  return typeof variant === 'string'
    ? variant.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

function isRegistrySectionType(type: unknown): boolean {
  if (typeof type !== 'string') return false;
  const normalizedType = normalizeRegistryVariantKey(type);
  return normalizedType === 'registry' || normalizedType.startsWith('registrysection');
}

function normalizeRegistrySectionType(type: unknown): string {
  if (isRegistrySectionType(type)) return 'registry';
  const normalizedTypeKey = normalizeRegistryVariantKey(type);
  if (!normalizedTypeKey) return '';

  const directSectionType = getAllDefinitions().find((definition) => normalizeRegistryVariantKey(definition.type) === normalizedTypeKey)?.type;
  return directSectionType ?? (typeof type === 'string' ? type.trim().toLowerCase() : '');
}

export function resolveCanonicalRegistrySectionType(type: unknown): string {
  return normalizeRegistrySectionType(type);
}

function resolveRegistryVariant(type: string, variant: unknown): string {
  if (!isRegistrySectionType(type)) return typeof variant === 'string' ? variant : '';
  const canonicalVariant = resolveCanonicalSectionVariantForType('registry', 'registry', variant);
  return getAllDefinitions().some((definition) => definition.type === 'registry' && definition.variant === canonicalVariant)
    ? canonicalVariant
    : 'cards';
}

export function resolveCanonicalRegistryVariant(variant: unknown): string {
  return resolveRegistryVariant('registry', variant) || 'cards';
}

function getVariantFallbacksForType(type: string, inputType?: string): Record<string, string> {
  return VARIANT_FALLBACKS[type]
    ?? (inputType ? VARIANT_FALLBACKS[inputType] : undefined)
    ?? Object.entries(VARIANT_FALLBACKS).find(([candidateType]) => normalizeRegistryVariantKey(candidateType) === normalizeRegistryVariantKey(inputType ?? type))?.[1]
    ?? {};
}

function getCanonicalSectionFallbackVariant(type: string, inputType: string, variant: string): string | null {
  return Object.entries(getVariantFallbacksForType(type, inputType)).find(([alias]) => normalizeRegistryVariantKey(alias) === normalizeRegistryVariantKey(variant))?.[1] ?? null;
}

function getDefaultVariantForType(type: string): string | undefined {
  const definitionsForType = getAllDefinitions().filter((definition) => definition.type === type);
  return definitionsForType.find((definition) => definition.variant === 'default')?.variant ?? definitionsForType[0]?.variant;
}

function resolveCanonicalSectionVariantForType(type: string, inputType: string, variant: unknown): string {
  const normalizedVariantKey = normalizeRegistryVariantKey(variant);
  const defaultVariant = getDefaultVariantForType(type);
  if (!normalizedVariantKey) {
    return defaultVariant ?? (typeof variant === 'string' ? variant : '');
  }

  const directVariant = getAllDefinitions()
    .filter((definition) => definition.type === type)
    .find((definition) => normalizeRegistryVariantKey(definition.variant) === normalizedVariantKey)?.variant;
  if (directVariant) return directVariant;

  return getCanonicalSectionFallbackVariant(type, inputType, normalizedVariantKey)
    ?? defaultVariant
    ?? (typeof variant === 'string' ? variant : '');
}

export function resolveCanonicalRegistrySectionInput(type: unknown, variant: unknown): { type: string; variant: string } {
  const canonicalType = resolveCanonicalRegistrySectionType(type);
  if (canonicalType !== 'registry') {
    const normalizedType = normalizeRegistrySectionType(type);
    const normalizedInputType = typeof type === 'string' ? type.trim().toLowerCase() : '';
    return {
      type: normalizedType,
      variant: resolveCanonicalSectionVariantForType(normalizedType, normalizedInputType, variant),
    };
  }

  return {
    type: canonicalType,
    variant: resolveCanonicalRegistryVariant(variant),
  };
}

function registerDefinition<T extends Record<string, unknown>>(def: SectionDefinition<T>): void {
  SECTION_REGISTRY.set(
    makeKey(def.type, def.variant),
    def as unknown as SectionDefinition<Record<string, unknown>>,
  );
}

function cloneSectionDefinitionValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneSectionDefinition(definition: SectionDefinition): SectionDefinition {
  return {
    ...definition,
    defaultData: cloneSectionDefinitionValue(definition.defaultData),
  };
}

function getCanonicalSectionDefinition(type: string, variant: string): SectionDefinition | null {
  return SECTION_REGISTRY.get(makeKey(type, variant)) ?? null;
}

registerDefinition(heroFullBleedDefinition);
registerDefinition(storyTwoColumnDefinition);
registerDefinition(venueCardDefinition);
registerDefinition(venueMapFirstDefinition);
registerDefinition(venueSplitMapDefinition);
registerDefinition(venueDetailsFirstDefinition);
registerDefinition(scheduleTimelineDefinition);
registerDefinition(scheduleDayTabsDefinition);
registerDefinition(scheduleAgendaCardsDefinition);
registerDefinition(travelListDefinition);
registerDefinition(travelHotelBlockDefinition);
registerDefinition(travelThingsToDoDefinition);
registerDefinition(travelLocalGuideDefinition);
registerDefinition(travelCompactDefinition);
registerDefinition(travelTiersDefinition);
registerDefinition(travelMapPinsDefinition);
registerDefinition(travelSplitAirHotelDefinition);
registerDefinition(registryCardsDefinition);
registerDefinition(registryFeaturedDefinition);
registerDefinition(faqAccordionDefinition);
registerDefinition(rsvpMultiEventDefinition);
registerDefinition(galleryMasonryDefinition);
registerDefinition(galleryGridDefinition);
registerDefinition(galleryFilmStripDefinition);
registerDefinition(galleryPolaroidDefinition);
registerDefinition(galleryCarouselDefinition);
registerDefinition(gallerySpotlightDefinition);
registerDefinition(galleryMosaicDefinition);
registerDefinition(galleryCategorizedDefinition);
registerDefinition(countdownSimpleDefinition);
registerDefinition(weddingPartyGridDefinition);
registerDefinition(weddingPartyStoryBiosDefinition);
registerDefinition(weddingPartyMinimalDefinition);
registerDefinition(weddingPartySplitSidesDefinition);
registerDefinition(weddingPartyScrollDefinition);
registerDefinition(dressCodeMoodBoardDefinition);
registerDefinition(accommodationsCardsDefinition);
registerDefinition(contactFormDefinition);
registerDefinition(contactInteractiveHubDefinition);
registerDefinition(footerCtaRsvpPushDefinition);
registerDefinition(customSectionDefinition);
registerDefinition(quotesCarouselDefinition);
registerDefinition(quotesGridDefinition);
registerDefinition(quotesFeaturedDefinition);
registerDefinition(quotesGuestbookDefinition);
registerDefinition(menuTabsDefinition);
registerDefinition(menuCardDefinition);
registerDefinition(menuSimpleDefinition);
registerDefinition(musicPlaylistDefinition);
registerDefinition(musicSetlistDefinition);
registerDefinition(musicCompactDefinition);
registerDefinition(directionsPinDefinition);
registerDefinition(directionsSplitDefinition);
registerDefinition(directionsCardDefinition);
registerDefinition(videoFullDefinition);
registerDefinition(videoCardDefinition);
registerDefinition(videoInlineDefinition);

export function getDefinition(type: string, variant: unknown): SectionDefinition | null {
  const canonicalSection = resolveCanonicalRegistrySectionInput(type, variant);
  const definition = getCanonicalSectionDefinition(canonicalSection.type, canonicalSection.variant);
  return definition ? cloneSectionDefinition(definition) : null;
}

export function getDefinitionOrThrow(type: string, variant: unknown): SectionDefinition {
  const canonicalSection = resolveCanonicalRegistrySectionInput(type, variant);
  const def = getDefinition(type, variant);
  if (!def) throw new Error(`No section definition for ${canonicalSection.type}::${canonicalSection.variant}`);
  return def;
}

export function getAllDefinitions(): SectionDefinition[] {
  return Array.from(SECTION_REGISTRY.values()).map(cloneSectionDefinition);
}

export function getVariantsForType(type: string): SectionDefinition[] {
  const normalizedType = resolveCanonicalRegistrySectionInput(type, undefined).type || normalizeRegistrySectionType(type);
  return getAllDefinitions().filter(d => d.type === normalizedType);
}

export function resolveAndParse(
  type: string,
  variant: unknown,
  rawData: Record<string, unknown>,
  options?: { strictVariant?: boolean }
): { def: SectionDefinition; parsedData: Record<string, unknown> } | null {
  const strictVariant = options?.strictVariant === true;
  const canonicalSection = resolveCanonicalRegistrySectionInput(type, variant);
  const normalizedTypeKey = normalizeRegistrySectionType(canonicalSection.type);
  const normalizedType = ({
    'footer-cta': 'footerCta',
    'wedding-party': 'weddingParty',
    'dress-code': 'dressCode',
    'registry-section': 'registry',
  } as Record<string, string>)[normalizedTypeKey] ?? normalizedTypeKey;
  const normalizedVariant = canonicalSection.variant;
  const fallbackVariant = getCanonicalSectionFallbackVariant(canonicalSection.type, normalizedType, normalizedVariant);

  const def = strictVariant
    ? (
      getDefinition(normalizedType, normalizedVariant)
      ?? (fallbackVariant ? getDefinition(normalizedType, fallbackVariant) : null)
      ?? null
    )
    : (
      getDefinition(normalizedType, normalizedVariant)
      ?? (fallbackVariant ? getDefinition(normalizedType, fallbackVariant) : null)
      ?? (() => {
        const defaultVariant = getDefaultVariantForType(normalizedType);
        return defaultVariant ? getDefinition(normalizedType, defaultVariant) : null;
      })()
      ?? null
    );

  if (!def) return null;
  const parsedData = parseSectionData(def.schema, rawData, def.defaultData) as Record<string, unknown>;
  return { def, parsedData };
}

export type { SectionDefinition };
