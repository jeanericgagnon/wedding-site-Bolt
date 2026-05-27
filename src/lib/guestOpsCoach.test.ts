import { describe, expect, it } from 'vitest';
import { buildGuestOpsCoach, buildGuestOutreachSequence, buildMessageOpsCoach } from './guestOpsCoach';

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

describe('buildGuestOutreachSequence', () => {
  it('treats contact gaps as the first unlock when pending guests are unreachable', () => {
    const plan = buildGuestOutreachSequence(
      {
        totalGuests: 64,
        attendingGuests: 28,
        pendingResponses: 12,
        pendingWithoutEmail: 5,
        noContact: 7,
        missingMealChoices: 0,
        missingPlusOneNames: 0,
      },
      {
        scheduledCount: 0,
        overdueScheduledCount: 0,
        partialCount: 0,
        failedCount: 0,
        unreachedRecipientCount: 7,
      },
    );

    expect(plan.headline).toMatch(/unlock clean outreach/i);
    expect(plan.steps[0]?.id).toBe('close-contact-gaps');
    expect(plan.steps[1]?.id).toBe('send-rsvp-reminder');
  });

  it('prioritizes delivery review before another push when message health is noisy', () => {
    const plan = buildGuestOutreachSequence(
      {
        totalGuests: 64,
        attendingGuests: 28,
        pendingResponses: 9,
        pendingWithoutEmail: 0,
        noContact: 0,
        missingMealChoices: 0,
        missingPlusOneNames: 0,
      },
      {
        scheduledCount: 2,
        overdueScheduledCount: 0,
        partialCount: 2,
        failedCount: 1,
        unreachedRecipientCount: 4,
      },
    );

    expect(plan.steps[0]?.id).toBe('review-delivery');
    expect(plan.steps[0]?.area).toBe('messages');
    expect(plan.steps[1]?.id).toBe('send-rsvp-reminder');
  });

  it('stages day-of prep when the guest lane is already calm', () => {
    const plan = buildGuestOutreachSequence(
      {
        totalGuests: 64,
        attendingGuests: 41,
        pendingResponses: 0,
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

    expect(plan.steps[0]?.id).toBe('stage-day-of-update');
    expect(plan.headline).toMatch(/work ahead/i);
  });
});
