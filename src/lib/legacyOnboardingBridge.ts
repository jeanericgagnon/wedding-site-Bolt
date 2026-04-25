import type { WeddingProfile } from './weddingProfile';
import { parseWeekendEvents } from './weddingProfile';

const normalizeLegacyOnboardingDateInput = (value?: string | null): string => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return '';

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : '';
};

export type LegacyOnboardingFormShape = {
  partnerNames: string;
  story: string;
  guestExperience: string;
  weekendEvents: string;
  ceremonyTime?: string;
  guestCount?: string;
  plusOnePolicy?: string;
  mealChoice?: string;
  registryIntent?: string;
  extraGuestNotes?: string;
  rsvpDeadline: string;
  registryLink: string;
  theme: string;
  partnerLabels?: string;
  weddingDate: string;
  venueName: string;
  venueLocation: string;
};

export const legacyProfileToOnboardingForm = (profile: WeddingProfile): LegacyOnboardingFormShape => ({
  partnerNames: profile.couple.displayNames,
  partnerLabels: `${profile.couple.partnerOneLabel || 'none'}|${profile.couple.partnerTwoLabel || 'none'}`,
  weddingDate: normalizeLegacyOnboardingDateInput(profile.event.date),
  venueName: profile.event.venueName || '',
  venueLocation: profile.event.venueLocation || '',
  theme: profile.design.theme || profile.design.vibe,
  story: profile.story.summary,
  guestExperience: '',
  weekendEvents: profile.event.weekendEvents || '',
  ceremonyTime: profile.event.ceremonyTime || '',
  guestCount: '',
  plusOnePolicy: '',
  mealChoice: '',
  registryIntent: '',
  extraGuestNotes: profile.story.welcomeNote || '',
  rsvpDeadline: normalizeLegacyOnboardingDateInput(profile.event.rsvpDeadline),
  registryLink: '',
});

export const legacyOnboardingFormToProfile = (formData: LegacyOnboardingFormShape): WeddingProfile => {
  const partnerNames = formData.partnerNames.split('&').map((name) => name.trim()).filter(Boolean);
  const partnerOne = partnerNames[0] || '';
  const partnerTwo = partnerNames[1] || '';

  return {
    couple: {
      displayNames: formData.partnerNames,
      partnerOne,
      partnerTwo: partnerTwo || partnerOne,
      partnerOneLabel: ((formData.partnerLabels || '').split('|')[0] as 'bride' | 'groom' | 'partner' | 'none' | '') || 'none',
      partnerTwoLabel: ((formData.partnerLabels || '').split('|')[1] as 'bride' | 'groom' | 'partner' | 'none' | '') || 'none',
      storyTone: '',
    },
    event: {
      date: formData.weddingDate,
      timezone: 'America/Los_Angeles',
      venueName: formData.venueName,
      venueLocation: formData.venueLocation,
      weekendEvents: formData.weekendEvents,
      structuredWeekendEvents: parseWeekendEvents(formData.weekendEvents),
      ceremonyTime: formData.ceremonyTime || '',
      receptionTime: '',
      rsvpDeadline: formData.rsvpDeadline,
    },
    venue: { city: formData.venueLocation, state: '', country: '' },
    story: { summary: formData.story, welcomeNote: formData.extraGuestNotes || '' },
    registry: { url: formData.registryIntent || '', status: (formData.registryIntent || '').trim() ? 'linked' : 'missing' },
    design: { theme: formData.theme, vibe: formData.theme },
    guestExperience: { summary: formData.guestCount || '', faqTone: formData.plusOnePolicy || '', travelSupportLevel: formData.mealChoice === 'yes' ? 'high' : 'minimal' },
    meta: { readinessScore: 0 },
  };
};
