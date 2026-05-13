import { describe, expect, it } from 'vitest';
import { buildCoordinatorDoorEscalationPrompt } from './coordinatorDoorEscalation';

describe('coordinatorDoorEscalation', () => {
  it('builds a door-review escalation prompt from the guest state', () => {
    expect(buildCoordinatorDoorEscalationPrompt({
      id: '1',
      first_name: 'Sam',
      last_name: 'Lee',
      name: 'Sam Lee',
      rsvp_status: 'pending',
      checked_in_at: null,
    })).toBe('Sam Lee needs a door decision — RSVP unresolved. Confirm whether to allow check-in, reroute, or update their status.');
  });
});
