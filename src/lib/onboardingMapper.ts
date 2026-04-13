import { fromOnboarding } from './generateWeddingData';
import { generateInitialLayout } from './generateInitialLayout';
import { generateWeddingSlug } from './slugify';

interface CoupleNames {
  name1: string;
  name2: string;
}

interface OnboardingMapperInput {
  coupleNames: CoupleNames;
  planningStatus: 'guided_setup_in_progress' | 'guided_setup_complete' | 'quick_start_complete';
  template: string;
  useCasePacks?: string[];
  colorScheme?: string;
  weddingDate?: string;
  venue?: string;
  location?: string;
  city?: string;
  ourStory?: string;
  ceremonyTime?: string;
  receptionTime?: string;
  attire?: string;
  hotelRecommendations?: string;
  parking?: string;
  rsvpDeadline?: string;
  registryLinks?: string;
  customFaqs?: string;
}

export function buildOnboardingUpdateData(input: OnboardingMapperInput): Record<string, unknown> {
  const normalizedStory = input.ourStory?.trim() || `${input.coupleNames.name1} and ${input.coupleNames.name2} are excited to celebrate with the people they love most.`;
  const normalizedAttire = input.attire?.trim() || 'Dress code details will be shared here closer to the wedding.';
  const normalizedHotelRecommendations = input.hotelRecommendations?.trim() || (input.location?.trim() ? `Recommended places to stay near ${input.location.trim()} will be shared here.` : 'Recommended places to stay will be shared here.');
  const normalizedParking = input.parking?.trim() || 'Parking details and arrival notes will be shared here closer to the wedding.';
  const useCaseFaqs = [
    useCasePacks.includes('destination') ? 'When should guests arrive?::If you are traveling in, we recommend arriving at least one day early so the weekend feels easy and unrushed.' : null,
    useCasePacks.includes('bilingual') ? 'Will information be shared in more than one language?::Yes. We are planning this with bilingual guests in mind, so the key details will be shared clearly for both sides of the family.' : null,
    useCasePacks.includes('interfaith') ? 'What should guests know about the ceremony?::We will share a short ceremony note here so guests understand the traditions being honored and what to expect.' : null,
  ].filter(Boolean);
  const normalizedFaqs = input.customFaqs?.trim() || [
    `What should I wear?::${normalizedAttire}`,
    `Where should I stay?::${normalizedHotelRecommendations}`,
    `Will there be parking?::${normalizedParking}`,
    ...useCaseFaqs,
  ].join('\n');
  const useCasePacks = Array.from(new Set([
    ...((input.useCasePacks ?? []).filter(Boolean)),
    /destination|travel|coastal/.test((input.template ?? '').toLowerCase()) ? 'destination' : null,
    /bilingual/.test((input.template ?? '').toLowerCase()) ? 'bilingual' : null,
    /interfaith/.test((input.template ?? '').toLowerCase()) ? 'interfaith' : null,
  ].filter(Boolean) as string[]));
  const normalizedRegistryLinks = input.registryLinks
    ?.split('\n')
    .map((link) => link.trim())
    .filter(Boolean)
    .join('\n');

  const weddingData = fromOnboarding({
    partner1Name: input.coupleNames.name1,
    partner2Name: input.coupleNames.name2,
    useCasePacks: input.useCasePacks || undefined,
    weddingDate: input.weddingDate || undefined,
    venueName: input.venue || undefined,
    location: input.location || input.city || undefined,
    city: input.city || undefined,
    ourStory: normalizedStory,
    ceremonyTime: input.ceremonyTime || undefined,
    receptionTime: input.receptionTime || undefined,
    attire: normalizedAttire,
    hotelRecommendations: normalizedHotelRecommendations,
    parking: normalizedParking,
    rsvpDeadline: input.rsvpDeadline || undefined,
    registryLinks: normalizedRegistryLinks || undefined,
    customFaqs: normalizedFaqs,
    template: input.template,
    colorScheme: input.colorScheme || 'romantic',
  });

  const layoutConfig = generateInitialLayout(input.template, weddingData);
  const siteSlug = generateWeddingSlug(input.coupleNames.name1, input.coupleNames.name2);

  return {
    wedding_date: input.weddingDate || null,
    venue_date: input.weddingDate || null,
    venue_name: input.venue || null,
    wedding_location: input.city || input.location || null,
    planning_status: input.planningStatus,
    active_template_id: input.template,
    template_id: input.template,
    wedding_data: weddingData,
    layout_config: layoutConfig,
    site_slug: siteSlug,
    couple_name_1: input.coupleNames.name1,
    couple_name_2: input.coupleNames.name2,
  };
}
