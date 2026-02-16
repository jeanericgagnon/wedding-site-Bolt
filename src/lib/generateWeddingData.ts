import { WeddingDataV1 } from '../types/weddingData';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export interface OnboardingFormData {
  partner1Name: string;
  partner2Name: string;
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

export function fromOnboarding(formData: OnboardingFormData): WeddingDataV1 {
  const now = new Date().toISOString();

  const venues: WeddingDataV1['venues'] = [];
  const schedule: WeddingDataV1['schedule'] = [];
  const registry: WeddingDataV1['registry'] = { links: [] };
  const faq: WeddingDataV1['faq'] = [];

  if (formData.venue || formData.venueName || formData.location || formData.city) {
    const venueName = formData.venueName || formData.venue || formData.location || formData.city;
    const venueAddress = formData.location || formData.city;

    const venueId = generateId();
    venues.push({
      id: venueId,
      name: venueName || 'Venue TBD',
      address: venueAddress !== venueName ? venueAddress : undefined,
    });

    if (formData.ceremonyTime) {
      schedule.push({
        id: generateId(),
        label: 'Ceremony',
        startTimeISO: formData.ceremonyTime,
        venueId,
      });
    }

    if (formData.receptionTime) {
      schedule.push({
        id: generateId(),
        label: 'Reception',
        startTimeISO: formData.receptionTime,
        venueId,
      });
    }
  }

  if (formData.registryLinks) {
    const links = formData.registryLinks.split('\n').filter(l => l.trim());
    links.forEach(url => {
      registry.links.push({
        id: generateId(),
        url: url.trim(),
      });
    });
  } else if (formData.registryLink) {
    registry.links.push({
      id: generateId(),
      url: formData.registryLink.trim(),
    });
  }

  if (formData.customFaqs) {
    const faqLines = formData.customFaqs.split('\n').filter(l => l.trim());
    faqLines.forEach(line => {
      const parts = line.split('?');
      if (parts.length >= 2) {
        faq.push({
          id: generateId(),
          q: parts[0].trim() + '?',
          a: parts.slice(1).join('?').trim(),
        });
      }
    });
  }

  const defaultFaqs = [
    { q: 'What should I wear?', a: formData.attire || 'Attire information coming soon' },
    { q: 'Will there be parking?', a: formData.parking || 'Parking information coming soon' },
    { q: 'Where should I stay?', a: formData.hotelRecommendations || 'Accommodation recommendations coming soon' },
  ];

  defaultFaqs.forEach(item => {
    faq.push({
      id: generateId(),
      ...item,
    });
  });

  return {
    version: '1',
    couple: {
      partner1Name: formData.partner1Name || '',
      partner2Name: formData.partner2Name || '',
      story: formData.ourStory,
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
    },
  };
}
