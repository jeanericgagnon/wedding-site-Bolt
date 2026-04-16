import { describe, expect, it } from 'vitest';
import { onboardingFormToProfile } from './weddingProfile';

describe('onboardingFormToProfile', () => {
  it('maps the baseline intake shape into a draft-ready profile', () => {
    const profile = onboardingFormToProfile({
      partnerNames: 'Eric & Kara',
      partnerLabels: 'groom|bride',
      weddingDate: '2026-10-10',
      venueName: 'Amor Boutique Hotel',
      venueLocation: 'Sayulita, Mexico',
      theme: 'coastal, intimate',
      story: 'We met on Hinge and finally met in Boise for a Lady A concert.',
      guestExperience: 'Relaxed, welcomed, and taken care of.',
      weekendEvents: 'Friday pickleball and welcome dinner, Sunday wedding, Monday brunch.',
      extraGuestNotes: 'Stay through Monday. Tropical formal.',
      rsvpDeadline: '2026-08-15',
      registryLink: 'No registry, your presence is enough.',
    });

    expect(profile.couple.partnerOne).toBe('Eric');
    expect(profile.couple.partnerTwo).toBe('Kara');
    expect(profile.couple.partnerOneLabel).toBe('groom');
    expect(profile.couple.partnerTwoLabel).toBe('bride');
    expect(profile.event.venueLocation).toBe('Sayulita, Mexico');
    expect(profile.story.summary).toContain('Lady A concert');
    expect(profile.story.welcomeNote).toContain('Tropical formal');
    expect(profile.guestExperience.summary).toContain('taken care of');
    expect(profile.meta.readinessScore).toBeGreaterThan(0);
  });

  it('keeps refinement-style answers in canonical fields instead of dropping them', () => {
    const profile = onboardingFormToProfile({
      partnerNames: 'Alex & Jordan',
      partnerLabels: 'partner|partner',
      weddingDate: '2026-06-20',
      venueName: 'Narwhal Pickleball Club',
      venueLocation: 'Puerto Vallarta, Mexico',
      theme: 'playful, tropical',
      story: 'We met online. First date was chaotic in the best way.',
      guestExperience: 'Easy, fun, and warm.',
      weekendEvents: 'Welcome drinks and pool time.',
      extraGuestNotes: 'Why this location matters: It is where vacation always felt easiest together.',
      rsvpDeadline: '2026-04-15',
      registryLink: 'Travel is a lot, so truly no pressure on gifts.',
    });

    expect(profile.story.welcomeNote).toContain('Why this location matters');
    expect(profile.registry.url).toContain('no pressure');
    expect(profile.registry.status).toBe('linked');
  });
});
