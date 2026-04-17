import { describe, expect, it } from 'vitest';
import { buildClarifyingQuestionSystemPrompt, buildClarifyingQuestionUserPrompt } from './aiClarifyingQuestions';

describe('aiClarifyingQuestions', () => {
  it('builds prompts cleanly for the unified ask-or-draft contract', () => {
    const system = buildClarifyingQuestionSystemPrompt();
    const user = buildClarifyingQuestionUserPrompt({
      intakeSummary: 'Destination wedding with welcome dinner and wedding day, but guest expectations are still vague.',
      knownResolved: ['Names', 'Date', 'Location'],
      knownUnresolved: ['Weekend event structure is rough', 'Guests are mostly traveling in'],
      readinessSummary: 'Enough to draft basics, but guest guidance would still be generic.',
    });

    expect(system).toContain('1. ask a very small number of high-value, structured clarifying questions');
    expect(system).toContain('2. return draft-ready structured website outputs if the intake is already strong enough');
    expect(user).toContain('Current intake summary');
    expect(user).toContain('Decide whether to ask structured clarifying questions or return draft-ready outputs.');
  });
});
