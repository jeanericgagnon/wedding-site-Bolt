import { describe, expect, it } from 'vitest';
import { buildCollaboratorRoleGuide } from './collaboratorRoleGuide';

describe('buildCollaboratorRoleGuide', () => {
  it('keeps planner guidance focused on operational planning pressure', () => {
    const guide = buildCollaboratorRoleGuide('planner');

    expect(guide.label).toBe('Planner access');
    expect(guide.focusTitle).toMatch(/planning pressure/i);
    expect(guide.nextMove).toMatch(/Guests, Planning, or Messages/i);
    expect(guide.decisionRule).toMatch(/brand, billing, or final ownership calls/i);
  });

  it('keeps coordinator guidance oriented around live operations', () => {
    const guide = buildCollaboratorRoleGuide('coordinator');

    expect(guide.label).toBe('Coordinator access');
    expect(guide.focusTitle).toMatch(/live path/i);
    expect(guide.nextMove).toMatch(/Coordinator Mode|Itinerary/i);
    expect(guide.decisionRule).toMatch(/guest flow|day-of calm/i);
  });

  it('keeps viewer guidance explicit about read-only review', () => {
    const guide = buildCollaboratorRoleGuide('viewer');

    expect(guide.label).toBe('Read-only access');
    expect(guide.focusTitle).toMatch(/Review for clarity/i);
    expect(guide.decisionRule).toMatch(/review and surface questions/i);
  });
});
