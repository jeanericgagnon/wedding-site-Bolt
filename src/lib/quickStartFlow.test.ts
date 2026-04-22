import { describe, expect, it } from 'vitest';
import { createEmptyInitialSetupAnswers } from './initialSetupAnswers';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';
import { applyQuickStartAnswer, mergeClarifyingAnswer } from './quickStartFlow';

describe('quickStartFlow', () => {
  it('applies guest feel answers without dropping them from the final quick start snapshot', () => {
    const base = createEmptyInitialSetupAnswers();
    const next = applyQuickStartAnswer(base, 'guestFeel', 'Warm, relaxed, intimate');

    expect(next.guestFeel).toBe('Warm, relaxed, intimate');
  });

  it('builds a fresh clarifying envelope from the latest typed follow-up answer', () => {
    const base = createEmptyClarifyingPersistence();
    base.clarifying.questions = [
      {
        id: 'event-1-time',
        category: 'event_structure',
        question: 'Friday welcome drinks: what time is it?',
        expectedAnswerType: 'short_text',
        targetFields: ['events.0.time'],
        affectedSections: ['schedule'],
        skippable: true,
        round: 1,
        status: 'pending',
        answer: '',
      },
    ];

    const updated = mergeClarifyingAnswer(base, 'event-1-time', '6:30 PM');

    expect(updated).not.toBeNull();
    expect(updated?.clarifying.questions[0].answer).toBe('6:30 PM');
    expect(updated?.clarifying.questions[0].status).toBe('answered');
    expect(updated?.clarifying.history[updated.clarifying.history.length - 1]?.answer).toBe('6:30 PM');
  });

  it('replaces prior history for the same follow-up instead of stacking stale answers', () => {
    const base = createEmptyClarifyingPersistence();
    base.clarifying.questions = [
      {
        id: 'event-1-time',
        category: 'event_structure',
        question: 'Friday welcome drinks: what time is it?',
        expectedAnswerType: 'short_text',
        targetFields: ['events.0.time'],
        affectedSections: ['schedule'],
        skippable: true,
        round: 1,
        status: 'pending',
        answer: '',
      },
    ];
    base.clarifying.history = [
      {
        ...base.clarifying.questions[0],
        status: 'answered',
        answer: '5:00 PM',
      },
    ];

    const updated = mergeClarifyingAnswer(base, 'event-1-time', '6:30 PM');

    expect(updated?.clarifying.history).toHaveLength(1);
    expect(updated?.clarifying.history[0]?.answer).toBe('6:30 PM');
  });

  it('normalizes sparse partner label answers before applying them', () => {
    const base = createEmptyInitialSetupAnswers();

    expect(applyQuickStartAnswer(base, 'partnerLabels', ' Bride | Groom ').labelPreference).toBe('bride-groom');
    expect(applyQuickStartAnswer(base, 'partnerLabels', 'groom | groom').labelPreference).toBe('groom-groom');
  });

  it('normalizes sparse enum answers before applying them', () => {
    const base = createEmptyInitialSetupAnswers();

    expect(applyQuickStartAnswer(base, 'guestCount', ' 100-150 ').guestCountBand).toBe('100-150');
    expect(applyQuickStartAnswer(base, 'plusOnePolicy', ' SOME ').plusOnePolicy).toBe('some');
    expect(applyQuickStartAnswer(base, 'childrenAllowed', ' Unsure ').childrenAllowed).toBe('unsure');
    expect(applyQuickStartAnswer(base, 'mealChoice', ' YES ').mealChoice).toBe('yes');
    expect(applyQuickStartAnswer(base, 'registryIntent', ' BOTH ').registryIntent).toBe('both');
  });
});
