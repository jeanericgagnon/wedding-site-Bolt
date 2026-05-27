import { describe, expect, it } from 'vitest';
import { getPlannerHandoffCopy } from './plannerHandoffState';

describe('getPlannerHandoffCopy', () => {
  it('gives planner guidance a real focus and decision rule for guests', () => {
    const model = getPlannerHandoffCopy('planner', 'guests');

    expect(model.title).toMatch(/Planner actively driving/i);
    expect(model.focusTitle).toMatch(/working lane/i);
    expect(model.focusDetail).toMatch(/guest readiness/i);
    expect(model.nextMove).toMatch(/loudest pressure inside guest readiness/i);
    expect(model.decisionRule).toMatch(/escalate/i);
    expect(model.watchout).toMatch(/pseudo-owner decision|real blocker/i);
    expect(model.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(model.sequence[0]?.title).toMatch(/operational pressure/i);
  });

  it('keeps coordinator guidance centered on live flow', () => {
    const model = getPlannerHandoffCopy('coordinator', 'coordinator');

    expect(model.focusTitle).toMatch(/live flow/i);
    expect(model.focusDetail).toMatch(/timeline decisions|day-of updates/i);
    expect(model.nextMove).toMatch(/live pressure that guests can already feel/i);
    expect(model.decisionRule).toMatch(/live guest flow/i);
    expect(model.watchout).toMatch(/absorbs broader planning truth|team loses clarity/i);
    expect(model.sequence[1]?.detail).toMatch(/real time|live lane|broader planning/i);
  });

  it('keeps viewer guidance in a review-only posture', () => {
    const model = getPlannerHandoffCopy('viewer', 'messages');

    expect(model.title).toMatch(/Viewer access only/i);
    expect(model.focusTitle).toMatch(/clarity, not control/i);
    expect(model.nextMove).toMatch(/confirm facts and collect questions/i);
    expect(model.decisionRule).toMatch(/do not turn viewer access into another editing lane/i);
    expect(model.watchout).toMatch(/good intentions|really carrying the lane/i);
    expect(model.sequence[2]?.title).toMatch(/working owner/i);
  });
});
