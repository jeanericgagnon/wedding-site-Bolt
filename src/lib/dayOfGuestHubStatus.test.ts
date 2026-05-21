import { describe, expect, it } from 'vitest';
import { buildGuestHubAnnouncementCard, buildGuestHubCoordinatorHandoffCard, buildGuestHubGuestStateCard, buildGuestHubLinkAccessCard } from './dayOfGuestHubStatus';

describe('dayOfGuestHubStatus', () => {
  it('builds a guest-safe announcement card without leaking token params', () => {
    const card = buildGuestHubAnnouncementCard({
      title: 'Day-of update',
      detail: 'Open https://dayof.love/event/maya-and-leo?token=secret-token now.',
      status: 'scheduled',
      scheduledFor: '2026-05-14T17:00:00.000Z',
    });

    expect(card).toMatchObject({
      title: 'Day-of update',
      stateLabel: 'Scheduled',
    });
    expect(card?.detail).toContain('token=[hidden]');
    expect(card?.timingLabel).toContain('Scheduled for');
  });

  it('drops impossible announcement timestamps instead of rolling them forward', () => {
    const card = buildGuestHubAnnouncementCard({
      title: 'Day-of update',
      detail: 'Schedule is almost ready.',
      status: 'scheduled',
      scheduledFor: '2027-02-30',
    });

    expect(card?.timingLabel).toBeNull();
  });

  it('builds guest RSVP and check-in status readback', () => {
    const card = buildGuestHubGuestStateCard({
      guestName: 'Alex Rivera',
      rsvpStatus: 'confirmed',
      checkedInAt: '2026-05-14T16:10:00.000Z',
    });

    expect(card).toMatchObject({
      guestLabel: 'Alex Rivera',
      rsvpLabel: 'RSVP confirmed',
    });
    expect(card?.checkInLabel).toContain('Checked in');
  });

  it('formats date-only check-in timestamps as the saved local calendar day', () => {
    const card = buildGuestHubGuestStateCard({
      guestName: 'Alex Rivera',
      rsvpStatus: 'confirmed',
      checkedInAt: '2026-09-12',
    });

    expect(card?.checkInLabel).toContain(new Date(2026, 8, 12).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }));
  });

  it('builds a guest-safe coordinator handoff card without leaking token params', () => {
    const card = buildGuestHubCoordinatorHandoffCard({
      eventName: 'Reception',
      handoffStatus: 'needs-decision',
      leadName: 'Sam',
      supportName: 'Jordan',
      note: 'Check shuttle hold point and ignore token=secret-value',
      updatedAt: '2026-05-14T17:20:00.000Z',
    });

    expect(card).toMatchObject({
      eventLabel: 'Reception',
      statusLabel: 'Needs decision',
      staffLabel: 'Sam · Jordan',
    });
    expect(card?.noteLabel).toContain('token=[hidden]');
    expect(card?.updatedLabel).toContain('Updated');
  });

  it('builds a guest-specific private link access card without leaking raw token details', () => {
    const card = buildGuestHubLinkAccessCard({
      hasGuestInviteToken: true,
      guestName: 'Alex Rivera',
      enabledActionIds: ['rsvp', 'updates', 'travel', 'photos'],
    });

    expect(card).toMatchObject({
      title: 'Guest-specific link',
      badgeLabel: 'Guest-specific',
      summary: 'This link is ready for guest-specific RSVP and check-in readback.',
      actionCountLabel: '4 guest actions are ready from this link.',
      actionSummaryLabel: 'RSVP, latest updates, travel details, and photo upload',
      readyCoreActionCountLabel: '3 of 4 core day-of actions are ready from this link.',
      coreActionCoverageLabel: '75% core day-of coverage is ready from this link (3 of 4).',
      coreActionSummaryLabel: '1 of 4 core day-of actions is still missing from this link: schedule.',
      mainGapLabel: 'Main gap: Add schedule to this link.',
    });
    expect(card?.detail).toContain('Alex Rivera');
  });

  it('builds an invite-only link access card when a private event link exists without guest-specific state', () => {
    const card = buildGuestHubLinkAccessCard({
      hasGuestInviteToken: false,
      hasInviteToken: true,
      hasPasswordSession: false,
    });

    expect(card).toMatchObject({
      title: 'Invite-only event link',
      badgeLabel: 'Invite-only',
      summary: 'This link is ready for invite-only event details without guest-specific RSVP or check-in readback.',
      actionCountLabel: 'No guest actions are ready from this link yet.',
      actionSummaryLabel: null,
      readyCoreActionCountLabel: null,
      coreActionCoverageLabel: 'No core day-of actions are ready from this link yet.',
      coreActionSummaryLabel: '4 of 4 core day-of actions are still missing from this link: RSVP, schedule, travel details, and photo upload.',
      mainGapLabel: 'Main gap: Add RSVP, schedule, travel details, and photo upload to this link.',
    });
    expect(card?.detail).toContain('invite-only wedding details');
  });

  it('keeps the all-clear core day-of readback explicit when every core action is ready', () => {
    const card = buildGuestHubLinkAccessCard({
      hasGuestInviteToken: true,
      guestName: 'Alex Rivera',
      enabledActionIds: ['rsvp', 'schedule', 'travel', 'photos'],
    });

    expect(card).toMatchObject({
      title: 'Guest-specific link',
      badgeLabel: 'Guest-specific',
      actionCountLabel: '4 guest actions are ready from this link.',
      actionSummaryLabel: 'RSVP, schedule, travel details, and photo upload',
      readyCoreActionCountLabel: '4 of 4 core day-of actions are ready from this link.',
      coreActionCoverageLabel: '100% of core day-of actions are ready from this link: RSVP, schedule, travel details, and photo upload.',
      coreActionSummaryLabel: 'All 4 core day-of actions are ready from this link. This link covers RSVP, schedule details, travel details, and photo follow-through.',
      mainGapLabel: null,
    });
  });

  it('builds a public-only link access card when no invite artifacts are present', () => {
    const card = buildGuestHubLinkAccessCard({
      hasGuestInviteToken: false,
      hasInviteToken: false,
      hasPasswordSession: false,
    });

    expect(card).toMatchObject({
      title: 'Public wedding link',
      badgeLabel: 'Public',
      summary: 'This link is public only and does not include private event details or guest-specific readback.',
      actionCountLabel: 'No guest actions are ready from this link yet.',
      actionSummaryLabel: null,
      readyCoreActionCountLabel: null,
      coreActionCoverageLabel: 'No core day-of actions are ready from this link yet.',
      coreActionSummaryLabel: '4 of 4 core day-of actions are still missing from this link: RSVP, schedule, travel details, and photo upload.',
      mainGapLabel: 'Main gap: Add RSVP, schedule, travel details, and photo upload to this link.',
    });
    expect(card?.detail).toContain('public wedding hub');
  });
});
