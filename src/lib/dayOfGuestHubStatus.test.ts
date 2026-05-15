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
      title: 'Private guest link',
      badgeLabel: 'Guest-specific',
      summary: 'Guest-specific access is active for this link, including RSVP and check-in readback.',
      actionCountLabel: '4 guest actions are ready from this link.',
      actionSummaryLabel: 'RSVP, day-of updates, travel, and photo upload',
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
      title: 'Private event access',
      badgeLabel: 'Invite-only',
      summary: 'Invite-only access is active for this link, without guest-specific RSVP or check-in readback.',
      actionCountLabel: 'No guest actions are ready from this link yet.',
      actionSummaryLabel: null,
      coreActionCoverageLabel: 'Core day-of actions are not ready from this link yet.',
      coreActionSummaryLabel: '4 of 4 core day-of actions are still missing from this link: RSVP, schedule, travel, and photo upload.',
      mainGapLabel: 'Main gap: Turn on RSVP, schedule, travel, and photo upload.',
    });
    expect(card?.detail).toContain('invite-only wedding details');
  });

  it('builds a public-only link access card when no invite artifacts are present', () => {
    const card = buildGuestHubLinkAccessCard({
      hasGuestInviteToken: false,
      hasInviteToken: false,
      hasPasswordSession: false,
    });

    expect(card).toMatchObject({
      title: 'Public site view',
      badgeLabel: 'Public',
      summary: 'Public-only access is active for this link, without private event or guest-specific readback.',
      actionCountLabel: 'No guest actions are ready from this link yet.',
      actionSummaryLabel: null,
      coreActionCoverageLabel: 'Core day-of actions are not ready from this link yet.',
      coreActionSummaryLabel: '4 of 4 core day-of actions are still missing from this link: RSVP, schedule, travel, and photo upload.',
      mainGapLabel: 'Main gap: Turn on RSVP, schedule, travel, and photo upload.',
    });
    expect(card?.detail).toContain('public wedding hub');
  });
});
