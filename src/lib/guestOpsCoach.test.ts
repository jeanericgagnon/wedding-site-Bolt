import { describe, expect, it } from 'vitest';
import { buildGuestOpsCoach, buildMessageOpsCoach } from './guestOpsCoach';

describe('buildGuestOpsCoach', () => {
  it('prioritizes missing pending email before reminder work', () => {
    const coach = buildGuestOpsCoach({
      totalGuests: 48,
      attendingGuests: 20,
      pendingResponses: 12,
      pendingWithoutEmail: 4,
      noContact: 6,
      missingMealChoices: 3,
      missingPlusOneNames: 1,
      manualFollowUp: 2,
    });

    expect(coach.primaryAction?.id).toBe('collect-pending-email');
    expect(coach.tone).toBe('urgent');
    expect(coach.actions.map((action) => action.id)).toContain('send-rsvp-reminder');
  });

  it('falls back to a healthy summary when the lane is calm', () => {
    const coach = buildGuestOpsCoach({
      totalGuests: 32,
      attendingGuests: 18,
      pendingResponses: 0,
      pendingWithoutEmail: 0,
      noContact: 0,
      missingMealChoices: 0,
      missingPlusOneNames: 0,
      manualFollowUp: 0,
    });

    expect(coach.primaryAction?.id).toBe('healthy');
    expect(coach.statusLabel).toBe('Healthy');
    expect(coach.summary).toMatch(/looks steady/i);
  });
});

describe('buildMessageOpsCoach', () => {
  it('prioritizes review work before new sends', () => {
    const coach = buildMessageOpsCoach(
      {
        totalGuests: 48,
        attendingGuests: 22,
        pendingResponses: 10,
        pendingWithoutEmail: 0,
        noContact: 0,
        missingMealChoices: 0,
        missingPlusOneNames: 0,
      },
      {
        scheduledCount: 1,
        overdueScheduledCount: 0,
        partialCount: 2,
        failedCount: 1,
        unreachedRecipientCount: 6,
      },
    );

    expect(coach.plays[0]?.id).toBe('review-partial');
    expect(coach.plays[1]?.id).toBe('review-failed');
  });

  it('suggests a reminder when review queues are clear', () => {
    const coach = buildMessageOpsCoach(
      {
        totalGuests: 48,
        attendingGuests: 22,
        pendingResponses: 10,
        pendingWithoutEmail: 0,
        noContact: 0,
        missingMealChoices: 0,
        missingPlusOneNames: 0,
      },
      {
        scheduledCount: 0,
        overdueScheduledCount: 0,
        partialCount: 0,
        failedCount: 0,
        unreachedRecipientCount: 0,
      },
    );

    expect(coach.plays[0]?.id).toBe('send-rsvp-reminder');
    expect(coach.plays.map((play) => play.id)).toContain('stage-day-of-update');
  });
});
