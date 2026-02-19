import type {
  SiteConfig,
  HeroContent,
  DetailsContent,
  ScheduleContent,
  TravelContent,
  RegistryContent,
  FaqContent,
  RsvpContent,
  GalleryContent,
} from '../types/siteConfig';
import { TEMPLATE_REGISTRY } from '../templates/registry';

export interface OnboardingData {
  couple_name_1: string;
  couple_name_2: string;
  couple_last_name?: string | null;
  wedding_date?: string | null;
  wedding_location?: string | null;
  venue?: string | null;
  ceremony_time?: string | null;
  reception_time?: string | null;
  attire?: string | null;
  hotel_recommendations?: string | null;
  parking?: string | null;
  rsvp_deadline?: string | null;
  meal_options?: string | null;
  registry_links?: string | null;
  custom_faqs?: string | null;
  our_story?: string | null;
  template?: string;
  color_scheme?: string;
}

export function generateSiteConfig(data: OnboardingData): SiteConfig {
  const template = TEMPLATE_REGISTRY[data.template || 'base'] || TEMPLATE_REGISTRY.base;
  const now = new Date().toISOString();

  const displayName = data.couple_last_name
    ? `${data.couple_name_1} & ${data.couple_name_2} ${data.couple_last_name}`
    : `${data.couple_name_1} & ${data.couple_name_2}`;

  const hero: HeroContent = {
    headline: displayName,
    subheadline: data.wedding_date
      ? `We're getting married on ${formatDate(data.wedding_date)}!`
      : "We're getting married!",
  };

  const details: DetailsContent = {
    venue_name: data.venue || data.wedding_location || 'TBD',
    venue_address: data.wedding_location || 'Location to be announced',
    ceremony_time: data.ceremony_time || 'TBD',
    reception_time: data.reception_time || 'TBD',
    attire: data.attire || 'Formal attire',
    notes: data.our_story || undefined,
  };

  const schedule: ScheduleContent = {
    items: [
      {
        id: 'ceremony',
        time: data.ceremony_time || 'TBD',
        title: 'Ceremony',
        description: 'Join us as we exchange our vows',
        location: data.venue || data.wedding_location || 'TBD',
      },
      {
        id: 'cocktail',
        time: 'Following ceremony',
        title: 'Cocktail Hour',
        description: 'Enjoy drinks and appetizers',
      },
      {
        id: 'reception',
        time: data.reception_time || 'TBD',
        title: 'Reception',
        description: 'Dinner, dancing, and celebration',
        location: data.venue || data.wedding_location || 'TBD',
      },
    ],
  };

  const travel: TravelContent = {
    hotels: data.hotel_recommendations
      ? parseHotelRecommendations(data.hotel_recommendations)
      : [],
    parking: data.parking || 'Parking information to be announced',
    transportation: 'Transportation details will be shared closer to the date',
  };

  const registry: RegistryContent = {
    message: 'Your presence at our wedding is the greatest gift of all. However, if you wish to honor us with a gift, we have registered at the following locations:',
    links: data.registry_links ? parseRegistryLinks(data.registry_links) : [],
  };

  const faq: FaqContent = {
    items: [
      {
        id: 'attire',
        question: 'What should I wear?',
        answer: data.attire || 'Formal attire',
      },
      {
        id: 'plus-one',
        question: 'Can I bring a plus one?',
        answer: 'Please check your invitation for plus one details, or contact us if you have questions.',
      },
      {
        id: 'parking',
        question: 'Is there parking available?',
        answer: data.parking || 'Parking details will be shared closer to the date.',
      },
      {
        id: 'kids',
        question: 'Are children welcome?',
        answer: 'Please reach out to us if you have questions about bringing children.',
      },
      ...parseCustomFaqs(data.custom_faqs),
    ],
  };

  const rsvp: RsvpContent = {
    deadline_text: data.rsvp_deadline
      ? `Please RSVP by ${formatDate(data.rsvp_deadline)}`
      : 'RSVP deadline to be announced',
    meal_options: data.meal_options ? parseMealOptions(data.meal_options) : undefined,
    message: 'We look forward to celebrating with you!',
  };

  const gallery: GalleryContent = {
    photos: [],
  };

  const sections: SiteConfig['sections'] = template.defaultLayout.sections.map((sectionDef, index) => ({
    id: `${sectionDef.type}-${index}`,
    type: sectionDef.type as SiteConfig['sections'][number]['type'],
    enabled: sectionDef.enabled,
    props_key: sectionDef.type,
    variant: sectionDef.variant,
  }));

  const config: SiteConfig = {
    version: '1',
    template_id: template.id,
    couple: {
      partner1_name: data.couple_name_1,
      partner2_name: data.couple_name_2,
      display_name: displayName,
    },
    event: {
      wedding_date_iso: data.wedding_date || null,
      timezone: 'America/New_York',
    },
    locations: {
      primary: {
        name: data.venue || data.wedding_location || undefined,
        address: data.wedding_location || undefined,
      },
    },
    rsvp: {
      deadline_iso: data.rsvp_deadline || null,
      enabled: true,
    },
    sections,
    content: {
      hero,
      details,
      schedule,
      travel,
      registry,
      faq,
      rsvp,
      gallery,
    },
    theme: {
      preset: data.color_scheme || template.defaultThemePreset || 'romantic',
    },
    meta: {
      created_at_iso: now,
      updated_at_iso: now,
    },
  };

  return config;
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

function parseHotelRecommendations(text: string): TravelContent['hotels'] {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line) => ({
    name: line.trim(),
  }));
}

function parseRegistryLinks(text: string): RegistryContent['links'] {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line, i) => {
    if (line.includes('http')) {
      const parts = line.split(/https?:\/\//);
      return {
        name: parts[0]?.trim() || `Registry ${i + 1}`,
        url: 'http://' + (parts[1]?.trim() || line.trim()),
      };
    }
    return {
      name: line.trim(),
      url: '#',
    };
  });
}

function parseMealOptions(text: string): string[] {
  if (!text) return [];
  return text.split(/[,\n]/).map(o => o.trim()).filter(Boolean);
}

function parseCustomFaqs(text: string | null | undefined): FaqContent['items'] {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line, i) => ({
    id: `custom-${i}`,
    question: line.trim(),
    answer: 'Answer coming soon',
  }));
}
