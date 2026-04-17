import { describe, expect, it } from 'vitest';
import { createClarifyingPersistenceFromDecision } from './aiOnboardingClarifyingAdapter';

describe('aiOnboardingClarifyingAdapter', () => {
  it('turns a clarifying decision into persistence state', () => {
    const value = createClarifyingPersistenceFromDecision({
      mode: 'ask',
      questions: [
        {
          id: 'weekend_events_overview',
          category: 'event_structure',
          question: 'What events are actually happening across the weekend, even if rough?',
          expectedAnswerType: 'short_text',
          targetFields: ['eventSeeds'],
          affectedSections: ['schedule', 'faq'],
          skippable: true,
        },
      ],
      why: ['Improves guest clarity.'],
      confidence: 'medium',
    });

    expect(value.clarifying.mode).toBe('ask');
    expect(value.clarifying.questions[0].status).toBe('pending');
    expect(value.draftOutputs).toEqual({});
  });
});
