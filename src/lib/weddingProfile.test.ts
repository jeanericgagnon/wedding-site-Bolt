import { describe, expect, it } from 'vitest';
import { createEmptyWeddingProfile, onboardingFormToProfile, profileToOnboardingForm } from './weddingProfile';

describe('weddingProfile onboarding mapping', () => {
  it('round-trips the 10-question onboarding form shape', () => {
    const profile = onboardingFormToProfile({
      partnerNames: 'Alex & Jordan',
      weddingDate: '2027-06-12',
      venueName: 'Grand Estate',
      venueLocation: 'San Diego, CA',
      theme: 'editorial coastal',
      story: 'We met in college and kept choosing each other.',
      guestExperience: 'Relaxed, welcomed, and genuinely taken care of.',
      weekendEvents: 'Friday welcome dinner, Saturday wedding, Sunday brunch',
      rsvpDeadline: '2027-05-01',
      registryLink: 'https://zola.com/our-registry',
    });

    expect(profile.guestExperience.summary).toBe('Relaxed, welcomed, and genuinely taken care of.');
    expect(profile.event.weekendEvents).toContain('Friday welcome dinner');

    expect(profileToOnboardingForm(profile)).toEqual({
      partnerNames: 'Alex & Jordan',
      weddingDate: '2027-06-12',
      venueName: 'Grand Estate',
      venueLocation: 'San Diego, CA',
      theme: 'editorial coastal',
      story: 'We met in college and kept choosing each other.',
      guestExperience: 'Relaxed, welcomed, and genuinely taken care of.',
      weekendEvents: 'Friday welcome dinner, Saturday wedding, Sunday brunch',
      rsvpDeadline: '2027-05-01',
      registryLink: 'https://zola.com/our-registry',
    });
  });

  it('exposes empty values for new intake questions in an empty profile', () => {
    const form = profileToOnboardingForm(createEmptyWeddingProfile());
    expect(form.guestExperience).toBe('');
    expect(form.weekendEvents).toBe('');
  });
});
