import { describe, expect, it } from 'vitest';
import { createEmptyInitialSetupAnswers, initialSetupAnswersToOnboardingFormShape } from './initialSetupAnswers';

describe('initialSetupAnswersToOnboardingFormShape', () => {
  it('drops impossible initial setup dates instead of forwarding rolled-over onboarding values', () => {
    const formShape = initialSetupAnswersToOnboardingFormShape({
      ...createEmptyInitialSetupAnswers(),
      whenWhere: '2027-02-30 — Sayulita, Mexico',
      rsvpDeadline: '2027-02-31',
    });

    expect(formShape.weddingDate).toBe('');
    expect(formShape.rsvpDeadline).toBe('');
    expect(formShape.venueLocation).toBe('Sayulita, Mexico');
  });

  it('keeps valid initial setup dates intact', () => {
    const formShape = initialSetupAnswersToOnboardingFormShape({
      ...createEmptyInitialSetupAnswers(),
      whenWhere: '2027-02-28 — Sayulita, Mexico',
      rsvpDeadline: '2027-02-14',
    });

    expect(formShape.weddingDate).toBe('2027-02-28');
    expect(formShape.rsvpDeadline).toBe('2027-02-14');
  });
});
