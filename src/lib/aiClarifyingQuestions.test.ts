import { describe, expect, it } from 'vitest';
import { buildClarifyingQuestionSystemPrompt, buildClarifyingQuestionUserPrompt, fallbackClarifyingQuestionDecision } from './aiClarifyingQuestions';

describe('aiClarifyingQuestions', () => {
  it('builds prompts and deterministic fallback cleanly', () => {
    const system = buildClarifyingQuestionSystemPrompt();
    const user = buildClarifyingQuestionUserPrompt({
      intakeSummary: 'Destination wedding with welcome dinner and wedding day, but guest expectations are still vague.',
      knownResolved: ['Names', 'Date', 'Location'],
      knownUnresolved: ['Weekend event structure is rough', 'Guests are mostly traveling in', 'Registry posture unclear'],
      readinessSummary: 'Enough to draft basics, but guest guidance would still be generic.',
    });

    const fallback = fallbackClarifyingQuestionDecision({
      intakeSummary: 'Destination wedding with welcome dinner and wedding day, but guest expectations are still vague.',
      knownResolved: ['Names', 'Date', 'Location'],
      knownUnresolved: ['Weekend event structure is rough', 'Guests are mostly traveling in', 'Registry posture unclear'],
      readinessSummary: 'Enough to draft basics, but guest guidance would still be generic.',
    });

    expect(system).toContain('Ask 0 to 3 questions maximum');
    expect(user).toContain('Current intake summary');
    expect(fallback.shouldAskFollowUps).toBe(true);
    expect(fallback.questions.length).toBeGreaterThan(0);
    expect(fallback.questions.length).toBeLessThanOrEqual(3);
  });
});
