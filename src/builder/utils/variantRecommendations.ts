import type { BuilderSectionType } from '../../types/builder/section';
import type { WeddingDataV1 } from '../../types/weddingData';
import type { VariantMeta } from '../registry/sectionManifests';

export interface VariantRecommendationContext {
  weddingData?: WeddingDataV1 | null;
  activeSections?: Array<{ type: string }>;
  themeId?: string;
}

export interface VariantRecommendation {
  score: number;
  label: 'Best match' | 'Great fit' | 'Good fit' | null;
  reasons: string[];
}

const STYLE_KEYWORDS = {
  formal: ['formal', 'black tie', 'luxury', 'classic', 'editorial', 'elegant'],
  playful: ['playful', 'colorful', 'casual', 'fun', 'party'],
  garden: ['garden', 'botanical', 'floral', 'estate', 'romantic'],
  modern: ['modern', 'minimal', 'clean', 'city'],
};

const textIncludes = (value: unknown, terms: string[]): boolean => {
  const text = String(value ?? '').toLowerCase();
  return terms.some((term) => text.includes(term));
};

const getRegistryLinks = (weddingData?: WeddingDataV1 | null): unknown[] => {
  const registry = weddingData?.registry;
  if (!registry || typeof registry !== 'object') return [];
  const links = (registry as { links?: unknown }).links;
  return Array.isArray(links) ? links : [];
};

const hasTravelCopy = (weddingData?: WeddingDataV1 | null): boolean => {
  const travel = weddingData?.travel ?? {};
  return Boolean(travel.hotelInfo || travel.flightInfo || travel.parkingInfo || travel.notes || travel.accommodations);
};

const getThemeText = (context: VariantRecommendationContext): string => {
  const theme = context.weddingData?.theme ?? {};
  return [
    context.themeId,
    theme.preset,
    theme.storyTone,
    theme.vibe,
    theme.style,
  ].filter(Boolean).join(' ').toLowerCase();
};

const getEventDayCount = (weddingData?: WeddingDataV1 | null): number => {
  const days = new Set<string>();
  for (const item of weddingData?.schedule ?? []) {
    if (!item.startTimeISO) continue;
    const day = item.startTimeISO.slice(0, 10);
    if (day) days.add(day);
  }
  return days.size;
};

export function getVariantRecommendation(
  sectionType: BuilderSectionType,
  variant: VariantMeta,
  context: VariantRecommendationContext = {},
): VariantRecommendation {
  const weddingData = context.weddingData;
  const themeText = getThemeText(context);
  const reasons: string[] = [];
  let score = variant.recommended ? 18 : 0;

  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  const galleryCount = weddingData?.media?.gallery?.length ?? 0;
  const scheduleCount = weddingData?.schedule?.length ?? 0;
  const venueCount = weddingData?.venues?.length ?? 0;
  const registryCount = getRegistryLinks(weddingData).length;
  const faqCount = weddingData?.faq?.length ?? 0;
  const hasHeroImage = Boolean(weddingData?.media?.heroImageUrl);
  const hasStory = String(weddingData?.couple?.story ?? '').trim().length > 160;
  const multiDay = getEventDayCount(weddingData) > 1;
  const hasCountdownDate = Boolean(weddingData?.event?.weddingDateISO || weddingData?.event?.date);
  const hasHotels = Boolean(weddingData?.travel?.hotelInfo || weddingData?.travel?.accommodations);

  switch (sectionType) {
    case 'hero':
      if (hasHeroImage && ['default', 'fullbleed', 'split'].includes(variant.id)) add(18, 'You have a hero photo ready.');
      if (!hasHeroImage && variant.id === 'minimal') add(22, 'Works well before final photos are ready.');
      if (textIncludes(themeText, STYLE_KEYWORDS.formal) && ['invitation', 'minimal'].includes(variant.id)) add(14, 'Matches a formal site style.');
      if (textIncludes(themeText, STYLE_KEYWORDS.garden) && variant.id === 'botanical') add(14, 'Matches a garden or floral style.');
      break;
    case 'story':
      if (hasStory && ['chapters', 'timeline', 'split'].includes(variant.id)) add(18, 'You have enough story content for a richer layout.');
      if (!hasStory && ['default', 'centered', 'milestones'].includes(variant.id)) add(14, 'Keeps the story concise and easy to finish.');
      break;
    case 'schedule':
      if (multiDay && variant.id === 'dayTabs') add(28, 'Your schedule spans multiple days.');
      if (scheduleCount >= 5 && ['timeline', 'program'].includes(variant.id)) add(18, 'Your schedule has enough events for structure.');
      if (scheduleCount <= 3 && variant.id === 'agendaCards') add(16, 'Short schedules read well as cards.');
      break;
    case 'travel':
      if (hasTravelCopy(weddingData) && ['hotelBlock', 'localGuide', 'splitAirHotel'].includes(variant.id)) add(18, 'You already have guest travel details.');
      if (venueCount > 1 && variant.id === 'mapPins') add(18, 'Multiple locations benefit from a map-led layout.');
      if (!hasTravelCopy(weddingData) && ['compact', 'list'].includes(variant.id)) add(14, 'Easy to finish with limited travel info.');
      break;
    case 'registry':
      if (registryCount >= 4 && ['tabs', 'featured'].includes(variant.id)) add(20, 'Larger registries benefit from grouping or featured gifts.');
      if (registryCount > 0 && registryCount <= 3 && ['cards', 'minimal', 'fundHighlight'].includes(variant.id)) add(18, 'Simple registry links are ready to publish.');
      if (textIncludes(themeText, STYLE_KEYWORDS.formal) && variant.id === 'luxury') add(12, 'Matches a formal registry presentation.');
      break;
    case 'faq':
      if (faqCount >= 6 && ['accordion', 'tabbed'].includes(variant.id)) add(18, 'Longer FAQ lists stay easier to scan when grouped.');
      if (faqCount > 0 && faqCount <= 4 && ['default', 'numbered'].includes(variant.id)) add(16, 'Short FAQ lists can stay visible without extra clicks.');
      if (textIncludes(themeText, STYLE_KEYWORDS.playful) && variant.id === 'chat') add(10, 'Matches a conversational site style.');
      break;
    case 'rsvp':
      if (multiDay && variant.id === 'multiEvent') add(26, 'Multi-day weekends need event-specific RSVPs.');
      if (variant.id === 'default') add(12, 'This is the safest guest flow.');
      if (faqCount > 4 && variant.id === 'card') add(8, 'Step-by-step RSVP pairs well with richer guest details.');
      break;
    case 'gallery':
      if (galleryCount >= 8 && ['masonry', 'categorized', 'mosaic'].includes(variant.id)) add(22, 'You have enough photos for a richer gallery.');
      if (galleryCount > 0 && galleryCount < 8 && ['spotlight', 'filmStrip', 'carousel'].includes(variant.id)) add(18, 'A smaller curated set can lead with one strong image.');
      if (galleryCount === 0 && ['grid', 'masonry'].includes(variant.id)) add(10, 'Easy to fill once photos are added.');
      break;
    case 'wedding-party':
      if (variant.id === 'minimal') add(8, 'Works even before every portrait is ready.');
      if (variant.id === 'default') add(10, 'Safest structure for traditional wedding parties.');
      break;
    case 'dress-code':
      if (textIncludes(themeText, STYLE_KEYWORDS.formal) && ['default', 'scale', 'card'].includes(variant.id)) add(14, 'Formal events benefit from clear attire guidance.');
      if (textIncludes(themeText, STYLE_KEYWORDS.garden) && ['palette', 'illustrated'].includes(variant.id)) add(14, 'Garden styles often need color and outfit examples.');
      if (variant.id === 'default') add(10, 'Fastest way to give guests enough attire context.');
      break;
    case 'accommodations':
      if (hasHotels && ['cards', 'featured', 'faqStyle'].includes(variant.id)) add(18, 'Your hotel details are ready for a richer layout.');
      if (venueCount > 1 && variant.id === 'mapList') add(14, 'Multiple places benefit from map context.');
      if (!hasHotels && variant.id === 'default') add(12, 'A simple list works before room blocks are finalized.');
      break;
    case 'contact':
      if (variant.id === 'interactiveHub') add(14, 'Adds guest participation with polls and quiz prompts.');
      if (variant.id === 'coordinator') add(10, 'Useful when a planner or day-of contact is involved.');
      if (variant.id === 'default') add(10, 'Safest way to show contact roles clearly.');
      break;
    case 'footer-cta':
      if (variant.id === 'default') add(12, 'A clear final RSVP push works for most pages.');
      if (hasCountdownDate && variant.id === 'countdown') add(16, 'You have a date for an urgency-based RSVP ending.');
      if (hasHeroImage && variant.id === 'photo') add(14, 'A closing photo can end the site emotionally.');
      if (textIncludes(themeText, STYLE_KEYWORDS.formal) && variant.id === 'monogram') add(10, 'Matches a formal stationery-style ending.');
      break;
    case 'custom':
      if (variant.id === 'default') add(8, 'Best for one-off content that does not fit another section.');
      break;
    case 'quotes':
      if (variant.id === 'carousel') add(12, 'A carousel keeps wishes feeling alive without taking much space.');
      if (textIncludes(themeText, STYLE_KEYWORDS.formal) && ['pullQuote', 'letter'].includes(variant.id)) add(12, 'Formal sites pair well with a letter or featured quote.');
      if (variant.id === 'guestbook') add(10, 'Good for collecting notes from guests.');
      break;
    case 'menu':
      if (textIncludes(themeText, STYLE_KEYWORDS.formal) && ['printed', 'card'].includes(variant.id)) add(14, 'Formal dinners pair well with printed-menu styling.');
      if (variant.id === 'tabs') add(12, 'Course tabs keep multi-course menus organized.');
      if (variant.id === 'simple') add(10, 'Simple menus stay easy to read on mobile.');
      break;
    case 'music':
      if (variant.id === 'requestForm') add(16, 'Adds guest participation without needing SMS.');
      if (variant.id === 'playlist') add(14, 'Best default when you have a Spotify playlist.');
      break;
    case 'venue':
      if (venueCount > 1 && ['splitMap', 'multiVenue', 'mapFirst'].includes(variant.id)) add(16, 'Multiple venues benefit from stronger location context.');
      if (venueCount <= 1 && ['card', 'detailsFirst', 'pin'].includes(variant.id)) add(12, 'Simple venue details stay easy to scan.');
      break;
    case 'directions':
      if (venueCount > 1 && ['multiVenue', 'split'].includes(variant.id)) add(18, 'Multiple venues benefit from stronger location context.');
      if (hasTravelCopy(weddingData) && ['transport', 'fromHotel'].includes(variant.id)) add(14, 'Your travel details support richer directions.');
      if (venueCount <= 1 && ['pin', 'card'].includes(variant.id)) add(12, 'Simple venue directions stay easy to scan.');
      break;
    case 'video':
      if (variant.id === 'full') add(12, 'One polished film deserves a large cinematic player.');
      if (variant.id === 'reel') add(10, 'Best for vertical save-the-date or social clips.');
      if (hasHeroImage && variant.id === 'lightbox') add(10, 'A still image can open into a cinematic reveal.');
      break;
  }

  if (textIncludes(themeText, STYLE_KEYWORDS.playful) && textIncludes(`${variant.id} ${variant.label} ${variant.bestFor}`, ['playful', 'illustrated', 'polaroid', 'chat'])) {
    add(8, 'Matches a playful site style.');
  }
  if (textIncludes(themeText, STYLE_KEYWORDS.modern) && textIncludes(`${variant.id} ${variant.label} ${variant.bestFor}`, ['minimal', 'modern', 'grid', 'compact'])) {
    add(8, 'Matches a modern site style.');
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const label = normalizedScore >= 36 ? 'Best match' : normalizedScore >= 24 ? 'Great fit' : normalizedScore >= 14 ? 'Good fit' : null;
  return { score: normalizedScore, label, reasons: reasons.slice(0, 2) };
}

export function sortVariantsByRecommendation(
  sectionType: BuilderSectionType,
  variants: VariantMeta[],
  context: VariantRecommendationContext = {},
): VariantMeta[] {
  return [...variants].sort((a, b) => {
    const recA = getVariantRecommendation(sectionType, a, context);
    const recB = getVariantRecommendation(sectionType, b, context);
    if (recB.score !== recA.score) return recB.score - recA.score;
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    return variants.indexOf(a) - variants.indexOf(b);
  });
}
