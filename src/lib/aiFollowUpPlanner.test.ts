import { describe, expect, it } from 'vitest';
import { planFollowUpQuestions } from './aiFollowUpPlanner';

describe('aiFollowUpPlanner', () => {
  it('asks only the top high-leverage follow-ups with a max batch of 3', () => {
    const plan = planFollowUpQuestions({
      howWeMet: 'We met on Hinge and went to a concert.',
      venue: 'Amor Boutique Hotel',
    });

    expect(plan.questions.length).toBeLessThanOrEqual(3);
    expect(['event-structure', 'meeting-city']).toContain(plan.questions[0]?.key);
  });

  it('respects the remaining follow-up budget', () => {
    const plan = planFollowUpQuestions({ howWeMet: 'We met on Hinge.' }, 4, 5);
    expect(plan.remainingBudget).toBe(1);
    expect(plan.questions.length).toBeLessThanOrEqual(1);
  });
});
