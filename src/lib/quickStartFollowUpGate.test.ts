import { describe, expect, it } from 'vitest';
import { canResumeQuickStartFollowUps } from './quickStartFollowUpGate';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';

describe('quickStartFollowUpGate', () => {
  it('does not resume follow-ups when the flag is off', () => {
    const clarifying = createEmptyClarifyingPersistence();
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

    expect(canResumeQuickStartFollowUps(false, clarifying)).toBe(false);
  });

  it('does not resume follow-ups when there are no clarifying questions left', () => {
    expect(canResumeQuickStartFollowUps(true, createEmptyClarifyingPersistence())).toBe(false);
  });

  it('allows follow-up resume only when questions actually exist', () => {
    const clarifying = createEmptyClarifyingPersistence();
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

    expect(canResumeQuickStartFollowUps(true, clarifying)).toBe(true);
  });

  it('does not resume follow-ups when every clarifying question was already answered', () => {
    const clarifying = createEmptyClarifyingPersistence();
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

    expect(canResumeQuickStartFollowUps(true, clarifying)).toBe(false);
  });
});
