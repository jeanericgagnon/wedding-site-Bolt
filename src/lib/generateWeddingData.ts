import { WeddingDataV1 } from '../types/weddingData';
import { buildMigrationRecoveryDefaults } from './migrationRecovery';
import { shapeImportedFaqLines } from './faqMigration';
import { carryOverRegistryLinks } from './registryLinkCarryover';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface OnboardingFormData {
  partner1Name: string;
  partner2Name: string;
  useCasePacks?: string[];
  weddingDate?: string;
  venue?: string;
  venueName?: string;
  location?: string;
  city?: string;
  ourStory?: string;
  ceremonyTime?: string;
  receptionTime?: string;
  attire?: string;
  hotelRecommendations?: string;
  parking?: string;
  rsvpDeadline?: string;
  mealOptions?: string;
  registryLinks?: string;
  registryLink?: string;
  customFaqs?: string;
  template?: string;
  colorScheme?: string;
}

const PLACEHOLDER_ANSWERS = [
  'attire details will be shared soon',
  'parking details will be shared soon',
  'stay recommendations will be shared soon',
  'dress code details will be shared here closer to the wedding.',
  'parking details and arrival notes will be shared here closer to the wedding.',
  'recommended places to stay will be shared here.',
];


function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function normalizeFaqQuestion(question: string): string {
  const trimmed = question.trim().replace(/:+$/, '').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('?') ? trimmed : `${trimmed}?`;
}

function normalizeFaqAnswer(answer: string): string {
  return answer.trim().replace(/^:+/, '').trim();
}

function buildFaqEntry(question: string, answer: string) {
  const q = normalizeFaqQuestion(question);
  const a = normalizeFaqAnswer(answer);
  if (!q || !a) return null;
  return { id: generateId(), q, a };
}

function parseCustomFaqs(customFaqs?: string): WeddingDataV1['faq'] {
  return shapeImportedFaqLines(customFaqs).map((line) => buildFaqEntry(line.question, line.answer)).filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function dedupeFaqs(faqs: WeddingDataV1['faq']): WeddingDataV1['faq'] {
  const seen = new Set<string>();
  return faqs.filter((item) => {
    const key = item.q.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasSubstantiveAnswer(answer?: string): boolean {
  if (!answer?.trim()) return false;
  return !PLACEHOLDER_ANSWERS.includes(answer.trim().toLowerCase());
}

export function fromOnboarding(formData: OnboardingFormData): WeddingDataV1 {
  const now = new Date().toISOString();
  const recovered = buildMigrationRecoveryDefaults({
    coupleName1: formData.partner1Name,
    coupleName2: formData.partner2Name,
    venue: formData.venueName || formData.venue,
    location: formData.location,
    city: formData.city,
    story: formData.ourStory,
    ceremonyTime: formData.ceremonyTime,
    receptionTime: formData.receptionTime,
  });

  const venues: WeddingDataV1['venues'] = [];
  const schedule: WeddingDataV1['schedule'] = [];
  const registry: WeddingDataV1['registry'] = { links: [] };
  const parsedFaqs = parseCustomFaqs(formData.customFaqs);
  const inferredUseCasePacks = uniqueStrings([
    ...(formData.useCasePacks ?? []),
    /destination|travel|coastal/.test((formData.template ?? '').toLowerCase()) ? 'destination' : null,
    /bilingual/.test((formData.template ?? '').toLowerCase()) ? 'bilingual' : null,
    /interfaith/.test((formData.template ?? '').toLowerCase()) ? 'interfaith' : null,
  ]);
  const useCasePacks = inferredUseCasePacks;
  const isDestination = useCasePacks.includes('destination');
  const isBilingual = useCasePacks.includes('bilingual');
  const isInterfaith = useCasePacks.includes('interfaith');

  if (recovered.venue || recovered.location || formData.city) {
    const venueName = recovered.venue || recovered.location || formData.city;
    const venueAddress = recovered.location || formData.city;

    const venueId = generateId();
    venues.push({
      id: venueId,
      name: venueName || 'Venue TBD',
      address: venueAddress !== venueName ? venueAddress : undefined,
    });

    if (recovered.ceremonyTime) {
      schedule.push({
        id: generateId(),
        label: 'Ceremony',
        startTimeISO: recovered.ceremonyTime,
        venueId,
      });
    }

    if (recovered.receptionTime) {
      schedule.push({
        id: generateId(),
        label: 'Reception',
        startTimeISO: recovered.receptionTime,
        venueId,
      });
    }

    if (isDestination && schedule.length > 0) {
      schedule.unshift({
        id: generateId(),
        label: 'Welcome gathering',
        notes: 'A soft arrival moment for traveling guests before the main celebration.',
        venueId,
      });
    }

    if (isInterfaith) {
      schedule.unshift({
        id: generateId(),
        label: 'Ceremony note',
        notes: 'A short guide to the traditions and flow being honored during the ceremony.',
        venueId,
      });
    }
  }

  const migratedRegistryLinks = carryOverRegistryLinks(formData.registryLinks || formData.registryLink);
  migratedRegistryLinks.forEach((link) => {
    registry.links.push({
      id: generateId(),
      url: link.url,
      label: link.sourceLabel,
    });
  });

  const defaultFaqs = [
    hasSubstantiveAnswer(formData.attire) ? buildFaqEntry('What should I wear?', formData.attire!) : null,
    hasSubstantiveAnswer(formData.parking) ? buildFaqEntry('Will there be parking?', formData.parking!) : null,
    hasSubstantiveAnswer(formData.hotelRecommendations) ? buildFaqEntry('Where should I stay?', formData.hotelRecommendations!) : null,
    isDestination ? buildFaqEntry('When should guests arrive?', 'If you are traveling in, we recommend arriving at least one day early so the weekend feels easy and unrushed.') : null,
    isBilingual ? buildFaqEntry('Will information be shared in more than one language?', 'Yes. We are planning this with bilingual guests in mind, so the key details will be shared clearly for both sides of the family.') : null,
    isInterfaith ? buildFaqEntry('What should guests know about the ceremony?', 'We will share a short ceremony note here so guests understand the traditions being honored and what to expect.') : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const faq = dedupeFaqs([...parsedFaqs, ...defaultFaqs]);

  return {
    version: '1',
    couple: {
      partner1Name: formData.partner1Name || '',
      partner2Name: formData.partner2Name || '',
      story: recovered.story,
    },
    event: {
      weddingDateISO: formData.weddingDate,
    },
    venues,
    schedule,
    rsvp: {
      enabled: true,
      deadlineISO: formData.rsvpDeadline,
    },
    travel: {
      parkingInfo: formData.parking,
      hotelInfo: formData.hotelRecommendations,
      notes: isDestination ? 'Travel details, airport timing, and weekend logistics matter early for this celebration.' : undefined,
      flightInfo: isDestination ? 'Flight timing and airport guidance will be shared here for traveling guests.' : undefined,
    },
    registry,
    faq,
    theme: {
      preset: formData.colorScheme || 'romantic',
    },
    media: {
      gallery: [],
    },
    meta: {
      createdAtISO: now,
      updatedAtISO: now,
      useCasePacks,
    },
  };
}
