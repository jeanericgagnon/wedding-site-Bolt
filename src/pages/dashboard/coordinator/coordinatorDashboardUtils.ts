import { isAttendingRsvpStatus, isPendingRsvpStatus } from '../../../lib/rsvpStatus';
import type { GuestLiteForCoordinator } from '../../../lib/coordinatorTypes';
import { formatCoordinatorEventDateTime } from '../coordinatorEventTime';
import type { AlertLog, AudienceOption, EventLite } from './coordinatorDashboardTypes';

export function buildCoordinatorGuestStats(guests: GuestLiteForCoordinator[]) {
  return {
    total: guests.length,
    confirmed: guests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status)).length,
    pending: guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status)).length,
    checkedIn: guests.filter((guest) => Boolean(guest.checked_in_at)).length,
  };
}

export function sortCoordinatorGuests(guests: GuestLiteForCoordinator[]) {
  return [...guests].sort((a, b) => {
    const aChecked = Boolean(a.checked_in_at);
    const bChecked = Boolean(b.checked_in_at);
    if (aChecked !== bChecked) return aChecked ? 1 : -1;
    const al = (a.last_name || '').toLowerCase();
    const bl = (b.last_name || '').toLowerCase();
    if (al !== bl) return al.localeCompare(bl);
    return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
  });
}

export function buildCoordinatorEventAudienceOptions(
  events: EventLite[],
  eventGuestIds: Record<string, Set<string>>,
): AudienceOption[] {
  return events.map((event) => ({
    value: `event:${event.id}`,
    label: `${event.event_name}${event.start_time ? ` — ${formatCoordinatorEventDateTime(event.start_time)}` : ''}`,
    count: eventGuestIds[event.id]?.size ?? 0,
  }));
}

export function getCoordinatorAlertAudienceCount(input: {
  audience: string;
  guests: GuestLiteForCoordinator[];
  eventGuestIds: Record<string, Set<string>>;
}) {
  if (input.audience.startsWith('event:')) {
    const eventId = input.audience.replace('event:', '');
    return input.eventGuestIds[eventId]?.size ?? 0;
  }
  if (input.audience === 'checked-in') return input.guests.filter((guest) => Boolean(guest.checked_in_at)).length;
  if (input.audience === 'pending') return input.guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status)).length;
  return input.guests.length;
}

export function filterCoordinatorAlertLog(input: {
  alertLog: AlertLog[];
  channelFilter: 'all' | 'email' | 'sms';
  timingFilter: 'all' | 'now' | 'scheduled';
}) {
  return input.alertLog.filter((alert) => {
    if (input.channelFilter !== 'all' && alert.channel !== input.channelFilter) return false;
    if (input.timingFilter === 'scheduled' && !alert.sendAt) return false;
    if (input.timingFilter === 'now' && Boolean(alert.sendAt)) return false;
    return true;
  });
}
