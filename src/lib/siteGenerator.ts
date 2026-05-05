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
import { buildCoupleDisplayName } from './coupleDisplayName';
import { getTemplate } from '../templates/registry';

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

const PLACEHOLDER_COPY = [
  'formal attire',
  'parking information to be announced',
  'transportation details will be shared closer to the date',
  'more details coming soon',
  'rsvp deadline to be announced',
];

function hasSubstance(value?: string | null): boolean {
  if (!value?.trim()) return false;
  return !PLACEHOLDER_COPY.includes(value.trim().toLowerCase());
}

function normalizeQuestion(input: string): string {
  const trimmed = input.trim().replace(/:+$/, '').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('?') ? trimmed : `${trimmed}?`;
}

function buildDefaultTravelNotes(data: OnboardingData): string {
  if (data.wedding_location?.trim()) {
    return `We will add travel notes for ${data.wedding_location.trim()} as the weekend details come together.`;
  }
  return 'We will add travel notes as the weekend details come together.';
}

function buildRegistryIntro(hasLinks: boolean): string {
  if (hasLinks) {
    return 'If you would like to celebrate with a gift, you can find our registry details below.';
  }
  return 'Registry details can be added here if you decide to share them later.';
}

function buildFaqEntry(id: string, question: string, answer: string) {
  const normalizedQuestion = normalizeQuestion(question);
  const normalizedAnswer = answer.trim();
  if (!normalizedQuestion || !normalizedAnswer) return null;
  return {
    id,
    question: normalizedQuestion,
    answer: normalizedAnswer,
  };
}

function generateSiteConfig(data: OnboardingData): SiteConfig {
  const template = getTemplate(data.template);
  const now = new Date().toISOString();

  const partnerDisplayName = buildCoupleDisplayName(data.couple_name_1, data.couple_name_2);
  const familyName = data.couple_last_name?.trim() || '';
  const displayName = [partnerDisplayName, familyName].filter(Boolean).join(' ') || 'The couple';

  const hero: HeroContent = {
    headline: displayName,
    subheadline: isValidIsoDate(data.wedding_date)
      ? `We're getting married on ${formatDate(data.wedding_date)}.`
      : "We're getting married.",
  };

  const details: DetailsContent = {
    venue_name: data.venue || data.wedding_location || 'Venue details are being finalized.',
    venue_address: data.wedding_location || 'Location details are being finalized.',
    ceremony_time: data.ceremony_time || 'Time to follow',
    reception_time: data.reception_time || 'To follow',
    attire: data.attire || 'Dress code details are coming together.',
    notes: data.our_story || undefined,
  };

  const scheduleItems: ScheduleContent['items'] = [];
  if (data.ceremony_time || data.venue || data.wedding_location) {
    scheduleItems.push({
      id: 'ceremony',
      time: data.ceremony_time || 'Time to follow',
      title: 'Ceremony',
      description: 'We’ll gather and celebrate together.',
      location: data.venue || data.wedding_location || 'Location details are being finalized.',
    });
  }
  if (data.reception_time || data.venue || data.wedding_location) {
    scheduleItems.push({
      id: 'reception',
      time: data.reception_time || 'To follow',
      title: 'Reception',
      description: 'Dinner, dancing, and time together after the ceremony.',
      location: data.venue || data.wedding_location || 'Location details are being finalized.',
    });
  }

  const schedule: ScheduleContent = {
    items: scheduleItems,
  };

  const parsedHotels = data.hotel_recommendations
    ? parseHotelRecommendations(data.hotel_recommendations)
    : [];
  const travel: TravelContent = {
    hotels: parsedHotels,
    parking: data.parking || 'Parking details and arrival notes are coming together.',
    transportation: hasSubstance(data.hotel_recommendations) || hasSubstance(data.parking)
      ? buildDefaultTravelNotes(data)
      : 'Travel details will be added if guests need them.',
  };

  const registryLinks = (data.registry_links
    ? parseRegistryLinks(data.registry_links)
    : []) as NonNullable<RegistryContent['links']>;
  const registry: RegistryContent = {
    message: buildRegistryIntro(registryLinks.length > 0),
    links: registryLinks,
  };

  const defaultFaqs = [
    buildFaqEntry('attire', 'What should I wear?', data.attire || 'Dress code details are coming together.'),
    buildFaqEntry('parking', 'Will there be parking?', data.parking || 'Parking details and arrival notes are coming together.'),
    buildFaqEntry('stay', 'Where should I stay?', data.hotel_recommendations || (data.wedding_location?.trim() ? `We will add recommended places to stay near ${data.wedding_location.trim()}.` : 'We will add recommended places to stay.')),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const customFaqs = parseCustomFaqs(data.custom_faqs);
  const faq: FaqContent = {
    items: dedupeFaqItems([...customFaqs, ...defaultFaqs]),
  };

  const rsvp: RsvpContent = {
    deadline_text: isValidIsoDate(data.rsvp_deadline)
      ? `Please reply by ${formatDate(data.rsvp_deadline)}`
      : 'RSVP timing will be added once it is set.',
    meal_options: data.meal_options ? parseMealOptions(data.meal_options) : undefined,
    message: 'We look forward to celebrating with you.',
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

export { generateSiteConfig };

function formatDate(isoDate: string): string {
  const date = parseValidIsoDate(isoDate);
  if (!date) return 'the date we choose';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isValidIsoDate(isoDate?: string | null): isoDate is string {
  return Boolean(parseValidIsoDate(isoDate));
}

function parseValidIsoDate(isoDate?: string | null): Date | null {
  if (!isoDate) return null;
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (!match) return null;
  const [, yearPart, monthPart, dayPart] = match;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseHotelRecommendations(text: string): TravelContent['hotels'] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ name: line }));
}

function parseRegistryLinks(text: string): RegistryContent['links'] {
  if (!text) return [];

  const uniqueLines = Array.from(new Set(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  ));

  return uniqueLines
    .map((line, index) => {
      if (line.includes('::')) {
        const [name, ...rest] = line.split('::');
        const url = rest.join('::').trim();
        if (!url) return null;
        return {
          name: name.trim() || `Registry ${index + 1}`,
          url,
        };
      }

      if (/^https?:\/\//i.test(line)) {
        return {
          name: `Registry ${index + 1}`,
          url: line,
        };
      }

      return null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function parseMealOptions(text: string): string[] {
  if (!text) return [];
  return text.split(/[\n,]/).map((option) => option.trim()).filter(Boolean);
}

function parseCustomFaqs(text: string | null | undefined): FaqContent['items'] {
  if (!text) return [];

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      if (line.includes('::')) {
        const [question, ...rest] = line.split('::');
        return buildFaqEntry(`custom-${index}`, question, rest.join('::'));
      }

      if (line.includes('?')) {
        const questionIndex = line.indexOf('?');
        return buildFaqEntry(
          `custom-${index}`,
          line.slice(0, questionIndex + 1),
          line.slice(questionIndex + 1)
        );
      }

      return null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function dedupeFaqItems(items: FaqContent['items']): FaqContent['items'] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.question.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
