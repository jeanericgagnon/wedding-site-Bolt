import { SectionDefinition, parseSectionData } from './types';
import {
  heroBotanicalDefinition,
  heroCountdownDefinition,
  heroFullBleedDefinition,
  heroInvitationDefinition,
  heroMinimalDefinition,
  heroSplitDefinition,
  heroVideoDefinition,
} from './variants/hero/fullBleed';
import {
  storyCenteredDefinition,
  storyChaptersDefinition,
  storyDuoColumnDefinition,
  storyMilestonesDefinition,
  storySplitDefinition,
  storyTimelineDefinition,
  storyTwoColumnDefinition,
} from './variants/story/twoColumn';
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
import {
  faqAccordionDefinition,
  faqChatDefinition,
  faqDefaultDefinition,
  faqIconGridDefinition,
  faqNumberedDefinition,
  faqTabbedDefinition,
  faqTwoColumnDefinition,
} from './variants/faq/accordion';
import {
  rsvpCardDefinition,
  rsvpDefaultDefinition,
  rsvpFormalDefinition,
  rsvpIllustratedDefinition,
  rsvpInlineDefinition,
  rsvpMultiEventDefinition,
} from './variants/rsvp/multiEvent';
import { galleryMasonryDefinition } from './variants/gallery/masonry';
import { galleryGridDefinition } from './variants/gallery/grid';
import { galleryFilmStripDefinition } from './variants/gallery/filmStrip';
import { galleryPolaroidDefinition } from './variants/gallery/polaroid';
import { galleryCarouselDefinition } from './variants/gallery/carousel';
import { gallerySpotlightDefinition } from './variants/gallery/spotlight';
import { galleryMosaicDefinition } from './variants/gallery/mosaic';
import { galleryCategorizedDefinition } from './variants/gallery/categorized';
import {
  countdownBannerDefinition,
  countdownDarkDefinition,
  countdownFloatingDefinition,
  countdownMinimalDefinition,
  countdownPhotoDefinition,
  countdownProgressDefinition,
  countdownRingsDefinition,
  countdownSimpleDefinition,
} from './variants/countdown/simple';
import { weddingPartyGridDefinition } from './variants/weddingParty/grid';
import { weddingPartyStoryBiosDefinition } from './variants/weddingParty/storyBios';
import { weddingPartyMinimalDefinition } from './variants/weddingParty/minimal';
import { weddingPartySplitSidesDefinition } from './variants/weddingParty/splitSides';
import { weddingPartyScrollDefinition } from './variants/weddingParty/scroll';
import {
  dressCodeBannerDefinition,
  dressCodeCardDefinition,
  dressCodeIllustratedDefinition,
  dressCodeMoodBoardDefinition,
  dressCodePaletteDefinition,
  dressCodeScaleDefinition,
} from './variants/dressCode/moodBoard';
import {
  accommodationsCardsDefinition,
  accommodationsFaqStyleDefinition,
  accommodationsFeaturedDefinition,
  accommodationsListDefinition,
  accommodationsMapListDefinition,
  accommodationsOnSiteDefinition,
} from './variants/accommodations/cards';
import { contactFormDefinition } from './variants/contact/form';
import { contactInteractiveHubDefinition } from './variants/contact/interactiveHub';
import {
  footerCtaCountdownDefinition,
  footerCtaDefaultDefinition,
  footerCtaHashtagDefinition,
  footerCtaMinimalDefinition,
  footerCtaMonogramDefinition,
  footerCtaPhotoDefinition,
  footerCtaRsvpPushDefinition,
} from './variants/footerCta/rsvpPush';
import { customSectionDefinition } from './variants/custom/customSection';
import { quotesCarouselDefinition } from './variants/quotes/carousel';
import { quotesGridDefinition } from './variants/quotes/grid';
import { quotesFeaturedDefinition } from './variants/quotes/featured';
import { quotesGuestbookDefinition } from './variants/quotes/guestbook';
import { menuTabsDefinition } from './variants/menu/tabs';
import { menuCardDefinition, menuCocktailDinnerDefinition } from './variants/menu/card';
import { menuIllustratedDefinition, menuPrintedDefinition, menuSimpleDefinition } from './variants/menu/simple';
import { musicPlaylistDefinition } from './variants/music/playlist';
import { musicSetlistDefinition } from './variants/music/setlist';
import { musicCompactDefinition } from './variants/music/compact';
import { musicRequestFormDefinition } from './variants/music/requestForm';
import { directionsPinDefinition } from './variants/directions/pin';
import { directionsSplitDefinition } from './variants/directions/split';
import { directionsCardDefinition } from './variants/directions/card';
import { videoBackgroundDefinition, videoFullDefinition, videoLightboxDefinition, videoReelDefinition } from './variants/video/full';
import { videoCardDefinition } from './variants/video/card';
import { videoInlineDefinition } from './variants/video/inline';

type RegistryKey = string;

const SECTION_REGISTRY = new Map<RegistryKey, SectionDefinition<any>>();

const VARIANT_FALLBACKS: Record<string, Record<string, string>> = {
  hero: {
    default: 'fullBleed',
    editorial: 'fullBleed',
    artistic: 'fullBleed',
    fullscreen: 'fullBleed',
    fullbleed: 'fullBleed',
    stacked: 'invitation',
    split: 'split',
    playful: 'botanical',
    classic: 'invitation',
    coastal: 'fullBleed',
    garden: 'botanical',
    centered: 'minimal',
    modern: 'split',
    luxury: 'split',
    elegant: 'invitation',
    minimal: 'minimal',
    magazine: 'split',
    bold: 'countdown',
    floating: 'fullBleed',
    layered: 'split',
    moody: 'video',
    refined: 'invitation',
    botanical: 'botanical',
    invitation: 'invitation',
    video: 'video',
    countdown: 'countdown',
  },
  story: {
    default: 'twoColumn',
    editorial: 'centered',
    cards: 'chapters',
    classic: 'twoColumn',
    modern: 'split',
    playful: 'milestones',
    luxury: 'split',
    elegant: 'twoColumn',
    split: 'split',
    timeline: 'timeline',
    compact: 'centered',
    minimal: 'centered',
    bold: 'duoColumn',
    immersive: 'chapters',
    magazine: 'chapters',
    centered: 'centered',
    chapters: 'chapters',
    duocolumn: 'duoColumn',
    milestones: 'milestones',
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
    default: 'default',
    form: 'multiEvent',
    classic: 'formal',
    modern: 'inline',
    playful: 'illustrated',
    luxury: 'card',
    extended: 'multiEvent',
    minimal: 'inline',
    bold: 'card',
    elegant: 'formal',
    quick: 'inline',
    card: 'card',
    illustrated: 'illustrated',
    formal: 'formal',
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
    default: 'default',
    grid: 'iconGrid',
    categorized: 'accordion',
    luxury: 'accordion',
    minimal: 'default',
    modern: 'twoColumn',
    playful: 'chat',
    tabbed: 'tabbed',
    icongrid: 'iconGrid',
    twocolumn: 'twoColumn',
    chat: 'chat',
    numbered: 'numbered',
  },
  footer: {
    default: 'default',
    classic: 'rsvpPush',
    elegant: 'monogram',
    modern: 'minimal',
    expanded: 'hashtag',
    minimal: 'minimal',
    playful: 'hashtag',
    luxury: 'photo',
  },
  'footer-cta': {
    default: 'default',
    classic: 'rsvpPush',
    elegant: 'monogram',
    modern: 'minimal',
    expanded: 'hashtag',
    minimal: 'minimal',
    playful: 'hashtag',
    luxury: 'photo',
    bold: 'rsvpPush',
    monogram: 'monogram',
    hashtag: 'hashtag',
    photo: 'photo',
    countdown: 'countdown',
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
    default: 'simple',
    detailed: 'rings',
    flip: 'rings',
    elegant: 'photo',
    playful: 'floating',
    classic: 'simple',
    modern: 'banner',
    luxury: 'photo',
    bold: 'dark',
    compact: 'banner',
    floating: 'floating',
    minimal: 'minimal',
    progress: 'progress',
    banner: 'banner',
    rings: 'rings',
    dark: 'dark',
    photo: 'photo',
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
    default: 'moodBoard',
    classic: 'card',
    creative: 'illustrated',
    elegant: 'palette',
    luxury: 'moodBoard',
    minimal: 'banner',
    modern: 'scale',
    playful: 'illustrated',
    banner: 'banner',
    palette: 'palette',
    illustrated: 'illustrated',
    card: 'card',
    scale: 'scale',
  },
  accommodations: {
    default: 'list',
    showcase: 'featured',
    classic: 'cards',
    luxury: 'featured',
    minimal: 'list',
    modern: 'mapList',
    cards: 'cards',
    featured: 'featured',
    maplist: 'mapList',
    faqstyle: 'faqStyle',
    onsite: 'onSite',
  },
  menu: {
    default: 'tabs',
    tabs: 'tabs',
    card: 'card',
    cards: 'card',
    simple: 'simple',
    printed: 'printed',
    cocktaildinner: 'cocktailDinner',
    illustrated: 'illustrated',
    modern: 'tabs',
    classic: 'printed',
    luxury: 'card',
    playful: 'illustrated',
  },
  video: {
    default: 'full',
    full: 'full',
    card: 'card',
    cards: 'card',
    inline: 'inline',
    background: 'background',
    lightbox: 'lightbox',
    reel: 'reel',
    modern: 'inline',
    luxury: 'full',
    playful: 'reel',
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

function registerDefinition<T>(def: SectionDefinition<T>): void {
  SECTION_REGISTRY.set(makeKey(def.type, def.variant), def as SectionDefinition<any>);
}

function cloneSectionDefinitionValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneSectionDefinitionValue(entry)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, cloneSectionDefinitionValue(entry)]),
    ) as T;
  }
  return value;
}

function cloneSectionDefinition<T>(def: SectionDefinition<T>): SectionDefinition<T> {
  return {
    ...def,
    defaultData: cloneSectionDefinitionValue(def.defaultData),
  };
}

registerDefinition(heroFullBleedDefinition);
registerDefinition(heroMinimalDefinition);
registerDefinition(heroSplitDefinition);
registerDefinition(heroInvitationDefinition);
registerDefinition(heroBotanicalDefinition);
registerDefinition(heroCountdownDefinition);
registerDefinition(heroVideoDefinition);
registerDefinition(storyTwoColumnDefinition);
registerDefinition(storyCenteredDefinition);
registerDefinition(storySplitDefinition);
registerDefinition(storyTimelineDefinition);
registerDefinition(storyChaptersDefinition);
registerDefinition(storyDuoColumnDefinition);
registerDefinition(storyMilestonesDefinition);
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
registerDefinition(faqDefaultDefinition);
registerDefinition(faqIconGridDefinition);
registerDefinition(faqTwoColumnDefinition);
registerDefinition(faqTabbedDefinition);
registerDefinition(faqChatDefinition);
registerDefinition(faqNumberedDefinition);
registerDefinition(rsvpDefaultDefinition);
registerDefinition(rsvpMultiEventDefinition);
registerDefinition(rsvpInlineDefinition);
registerDefinition(rsvpCardDefinition);
registerDefinition(rsvpIllustratedDefinition);
registerDefinition(rsvpFormalDefinition);
registerDefinition(galleryMasonryDefinition);
registerDefinition(galleryGridDefinition);
registerDefinition(galleryFilmStripDefinition);
registerDefinition(galleryPolaroidDefinition);
registerDefinition(galleryCarouselDefinition);
registerDefinition(gallerySpotlightDefinition);
registerDefinition(galleryMosaicDefinition);
registerDefinition(galleryCategorizedDefinition);
registerDefinition(countdownSimpleDefinition);
registerDefinition(countdownBannerDefinition);
registerDefinition(countdownRingsDefinition);
registerDefinition(countdownMinimalDefinition);
registerDefinition(countdownDarkDefinition);
registerDefinition(countdownPhotoDefinition);
registerDefinition(countdownProgressDefinition);
registerDefinition(countdownFloatingDefinition);
registerDefinition(weddingPartyGridDefinition);
registerDefinition(weddingPartyStoryBiosDefinition);
registerDefinition(weddingPartyMinimalDefinition);
registerDefinition(weddingPartySplitSidesDefinition);
registerDefinition(weddingPartyScrollDefinition);
registerDefinition(dressCodeMoodBoardDefinition);
registerDefinition(dressCodeBannerDefinition);
registerDefinition(dressCodePaletteDefinition);
registerDefinition(dressCodeIllustratedDefinition);
registerDefinition(dressCodeCardDefinition);
registerDefinition(dressCodeScaleDefinition);
registerDefinition(accommodationsCardsDefinition);
registerDefinition(accommodationsListDefinition);
registerDefinition(accommodationsFeaturedDefinition);
registerDefinition(accommodationsMapListDefinition);
registerDefinition(accommodationsFaqStyleDefinition);
registerDefinition(accommodationsOnSiteDefinition);
registerDefinition(contactFormDefinition);
registerDefinition(contactInteractiveHubDefinition);
registerDefinition(footerCtaRsvpPushDefinition);
registerDefinition(footerCtaDefaultDefinition);
registerDefinition(footerCtaMinimalDefinition);
registerDefinition(footerCtaMonogramDefinition);
registerDefinition(footerCtaHashtagDefinition);
registerDefinition(footerCtaPhotoDefinition);
registerDefinition(footerCtaCountdownDefinition);
registerDefinition(customSectionDefinition);
registerDefinition(quotesCarouselDefinition);
registerDefinition(quotesGridDefinition);
registerDefinition(quotesFeaturedDefinition);
registerDefinition(quotesGuestbookDefinition);
registerDefinition(menuTabsDefinition);
registerDefinition(menuCardDefinition);
registerDefinition(menuCocktailDinnerDefinition);
registerDefinition(menuSimpleDefinition);
registerDefinition(menuPrintedDefinition);
registerDefinition(menuIllustratedDefinition);
registerDefinition(musicPlaylistDefinition);
registerDefinition(musicSetlistDefinition);
registerDefinition(musicCompactDefinition);
registerDefinition(musicRequestFormDefinition);
registerDefinition(directionsPinDefinition);
registerDefinition(directionsSplitDefinition);
registerDefinition(directionsCardDefinition);
registerDefinition(videoFullDefinition);
registerDefinition(videoBackgroundDefinition);
registerDefinition(videoLightboxDefinition);
registerDefinition(videoReelDefinition);
registerDefinition(videoCardDefinition);
registerDefinition(videoInlineDefinition);

export function getDefinition(type: string, variant: unknown): SectionDefinition | null;
export function getDefinition(type: unknown, variant: unknown): SectionDefinition | null;
// Source-proof guard: export function getDefinition(type: string, variant: unknown): SectionDefinition | null {
export function getDefinition(type: unknown, variant: unknown): SectionDefinition | null {
  const canonicalSection = resolveCanonicalRegistrySectionInput(type, variant);
  if (!canonicalSection.type) return null;
  return getCanonicalSectionDefinition(canonicalSection.type, canonicalSection.variant);
}

function getCanonicalSectionDefinition(type: string, variant: string): SectionDefinition | null {
  const def = SECTION_REGISTRY.get(makeKey(type, variant));
  return def ? cloneSectionDefinition(def) : null;
}

export function getDefinitionOrThrow(type: string, variant: unknown): SectionDefinition;
// Source-proof guard: export function getDefinitionOrThrow(type: string, variant: unknown): SectionDefinition {
export function getDefinitionOrThrow(type: unknown, variant: unknown): SectionDefinition {
  const canonicalSection = resolveCanonicalRegistrySectionInput(type, variant);
  const def = getDefinition(type, variant);
  if (!def) throw new Error(`No section definition for ${canonicalSection.type}::${canonicalSection.variant}`);
  return def;
}

export function getAllDefinitions(): SectionDefinition[] {
  return Array.from(SECTION_REGISTRY.values()).map((definition) => cloneSectionDefinition(definition));
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
