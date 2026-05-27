import { describe, expect, it } from 'vitest';
import { getPlannerHandoffCopy } from './plannerHandoffState';

describe('getPlannerHandoffCopy', () => {
  it('gives planner guidance a real focus and decision rule for guests', () => {
    const model = getPlannerHandoffCopy('planner', 'guests');

    expect(model.title).toMatch(/Planner actively driving/i);
    expect(model.focusTitle).toMatch(/working lane/i);
    expect(model.focusDetail).toMatch(/guest readiness/i);
    expect(model.decisionRule).toMatch(/escalate/i);
  });

  it('keeps coordinator guidance centered on live flow', () => {
    const model = getPlannerHandoffCopy('coordinator', 'coordinator');

    expect(model.focusTitle).toMatch(/live flow/i);
    expect(model.focusDetail).toMatch(/timeline decisions|day-of updates/i);
    expect(model.decisionRule).toMatch(/live guest flow/i);
  });

  it('keeps viewer guidance in a review-only posture', () => {
    const model = getPlannerHandoffCopy('viewer', 'messages');

    expect(model.title).toMatch(/Viewer access only/i);
    expect(model.focusTitle).toMatch(/clarity, not control/i);
    expect(model.decisionRule).toMatch(/do not turn viewer access into another editing lane/i);
  });
});
