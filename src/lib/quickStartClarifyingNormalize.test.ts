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

  it('dedupes active clarifying questions by id, keeping the latest question state', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.questions = [
      {
        id: 'lodging',
        category: 'travel',
        question: 'Where should guests stay?',
        expectedAnswerType: 'short_text',
        targetFields: ['travel.lodging'],
        affectedSections: ['travel'],
        skippable: true,
        round: 1,
        status: 'pending',
        answer: '',
      },
      {
        id: 'lodging',
        category: 'travel',
        question: 'Where should guests stay?',
        expectedAnswerType: 'short_text',
        targetFields: ['travel.lodging'],
        affectedSections: ['travel'],
        skippable: true,
        round: 2,
        status: 'answered',
        answer: 'Use the hotel block.',
      },
    ];

    const normalized = normalizeQuickStartClarifyingState(clarifying);

    expect(normalized?.clarifying.questions).toHaveLength(1);
    expect(normalized?.clarifying.questions[0].round).toBe(2);
    expect(normalized?.clarifying.questions[0].answer).toBe('Use the hotel block.');
  });

  it('keeps null clarifying state unchanged', () => {
    expect(normalizeQuickStartClarifyingState(null)).toBeNull();
  });
});
