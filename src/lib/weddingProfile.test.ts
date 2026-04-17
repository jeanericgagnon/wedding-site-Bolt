import { describe, expect, it } from 'vitest';
import { applyInitialSetupAnswersToWeddingProfile } from './weddingProfile';

describe('applyInitialSetupAnswersToWeddingProfile', () => {
  it('maps the baseline intake shape into a draft-ready profile', () => {
    const profile = applyInitialSetupAnswersToWeddingProfile({
      names: 'Eric & Kara',
      labelPreference: 'bride-groom',
      whenWhere: '2026-10-10 — Sayulita, Mexico',
      venueNameOrTbd: 'Amor Boutique Hotel',
      style: 'coastal, intimate',
      weekendEventsRaw: 'Friday pickleball and welcome dinner, Sunday wedding, Monday brunch.',
      ceremonyArrivalTime: '4:30 PM',
      guestCountBand: '50-100',
      plusOnePolicy: 'some',
      childrenAllowed: 'no',
      rsvpDeadline: '2026-08-15',
      mealChoice: 'yes',
      registryIntent: 'none-for-now',
      optionalStory: 'We met on Hinge and finally met in Boise for a Lady A concert.',
    });

    expect(profile.couple.partnerOne).toBe('Eric');
    expect(profile.couple.partnerTwo).toBe('Kara');
    expect(profile.couple.partnerOneLabel).toBe('groom');
    expect(profile.couple.partnerTwoLabel).toBe('bride');
    expect(profile.event.venueLocation).toBe('Sayulita, Mexico');
    expect(profile.story.summary).toContain('Lady A concert');
    expect(profile.event.ceremonyTime).toContain('4:30 PM');
    expect(profile.guestExperience.summary).toContain('50-100');
    expect(profile.meta.readinessScore).toBeGreaterThanOrEqual(0);
  });

  it('keeps refinement-style answers in canonical fields instead of dropping them', () => {
    const profile = applyInitialSetupAnswersToWeddingProfile({
      names: 'Alex & Jordan',
      labelPreference: 'names-only',
      whenWhere: '2026-06-20 — Puerto Vallarta, Mexico',
      venueNameOrTbd: 'Narwhal Pickleball Club',
      style: 'playful, tropical',
      weekendEventsRaw: 'Welcome drinks and pool time.',
      ceremonyArrivalTime: '5:00 PM',
      guestCountBand: 'under-50',
      plusOnePolicy: 'all',
      childrenAllowed: 'yes',
      rsvpDeadline: '2026-04-15',
      mealChoice: 'no',
      registryIntent: 'none-for-now',
      optionalStory: 'We met online. First date was chaotic in the best way.',
    });

    expect(profile.registry.url).toBe('none-for-now');
    expect(profile.registry.status).toBe('linked');
  });
});
