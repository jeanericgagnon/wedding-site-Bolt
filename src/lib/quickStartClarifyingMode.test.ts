import { describe, expect, it } from 'vitest';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';
import { normalizeQuickStartClarifyingMode } from './quickStartClarifyingMode';

describe('quickStartClarifyingMode', () => {
  it('forces ask mode when resumable clarifying questions exist', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.mode = 'draft';
    clarifying.clarifying.questions = [{
      id: 'q1',
      category: 'event_structure',
      question: 'When is dinner?',
      expectedAnswerType: 'short_text',
      targetFields: ['events.0.time'],
      affectedSections: ['schedule'],
      skippable: true,
      round: 1,
      status: 'pending',
      answer: '',
    }];

    expect(normalizeQuickStartClarifyingMode(clarifying)?.clarifying.mode).toBe('ask');
  });

  it('forces draft mode when no clarifying questions remain', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.mode = 'ask';

    expect(normalizeQuickStartClarifyingMode(clarifying)?.clarifying.mode).toBe('draft');
  });

  it('forces draft mode when every clarifying question is already answered', () => {
    const clarifying = createEmptyClarifyingPersistence();
    clarifying.clarifying.mode = 'ask';
    clarifying.clarifying.questions = [{
      id: 'q1',
      category: 'event_structure',
      question: 'When is dinner?',
      expectedAnswerType: 'short_text',
      targetFields: ['events.0.time'],
      affectedSections: ['schedule'],
      skippable: true,
      round: 1,
      status: 'answered',
      answer: '6:00 PM',
    }];

    expect(normalizeQuickStartClarifyingMode(clarifying)?.clarifying.mode).toBe('draft');
  });
});
