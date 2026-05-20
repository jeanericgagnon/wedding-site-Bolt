import { describe, expect, it } from 'vitest';
import {
  QUICK_START_PROCESSING_FINAL_STEP_MS,
  QUICK_START_PROCESSING_STEP_MS,
  quickStartProcessingSteps,
  quickStartQuestions,
  quickStartTheme,
} from './quickStartContent';

describe('quickStartContent', () => {
  it('keeps the concierge question order in route-independent config', () => {
    expect(quickStartQuestions.map((question) => question.key)).toEqual([
      'partnerNames',
      'partnerLabels',
      'venueLocation',
      'venueName',
      'theme',
      'guestFeel',
      'weekendEvents',
      'ceremonyTime',
      'guestCount',
      'plusOnePolicy',
      'childrenAllowed',
      'rsvpDeadline',
      'mealChoice',
      'story',
    ]);
    expect(quickStartQuestions.at(-1)?.optional).toBe(true);
  });

  it('keeps UI tokens and thinking-state timing outside the route component', () => {
    expect(quickStartTheme).toMatchObject({
      pageBg: '#FAF9F7',
      text: '#2B2B2B',
      soft: '#F5F4F2',
    });
    expect(quickStartProcessingSteps).toContain('Shaping the first draft structure');
    expect(QUICK_START_PROCESSING_STEP_MS).toBeGreaterThan(0);
    expect(QUICK_START_PROCESSING_FINAL_STEP_MS).toBeGreaterThan(QUICK_START_PROCESSING_STEP_MS);
  });
});
