import { describe, expect, it } from 'vitest';
import { createEmptyWeddingProfile } from './weddingProfile';
import { legacyProfileToOnboardingForm } from './legacyOnboardingBridge';

describe('legacyProfileToOnboardingForm', () => {
  it('drops impossible persisted profile dates instead of rehydrating fake onboarding date truth', () => {
    const profile = createEmptyWeddingProfile();
    profile.event.date = '2027-02-30';
    profile.event.rsvpDeadline = '2027-02-31';
    profile.event.venueLocation = 'Sayulita, Mexico';

    const form = legacyProfileToOnboardingForm(profile);

    expect(form.weddingDate).toBe('');
    expect(form.rsvpDeadline).toBe('');
    expect(form.venueLocation).toBe('Sayulita, Mexico');
  });

  it('keeps valid persisted profile dates intact', () => {
    const profile = createEmptyWeddingProfile();
    profile.event.date = '2027-02-28';
    profile.event.rsvpDeadline = '2027-02-14';

    const form = legacyProfileToOnboardingForm(profile);

    expect(form.weddingDate).toBe('2027-02-28');
    expect(form.rsvpDeadline).toBe('2027-02-14');
  });
});
