import { describe, expect, it } from 'vitest';
import { buildCoordinatorEscalations } from './coordinatorEscalations';

describe('buildCoordinatorEscalations', () => {
  it('adds judgment framing to door exceptions', () => {
    type TestGuest = {
      id: string;
      name: string;
      first_name: string | null;
      last_name: string | null;
      rsvp_status: string;
      checked_in_at: string | null;
    };

    const escalations = buildCoordinatorEscalations({
      guests: [
        { id: 'g1', name: 'Alex', first_name: 'Alex', last_name: null, rsvp_status: 'pending', checked_in_at: null } as TestGuest,
      ],
      qnaItems: [],
      events: [],
      timelineState: {},
    });

    expect(escalations[0]?.title).toMatch(/Door exceptions/i);
    expect(escalations[0]?.focusTitle).toMatch(/door decisions/i);
    expect(escalations[0]?.focusDetail).toMatch(/improvise around the check-in path/i);
    expect(escalations[0]?.bestNextMove).toMatch(/Resolve the door exceptions first|normal check-in flow/i);
    expect(escalations[0]?.decisionRule).toMatch(/line keeps trusting/i);
    expect(escalations[0]?.watchout).toMatch(/workaround|unofficial flow/i);
    expect(escalations[0]?.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(escalations[0]?.sequence[0]?.title).toMatch(/exceptions at the door/i);
  });

  it('keeps the all-clear state framed as restraint', () => {
    const escalations = buildCoordinatorEscalations({
      guests: [],
      qnaItems: [],
      events: [],
      timelineState: {},
    });

    expect(escalations[0]?.title).toMatch(/calm/i);
    expect(escalations[0]?.focusTitle).toMatch(/command board in reserve/i);
    expect(escalations[0]?.focusDetail).toMatch(/not an invitation to manufacture motion/i);
    expect(escalations[0]?.bestNextMove).toMatch(/Leave the board calm|next-best action/i);
    expect(escalations[0]?.decisionRule).toMatch(/preserve the calm/i);
    expect(escalations[0]?.watchout).toMatch(/manufactured motion|real change/i);
    expect(escalations[0]?.sequence[2]?.detail).toMatch(/true live exception|urgency again/i);
  });
});
