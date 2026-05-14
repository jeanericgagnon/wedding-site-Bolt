import { describe, expect, it } from 'vitest';

import { buildDemoGuestItinerarySnapshot } from './demoGuestItinerary';

describe('buildDemoGuestItinerarySnapshot', () => {
  it('gives every demo guest ceremony and reception while varying welcome and brunch access', () => {
    const snapshot = buildDemoGuestItinerarySnapshot();

    expect(snapshot.itineraryEvents.map((event) => event.event_name)).toEqual([
      'Welcome Dinner',
      'Ceremony',
      'Reception',
      'Sunday Brunch',
    ]);

    expect(snapshot.guestInvitedEventIds.get('confirmed-guest-0')).toEqual([
      'welcome-dinner-id',
      'ceremony-id',
      'reception-id',
      'brunch-id',
    ]);
    expect(snapshot.guestInvitedEventIds.get('confirmed-guest-1')).toEqual([
      'ceremony-id',
      'reception-id',
    ]);
    expect(snapshot.guestInvitedEventIds.get('confirmed-guest-2')).toEqual([
      'welcome-dinner-id',
      'ceremony-id',
      'reception-id',
    ]);
  });

  it('builds event-to-guest visibility sets for the guest dashboard filters', () => {
    const snapshot = buildDemoGuestItinerarySnapshot();

    expect(snapshot.eventInviteGuestMap.get('welcome-dinner-id')?.has('confirmed-guest-0')).toBe(true);
    expect(snapshot.eventInviteGuestMap.get('welcome-dinner-id')?.has('confirmed-guest-1')).toBe(false);
    expect(snapshot.eventInviteGuestMap.get('brunch-id')?.has('confirmed-guest-0')).toBe(true);
    expect(snapshot.eventInviteGuestMap.get('brunch-id')?.has('confirmed-guest-1')).toBe(false);
    expect(snapshot.eventInviteGuestMap.get('ceremony-id')?.has('confirmed-guest-1')).toBe(true);
    expect(snapshot.eventInviteGuestMap.get('reception-id')?.has('pending-guest-90')).toBe(true);
  });
});
