import { describe, expect, it, vi } from 'vitest';
import { createClarifyingDecisionFromInitialSetup, createClarifyingPersistenceFromDecision } from './aiOnboardingClarifyingAdapter';
import { generateClarifyingQuestionDecision } from './aiClarifyingQuestions';

vi.mock('./aiClarifyingQuestions', () => ({
  generateClarifyingQuestionDecision: vi.fn(),
}));

describe('aiOnboardingClarifyingAdapter', () => {
  it('expands event structure questions into per-event time and location prompts', async () => {
    vi.mocked(generateClarifyingQuestionDecision).mockResolvedValue({
      mode: 'ask',
      questions: [
        {
          id: 'event-structure',
          category: 'event_structure',
          question: 'Could you provide a clearer outline or schedule of the key wedding events throughout the weekend, including times if possible?',
          expectedAnswerType: 'multi_line',
          targetFields: ['event.weekendEvents'],
          affectedSections: ['schedule'],
          skippable: true,
        },
      ],
      why: ['Need clearer timing and locations'],
      confidence: 'medium',
      draftOutputs: undefined,
    });

    const decision = await createClarifyingDecisionFromInitialSetup({
      names: 'Eric & Kara',
      labelPreference: 'names-only',
      whenWhere: 'January 17, 2027 in Sayulita',
      venueNameOrTbd: 'Amor Boutique Hotel',
      style: 'Tropical',
      guestFeel: '',
      weekendEventsRaw: 'Friday welcome drinks, Saturday wedding, Sunday brunch',
      ceremonyArrivalTime: '4:30 PM',
      guestCountBand: '100-150',
      plusOnePolicy: 'some',
      childrenAllowed: 'no',
      rsvpDeadline: '2026-12-01',
      mealChoice: 'yes',
      registryIntent: '',
      optionalStory: '',
    });

    expect(decision.questions).toHaveLength(6);
    expect(decision.questions[0]?.question).toContain('welcome drinks');
    expect(decision.questions[0]?.question).toContain('what time');
    expect(decision.questions[1]?.question).toContain('where');
    expect(decision.questions[2]?.question).toContain('wedding');
    expect(decision.questions[4]?.question).toContain('brunch');

    const persistence = createClarifyingPersistenceFromDecision(decision);
    expect(persistence.clarifying.questions).toHaveLength(6);
  });
});
