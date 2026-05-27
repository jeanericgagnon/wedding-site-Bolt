import { describe, expect, it } from 'vitest';
import { buildCoordinatorEscalations } from './coordinatorEscalations';

describe('buildCoordinatorEscalations', () => {
  it('adds judgment framing to door exceptions', () => {
    const escalations = buildCoordinatorEscalations({
      guests: [
        { id: 'g1', name: 'Alex', rsvp_status: 'pending', checked_in_at: null } as any,
      ],
      qnaItems: [],
      events: [],
      timelineState: {},
    });

    expect(escalations[0]?.title).toMatch(/Door exceptions/i);
    expect(escalations[0]?.focusTitle).toMatch(/door decisions/i);
    expect(escalations[0]?.focusDetail).toMatch(/improvise around the check-in path/i);
    expect(escalations[0]?.decisionRule).toMatch(/line keeps trusting/i);
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
    expect(escalations[0]?.decisionRule).toMatch(/preserve the calm/i);
  });
});
