import { describe, expect, it } from 'vitest';
import {
  createEmptyGuidedSetupFormData,
  createGuidedSetupDraftDefaults,
  guidedSetupSteps,
} from './guidedSetupContent';
import {
  getOnboardingStepForQuestionIndex,
  onboardingConciergeQuestions,
  optionalOnboardingQuestionKeys,
} from './onboardingConciergeContent';

describe('onboarding surface content modules', () => {
  it('keeps guided setup route-state defaults outside the route component', () => {
    expect(guidedSetupSteps).toEqual(['welcome', 'basics', 'events', 'travel', 'rsvp', 'faq', 'design', 'guests', 'complete']);
    expect(createEmptyGuidedSetupFormData()).toMatchObject({
      weddingDate: '',
      template: 'modern',
      colorScheme: 'romantic',
    });
    expect(createGuidedSetupDraftDefaults()).toMatchObject({
      currentStep: 'welcome',
      coupleNames: { name1: '', name2: '' },
      formData: { template: 'modern', colorScheme: 'romantic' },
    });
  });

  it('keeps legacy onboarding concierge copy and step mapping outside the route component', () => {
    expect(onboardingConciergeQuestions.map((question) => question.key)).toEqual([
      'partnerNames',
      'partnerLabels',
      'venueLocation',
      'venueName',
      'theme',
      'weekendEvents',
      'ceremonyTime',
      'guestCount',
      'plusOnePolicy',
      'childrenAllowed',
      'rsvpDeadline',
      'mealChoice',
      'story',
    ]);
    expect(optionalOnboardingQuestionKeys).toEqual(['venueName', 'story']);
    expect(getOnboardingStepForQuestionIndex(0)).toBe('quick-1');
    expect(getOnboardingStepForQuestionIndex(4)).toBe('quick-2');
    expect(getOnboardingStepForQuestionIndex(7)).toBe('quick-3');
  });
});
