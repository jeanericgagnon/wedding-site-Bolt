import { fromOnboarding } from './generateWeddingData';
import { generateInitialLayout } from './generateInitialLayout';
import { generateWeddingSlug } from './slugify';

interface CoupleNames {
  name1: string;
  name2: string;
}

interface OnboardingMapperInput {
  coupleNames: CoupleNames;
  planningStatus: 'guided_setup_complete' | 'quick_start_complete';
  template: string;
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
  const weddingData = fromOnboarding({
    partner1Name: input.coupleNames.name1,
    partner2Name: input.coupleNames.name2,
    weddingDate: input.weddingDate || undefined,
    venueName: input.venue || undefined,
    location: input.location || input.city || undefined,
    city: input.city || undefined,
    ourStory: input.ourStory || undefined,
    ceremonyTime: input.ceremonyTime || undefined,
    receptionTime: input.receptionTime || undefined,
    attire: input.attire || undefined,
    hotelRecommendations: input.hotelRecommendations || undefined,
    parking: input.parking || undefined,
    rsvpDeadline: input.rsvpDeadline || undefined,
    registryLinks: input.registryLinks || undefined,
    customFaqs: input.customFaqs || undefined,
    template: input.template,
    colorScheme: input.colorScheme || 'romantic',
  });

  const layoutConfig = generateInitialLayout(input.template, weddingData);
  const siteSlug = generateWeddingSlug(input.coupleNames.name1, input.coupleNames.name2);

  return {
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
