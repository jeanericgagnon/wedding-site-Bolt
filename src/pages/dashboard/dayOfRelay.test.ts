import { describe, expect, it } from 'vitest';
import { buildDayOfRelayModel } from './dayOfRelay';

function makeInput(overrides: Partial<Parameters<typeof buildDayOfRelayModel>[0]> = {}) {
  return {
    daysUntilWedding: 7,
    pendingGuestCount: 6,
    invalidSeatCount: 0,
    unassignedSeatCount: 0,
    splitHouseholdCount: 0,
    liveIssueCount: 0,
    checkedInCount: 0,
    ...overrides,
  };
}

describe('buildDayOfRelayModel', () => {
  it('prioritizes seating drift before live ops', () => {
    const relay = buildDayOfRelayModel(makeInput({
      invalidSeatCount: 3,
      unassignedSeatCount: 2,
    }));

    expect(relay.headline).toContain('room needs truth');
    expect(relay.focusTitle).toMatch(/room truth/i);
    expect(relay.decisionRule).toMatch(/fix that truth/i);
    expect(relay.steps[0]).toMatchObject({ id: 'seating-drift', target: 'check-drift', status: 'current' });
  });

  it('hands the day to guest follow-up when replies are still open close to the wedding', () => {
    const relay = buildDayOfRelayModel(makeInput({
      daysUntilWedding: 4,
      pendingGuestCount: 11,
    }));

    expect(relay.headline.toLowerCase()).toContain('guest truth');
    expect(relay.focusTitle).toMatch(/RSVP truth gap/i);
    expect(relay.decisionRule).toMatch(/guest follow-up beats room work/i);
    expect(relay.steps[0]).toMatchObject({ id: 'guest-follow-up', target: 'guests' });
    expect(relay.steps[1]).toMatchObject({ target: 'messages' });
  });

  it('switches into live support mode on the wedding day', () => {
    const relay = buildDayOfRelayModel(makeInput({
      daysUntilWedding: 0,
      checkedInCount: 14,
      liveIssueCount: 2,
    }));

    expect(relay.headline).toContain('support now');
    expect(relay.focusTitle).toMatch(/support the live day/i);
    expect(relay.decisionRule).toMatch(/coordination speed/i);
    expect(relay.steps[0]).toMatchObject({ id: 'check-in', target: 'check-in' });
    expect(relay.steps[1]).toMatchObject({ id: 'coordinator', target: 'coordinator' });
  });
});
