import { describe, expect, it } from 'vitest';
import { buildDayOfBrainBriefing } from './dayOfBrain';

function makeInput(overrides: Partial<Parameters<typeof buildDayOfBrainBriefing>[0]> = {}) {
  return {
    daysUntilWedding: 9,
    totalGuests: 120,
    confirmedGuests: 92,
    pendingGuests: 14,
    checkedInCount: 0,
    liveIssueCount: 0,
    watchCount: 0,
    openQnaCount: 0,
    scheduledAlertCount: 1,
    invalidSeatCount: 0,
    unassignedSeatCount: 0,
    splitHouseholdCount: 0,
    isArchiveLike: false,
    ...overrides,
  };
}

describe('buildDayOfBrainBriefing', () => {
  it('prioritizes live coordinator work on the wedding day when friction is active', () => {
    const briefing = buildDayOfBrainBriefing(makeInput({
      daysUntilWedding: 0,
      checkedInCount: 18,
      liveIssueCount: 2,
      watchCount: 1,
      openQnaCount: 3,
    }));

    expect(briefing.title).toContain('coordinator mode');
    expect(briefing.focusTitle).toMatch(/guest flow/i);
    expect(briefing.decisionRule).toMatch(/coordinator calm/i);
    expect(briefing.primaryAction).toMatchObject({ target: 'coordinator' });
  });

  it('prioritizes seating drift before other work', () => {
    const briefing = buildDayOfBrainBriefing(makeInput({
      invalidSeatCount: 4,
      unassignedSeatCount: 0,
    }));

    expect(briefing.title).toContain('seating drift');
    expect(briefing.focusTitle).toMatch(/room truth/i);
    expect(briefing.decisionRule).toMatch(/downstream coordination/i);
    expect(briefing.primaryAction).toMatchObject({ target: 'seating' });
  });

  it('pushes guest follow-up when RSVP pressure is still high', () => {
    const briefing = buildDayOfBrainBriefing(makeInput({
      daysUntilWedding: 12,
      itineraryEventCount: 2,
      totalGuests: 80,
      confirmedGuests: 41,
      pendingGuests: 18,
      scheduledAlertCount: 0,
    }));

    expect(briefing.title).toContain('guest list still needs a final nudge');
    expect(briefing.focusTitle).toMatch(/guest-response gap/i);
    expect(briefing.decisionRule).toMatch(/guest follow-through beats setup polish/i);
    expect(briefing.primaryAction).toMatchObject({ target: 'guests' });
    expect(briefing.secondaryAction).toMatchObject({ target: 'messages' });
  });

  it('moves into a calm day-of readiness mode once the core work is steady', () => {
    const briefing = buildDayOfBrainBriefing(makeInput({
      daysUntilWedding: 6,
      itineraryEventCount: 2,
      pendingGuests: 4,
      confirmedGuests: 104,
      scheduledAlertCount: 2,
    }));

    expect(briefing.title).toContain('keep the live tools warm');
    expect(briefing.focusTitle).toMatch(/live layer warm/i);
    expect(briefing.decisionRule).toMatch(/live-day edges/i);
    expect(briefing.primaryAction).toMatchObject({ target: 'coordinator' });
    expect(briefing.secondaryAction).toMatchObject({ target: 'seating' });
  });

  it('asks for the itinerary spine first when the wedding is close but the schedule is empty', () => {
    const briefing = buildDayOfBrainBriefing(makeInput({
      daysUntilWedding: 5,
      itineraryEventCount: 0,
      pendingGuests: 3,
      confirmedGuests: 96,
      scheduledAlertCount: 0,
    }));

    expect(briefing.title).toContain('guest-facing schedule spine');
    expect(briefing.focusTitle).toMatch(/schedule everyone can trust/i);
    expect(briefing.decisionRule).toMatch(/itinerary truth beats every softer layer/i);
    expect(briefing.primaryAction).toMatchObject({ target: 'itinerary' });
    expect(briefing.secondaryAction).toMatchObject({ target: 'messages' });
  });
});
