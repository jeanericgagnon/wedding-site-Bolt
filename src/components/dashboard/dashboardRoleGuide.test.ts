import { describe, expect, it } from 'vitest';
import { buildDashboardRoleGuide } from './dashboardRoleGuide';

describe('buildDashboardRoleGuide', () => {
  it('keeps planner handoff copy focused on the working surfaces they actually need', () => {
    const guide = buildDashboardRoleGuide('planner');

    expect(guide.label).toBe('Planner handoff');
    expect(guide.title).toMatch(/planning workspace/i);
    expect(guide.detail).toMatch(/Guests, planning, messages, seating, and live-day tools/i);
    expect(guide.focusTitle).toMatch(/Move the plan forward/i);
    expect(guide.decisionRule).toMatch(/brand, billing, or final ownership calls/i);
  });

  it('keeps viewer copy explicit about the read-only experience', () => {
    const guide = buildDashboardRoleGuide('viewer');

    expect(guide.label).toBe('Read-only handoff');
    expect(guide.detail).toMatch(/without exposing editing controls/i);
    expect(guide.focusTitle).toMatch(/Review for clarity/i);
    expect(guide.decisionRule).toMatch(/not to become another editing lane/i);
  });
});
