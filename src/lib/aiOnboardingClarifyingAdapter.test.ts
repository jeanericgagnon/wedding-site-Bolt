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
    expect(decision.questions[0]?.id).toBe('event-time-welcome-drinks-1');
    expect(decision.questions[0]?.question).toContain('welcome drinks');
    expect(decision.questions[0]?.question).toContain('what time');
    expect(decision.questions[1]?.id).toBe('event-location-welcome-drinks-1');
    expect(decision.questions[1]?.question).toContain('where');
    expect(decision.questions[2]?.id).toBe('event-time-wedding-2');
    expect(decision.questions[2]?.question).toContain('wedding');
    expect(decision.questions[4]?.id).toBe('event-time-brunch-3');
    expect(decision.questions[4]?.question).toContain('brunch');

    const persistence = createClarifyingPersistenceFromDecision(decision, 2, {
      qualityScore: 87,
      loopCount: 2,
      maxLoopCount: 3,
      fallbackUsed: false,
      provider: 'openai',
      model: 'gpt-4.1-mini',
    } as Parameters<typeof createClarifyingPersistenceFromDecision>[2] & { provider: string; model: string });
    expect(persistence.clarifying.questions).toHaveLength(6);
    expect(persistence.clarifying.questions[0]?.round).toBe(2);
    expect(persistence.meta).toEqual({
      confidence: 'medium',
      qualityScore: 87,
      loopCount: 2,
      maxLoopCount: 3,
      fallbackUsed: false,
    });
  });

  it('does not persist provider or model metadata into customer draft state', async () => {
    const persistence = createClarifyingPersistenceFromDecision({
      mode: 'draft',
      questions: [],
      why: [],
      confidence: 'high',
      draftOutputs: undefined,
    }, 1, {
      qualityScore: 95,
      provider: 'openai',
      model: 'gpt-4.1-mini',
      fallbackUsed: false,
    } as Parameters<typeof createClarifyingPersistenceFromDecision>[2] & { provider: string; model: string });

    expect(persistence.meta).toMatchObject({ confidence: 'high', qualityScore: 95, fallbackUsed: false });
    expect(persistence.meta).not.toHaveProperty('provider');
    expect(persistence.meta).not.toHaveProperty('model');
  });
});
