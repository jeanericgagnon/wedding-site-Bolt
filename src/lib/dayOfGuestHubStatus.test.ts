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
    });

    expect(card).toMatchObject({
      title: 'Private guest link',
      badgeLabel: 'Guest-specific',
      summary: 'Guest-specific access is active for this link.',
    });
    expect(card?.detail).toContain('Alex Rivera');
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
      summary: 'Public-only access is active for this link.',
    });
    expect(card?.detail).toContain('public wedding hub');
  });
});
