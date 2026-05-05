import { describe, expect, it } from 'vitest';
import { createEmptyInitialSetupAnswers } from './initialSetupAnswers';
import { applyQuickStartQualityGate, evaluateQuickStartDraftQuality } from './quickStartQualityGate';

describe('quickStartQualityGate', () => {
  it('adds a small number of high-value follow-ups before writing a thin starter draft', () => {
    const answers = {
      ...createEmptyInitialSetupAnswers(),
      names: 'Maya & Leo',
      whenWhere: '2027-06-12 - Santa Barbara, CA',
      style: 'coastal and warm',
    };

    const gate = evaluateQuickStartDraftQuality(answers);
    expect(gate.ready).toBe(false);
    expect(gate.questions).toHaveLength(3);
    expect(gate.questions.map((question) => question.id)).toEqual([
      'quality-event-structure',
      'quality-guest-timing',
      'quality-guest-rules',
    ]);
  });

  it('lets strong intake draft without adding another loop', () => {
    const answers = {
      ...createEmptyInitialSetupAnswers(),
      names: 'Maya & Leo',
      whenWhere: '2027-06-12 - Santa Barbara, CA',
      venueNameOrTbd: 'The Montecito Club',
      style: 'coastal and warm',
      guestFeel: 'welcomed and relaxed',
      weekendEventsRaw: 'Friday welcome drinks, Saturday ceremony and reception, Sunday brunch',
      ceremonyArrivalTime: '4:30 PM',
      plusOnePolicy: 'some' as const,
      childrenAllowed: 'no' as const,
      rsvpDeadline: '2027-05-01',
    };

    const gated = applyQuickStartQualityGate({
      mode: 'draft',
      questions: [],
      why: [],
      confidence: 'high',
      draftOutputs: undefined,
    }, answers);

    expect(gated.gate.ready).toBe(true);
    expect(gated.decision.mode).toBe('draft');
  });

  it('does not keep asking after the first follow-up loop', () => {
    const answers = {
      ...createEmptyInitialSetupAnswers(),
      names: 'Maya & Leo',
      whenWhere: '2027-06-12 - Santa Barbara, CA',
    };

    const gated = applyQuickStartQualityGate({
      mode: 'draft',
      questions: [],
      why: [],
      confidence: 'medium',
      draftOutputs: undefined,
    }, answers, {}, 1);

    expect(gated.gate.ready).toBe(false);
    expect(gated.decision.mode).toBe('draft');
  });
});
