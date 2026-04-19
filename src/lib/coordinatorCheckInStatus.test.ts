import { describe, expect, it } from 'vitest';
import { getCoordinatorDoorStatus, getCoordinatorDoorStatusLabel } from './coordinatorCheckInStatus';

describe('coordinatorCheckInStatus', () => {
  it('marks confirmed unchecked guests as ready', () => {
    expect(getCoordinatorDoorStatus({ id: '1', first_name: 'Alex', last_name: 'Rivera', name: 'Alex Rivera', rsvp_status: 'confirmed', checked_in_at: null })).toBe('ready');
  });

  it('marks unresolved guests as needing review', () => {
    expect(getCoordinatorDoorStatus({ id: '2', first_name: 'Sam', last_name: 'Lee', name: 'Sam Lee', rsvp_status: 'pending', checked_in_at: null })).toBe('watch');
  });

  it('marks checked-in guests as done', () => {
    expect(getCoordinatorDoorStatus({ id: '3', first_name: 'Jordan', last_name: 'Kim', name: 'Jordan Kim', rsvp_status: 'confirmed', checked_in_at: '2026-04-19T10:00:00.000Z' })).toBe('done');
    expect(getCoordinatorDoorStatusLabel('watch')).toBe('Needs review');
  });
});
