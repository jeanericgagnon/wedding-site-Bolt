import { describe, expect, it } from 'vitest';
import { deriveFollowUpAnswersFromClarifyingState } from './quickStartClarifyingRestore';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';

describe('quickStartClarifyingRestore', () => {
  it('hydrates follow-up answers from clarifying question answers when present', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.questions = [
      {
        id: 'event-1-time',
        category: 'event_structure',
        question: 'What time is the welcome party?',
        expectedAnswerType: 'short_text',
        targetFields: ['events.0.time'],
        affectedSections: ['schedule'],
        skippable: true,
        round: 1,
        status: 'answered',
        answer: '6:00 PM',
      },
    ];

    const restored = deriveFollowUpAnswersFromClarifyingState(clarifying, { 'event-1-time': 'stale value', other: 'keep me' });

    expect(restored['event-1-time']).toBe('6:00 PM');
    expect(restored.other).toBe('keep me');
  });

  it('falls back to saved follow-up answers when clarifying state is missing', () => {
    expect(deriveFollowUpAnswersFromClarifyingState(null, { foo: 'bar' })).toEqual({ foo: 'bar' });
  });
});
