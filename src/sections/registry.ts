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
import { registryCardsDefinition } from './variants/registry/cards';
import { registryFeaturedDefinition } from './variants/registry/featured';
import { faqAccordionDefinition } from './variants/faq/accordion';
import { rsvpMultiEventDefinition } from './variants/rsvp/multiEvent';
import { galleryMasonryDefinition } from './variants/gallery/masonry';
import { galleryGridDefinition } from './variants/gallery/grid';
import { galleryFilmStripDefinition } from './variants/gallery/filmStrip';
import { galleryPolaroidDefinition } from './variants/gallery/polaroid';
import { countdownSimpleDefinition } from './variants/countdown/simple';
import { weddingPartyGridDefinition } from './variants/weddingParty/grid';
import { dressCodeMoodBoardDefinition } from './variants/dressCode/moodBoard';
import { accommodationsCardsDefinition } from './variants/accommodations/cards';
import { contactFormDefinition } from './variants/contact/form';
import { footerCtaRsvpPushDefinition } from './variants/footerCta/rsvpPush';
import { customSectionDefinition } from './variants/custom/customSection';
import { quotesCarouselDefinition } from './variants/quotes/carousel';
import { quotesGridDefinition } from './variants/quotes/grid';
import { quotesFeaturedDefinition } from './variants/quotes/featured';
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

function makeKey(type: string, variant: string): RegistryKey {
  return `${type}::${variant}`;
}

function registerDefinition(def: SectionDefinition): void {
  SECTION_REGISTRY.set(makeKey(def.type, def.variant), def);
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
registerDefinition(registryCardsDefinition);
registerDefinition(registryFeaturedDefinition);
registerDefinition(faqAccordionDefinition);
registerDefinition(rsvpMultiEventDefinition);
registerDefinition(galleryMasonryDefinition);
registerDefinition(galleryGridDefinition);
registerDefinition(galleryFilmStripDefinition);
registerDefinition(galleryPolaroidDefinition);
registerDefinition(countdownSimpleDefinition);
registerDefinition(weddingPartyGridDefinition);
registerDefinition(dressCodeMoodBoardDefinition);
registerDefinition(accommodationsCardsDefinition);
registerDefinition(contactFormDefinition);
registerDefinition(footerCtaRsvpPushDefinition);
registerDefinition(customSectionDefinition);
registerDefinition(quotesCarouselDefinition);
registerDefinition(quotesGridDefinition);
registerDefinition(quotesFeaturedDefinition);
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

export function getDefinition(type: string, variant: string): SectionDefinition | null {
  return SECTION_REGISTRY.get(makeKey(type, variant)) ?? null;
}

export function getDefinitionOrThrow(type: string, variant: string): SectionDefinition {
  const def = getDefinition(type, variant);
  if (!def) throw new Error(`No section definition for ${type}::${variant}`);
  return def;
}

export function getAllDefinitions(): SectionDefinition[] {
  return Array.from(SECTION_REGISTRY.values());
}

export function getVariantsForType(type: string): SectionDefinition[] {
  return getAllDefinitions().filter(d => d.type === type);
}

export function resolveAndParse(
  type: string,
  variant: string,
  rawData: Record<string, unknown>
): { def: SectionDefinition; parsedData: Record<string, unknown> } | null {
  const def = getDefinition(type, variant);
  if (!def) return null;
  const parsedData = parseSectionData(def.schema, rawData, def.defaultData) as Record<string, unknown>;
  return { def, parsedData };
}

export type { SectionDefinition };
