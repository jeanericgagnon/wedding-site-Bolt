import { describe, expect, it } from 'vitest';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import type { AlertLog, EventLite } from './coordinatorDashboardTypes';
import {
  buildCoordinatorEventAudienceOptions,
  buildCoordinatorGuestStats,
  filterCoordinatorAlertLog,
  getCoordinatorAlertAudienceCount,
  sortCoordinatorGuests,
} from './coordinatorDashboardUtils';

const guests: GuestLiteForCoordinator[] = [
  { id: '2', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'pending', checked_in_at: null },
  { id: '1', first_name: 'Ava', last_name: 'Brown', name: 'Ava Brown', rsvp_status: 'confirmed', checked_in_at: '2026-05-05T10:00:00Z' },
  { id: '3', first_name: 'Mia', last_name: 'Brown', name: 'Mia Brown', rsvp_status: 'attending', checked_in_at: null },
];

describe('coordinatorDashboardUtils', () => {
  it('builds coordinator guest stats and preserves queue sort order', () => {
    expect(buildCoordinatorGuestStats(guests)).toEqual({
      total: 3,
      confirmed: 2,
      pending: 1,
      checkedIn: 1,
    });

    expect(sortCoordinatorGuests(guests).map((guest) => guest.id)).toEqual(['3', '2', '1']);
  });

  it('builds event audience options and alert audience counts', () => {
    const events: EventLite[] = [
      { id: 'ceremony', event_name: 'Ceremony', start_time: '2026-05-05T16:00:00Z' },
      { id: 'brunch', event_name: 'Brunch', start_time: null },
    ];
    const eventGuestIds = {
      ceremony: new Set(['1', '2']),
      brunch: new Set(['3']),
    };

    expect(buildCoordinatorEventAudienceOptions(events, eventGuestIds)).toEqual([
      expect.objectContaining({ value: 'event:ceremony', count: 2 }),
      { value: 'event:brunch', label: 'Brunch', count: 1 },
    ]);
    expect(getCoordinatorAlertAudienceCount({ audience: 'event:ceremony', guests, eventGuestIds })).toBe(2);
    expect(getCoordinatorAlertAudienceCount({ audience: 'checked-in', guests, eventGuestIds })).toBe(1);
    expect(getCoordinatorAlertAudienceCount({ audience: 'pending', guests, eventGuestIds })).toBe(1);
    expect(getCoordinatorAlertAudienceCount({ audience: 'all', guests, eventGuestIds })).toBe(3);
  });

  it('filters alert logs by channel and timing without changing log rows', () => {
    const alertLog: AlertLog[] = [
      { id: 'email-now', subject: 'Now', audience: 'all', channel: 'email', queuedAt: '2026-05-05T10:00:00Z' },
      { id: 'sms-later', subject: 'Later', audience: 'all', channel: 'sms', queuedAt: '2026-05-05T10:05:00Z', sendAt: '2026-05-05T11:00:00Z' },
    ];

    expect(filterCoordinatorAlertLog({ alertLog, channelFilter: 'sms', timingFilter: 'all' }).map((alert) => alert.id)).toEqual(['sms-later']);
    expect(filterCoordinatorAlertLog({ alertLog, channelFilter: 'all', timingFilter: 'now' }).map((alert) => alert.id)).toEqual(['email-now']);
    expect(filterCoordinatorAlertLog({ alertLog, channelFilter: 'all', timingFilter: 'scheduled' }).map((alert) => alert.id)).toEqual(['sms-later']);
  });
});
