import { describe, expect, it } from 'vitest';
import { buildDashboardRoleGuide } from './dashboardRoleGuide';

describe('buildDashboardRoleGuide', () => {
  it('keeps planner handoff copy focused on the working surfaces they actually need', () => {
    const guide = buildDashboardRoleGuide('planner');

    expect(guide.label).toBe('Planner handoff');
    expect(guide.title).toMatch(/planning workspace/i);
    expect(guide.detail).toMatch(/Guests, planning, messages, seating, and live-day tools/i);
    expect(guide.focusTitle).toMatch(/Move the plan forward/i);
    expect(guide.nextMove).toMatch(/Overview, then move into Guests, Planning, or Messages/i);
    expect(guide.decisionRule).toMatch(/brand, billing, or final ownership calls/i);
    expect(guide.watchout).toMatch(/owner-call churn|ownership truth/i);
    expect(guide.sequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(guide.sequence[0]?.title).toMatch(/operational pressure/i);
  });

  it('keeps viewer copy explicit about the read-only experience', () => {
    const guide = buildDashboardRoleGuide('viewer');

    expect(guide.label).toBe('Read-only handoff');
    expect(guide.detail).toMatch(/without exposing editing controls/i);
    expect(guide.focusTitle).toMatch(/Review for clarity/i);
    expect(guide.nextMove).toMatch(/Overview, then open the relevant page/i);
    expect(guide.decisionRule).toMatch(/not to become another editing lane/i);
    expect(guide.watchout).toMatch(/shadow ownership|route the question back/i);
    expect(guide.sequence[2]?.detail).toMatch(/couple|owners/i);
  });

  it('keeps coordinator handoff guidance centered on guest-facing day-of pressure', () => {
    const guide = buildDashboardRoleGuide('coordinator');

    expect(guide.label).toBe('Coordinator handoff');
    expect(guide.focusTitle).toMatch(/guest-facing path/i);
    expect(guide.nextMove).toMatch(/day-of pressure/i);
    expect(guide.decisionRule).toMatch(/guest-facing flow|day-of calm/i);
    expect(guide.watchout).toMatch(/day-of window|under pressure/i);
    expect(guide.sequence[0]?.title).toMatch(/day-of pressure/i);
    expect(guide.sequence[1]?.title).toMatch(/day-of control lane/i);
  });
});
