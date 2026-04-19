import { describe, expect, it } from 'vitest';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';
import { normalizeQuickStartClarifyingState } from './quickStartClarifyingNormalize';

describe('quickStartClarifyingNormalize', () => {
  it('dedupes restore-time clarifying history by question id, keeping latest entry', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.history = [
      {
        id: 'event-1-time',
        category: 'event_structure',
        question: 'When is dinner?',
        expectedAnswerType: 'short_text',
        targetFields: ['events.0.time'],
        affectedSections: ['schedule'],
        skippable: true,
        round: 1,
        status: 'answered',
        answer: '5:00 PM',
      },
      {
        id: 'event-1-time',
        category: 'event_structure',
        question: 'When is dinner?',
        expectedAnswerType: 'short_text',
        targetFields: ['events.0.time'],
        affectedSections: ['schedule'],
        skippable: true,
        round: 1,
        status: 'answered',
        answer: '6:00 PM',
      },
    ];

    const normalized = normalizeQuickStartClarifyingState(clarifying);

    expect(normalized?.clarifying.history).toHaveLength(1);
    expect(normalized?.clarifying.history[0].answer).toBe('6:00 PM');
  });

  it('keeps null clarifying state unchanged', () => {
    expect(normalizeQuickStartClarifyingState(null)).toBeNull();
  });
});
