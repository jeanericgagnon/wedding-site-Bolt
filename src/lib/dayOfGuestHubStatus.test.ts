import { describe, expect, it } from 'vitest';
import { buildGuestHubAnnouncementCard, buildGuestHubGuestStateCard } from './dayOfGuestHubStatus';

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
});
