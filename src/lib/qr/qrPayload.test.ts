import { describe, expect, it } from 'vitest';

import type { GuestLiteForCoordinator } from '../coordinatorTypes';
import { parseDayOfQrPayload, resolveCoordinatorQrPayload, isPrivateQrPayloadForThirdPartyQr } from './qrPayload';

const baseGuests: GuestLiteForCoordinator[] = [
  {
    id: 'guest-1',
    first_name: 'Maya',
    last_name: 'Patel',
    name: 'Maya Patel',
    email: 'maya@example.com',
    invite_token: 'guest-token-1',
    rsvp_status: 'confirmed',
    household_id: 'house-1',
    group_name: 'Patel',
    checked_in_at: null,
    event_arrivals: {
      'event-1': {
        seating_event_id: 'seat-1',
        table_id: 'table-1',
        table_name: 'Table 1',
        checked_in_at: null,
        is_seated: true,
      },
    },
  },
  {
    id: 'guest-2',
    first_name: 'Leo',
    last_name: 'Patel',
    name: 'Leo Patel',
    email: 'leo@example.com',
    invite_token: 'guest-token-2',
    rsvp_status: 'pending',
    household_id: 'house-1',
    group_name: 'Patel',
    checked_in_at: null,
    event_arrivals: {
      'event-1': {
        seating_event_id: 'seat-1',
        table_id: null,
        table_name: 'Unassigned',
        checked_in_at: null,
        is_seated: false,
      },
    },
  },
];

describe('parseDayOfQrPayload', () => {
  it('accepts a valid public dayof event url', () => {
    expect(parseDayOfQrPayload('https://maya-and-leo.dayof.love/event/maya-and-leo')).toMatchObject({
      kind: 'public-event-url',
      siteSlug: 'maya-and-leo',
    });
  });

  it('accepts a valid check-in token url', () => {
    expect(parseDayOfQrPayload('https://dayof.love/rsvp?token=guest-token-1')).toMatchObject({
      kind: 'guest-invite-token',
      token: 'guest-token-1',
    });
  });

  it('accepts a relative app url', () => {
    expect(parseDayOfQrPayload('/rsvp?token=guest-token-1')).toMatchObject({
      kind: 'guest-invite-token',
      token: 'guest-token-1',
    });
  });

  it('rejects malformed, wrong-host, and unsafe urls', () => {
    expect(parseDayOfQrPayload('not a url')).toMatchObject({ kind: 'invalid', reason: 'malformed' });
    expect(parseDayOfQrPayload('https://proof.invalid/rsvp?token=guest-token-1')).toMatchObject({ kind: 'invalid', reason: 'unsafe-host' });
    expect(parseDayOfQrPayload('javascript:alert(1)')).toMatchObject({ kind: 'invalid', reason: 'unsupported-scheme' });
    expect(parseDayOfQrPayload('http://169.254.169.254/latest/meta-data')).toMatchObject({ kind: 'invalid', reason: 'unsafe-host' });
  });
});

describe('resolveCoordinatorQrPayload', () => {
  const baseArgs = {
    siteSlug: 'maya-and-leo',
    currentEventName: 'Reception',
    checkInStatusContext: {
      currentEventId: 'event-1',
      eventGuestIds: { 'event-1': new Set(['guest-1', 'guest-2']) },
      eventSeatingConfiguredIds: new Set(['event-1']),
      guests: baseGuests,
    },
  };

  it('resolves a valid guest invite token to a success state', () => {
    expect(resolveCoordinatorQrPayload('https://dayof.love/rsvp?token=guest-token-1', baseArgs)).toMatchObject({
      status: 'success',
      guest: { id: 'guest-1' },
    });
  });

  it('flags already checked in guests', () => {
    const guests: GuestLiteForCoordinator[] = [
      {
        ...baseGuests[0],
        event_arrivals: {
          'event-1': {
            seating_event_id: 'seat-1',
            table_id: 'table-1',
            table_name: 'Table 1',
            checked_in_at: '2026-05-13T12:00:00.000Z',
            is_seated: true,
          },
        },
      },
    ];
    const resolution = resolveCoordinatorQrPayload('guest-token-1', {
      ...baseArgs,
      checkInStatusContext: {
        ...baseArgs.checkInStatusContext,
        guests,
      },
    });
    expect(resolution).toMatchObject({
      status: 'already-checked-in',
      guest: { id: 'guest-1' },
    });
  });

  it('rejects wrong event guests', () => {
    const resolution = resolveCoordinatorQrPayload('guest-token-1', {
      ...baseArgs,
      checkInStatusContext: {
        ...baseArgs.checkInStatusContext,
        eventGuestIds: { 'event-1': new Set(['guest-2']) },
      },
    });
    expect(resolution).toMatchObject({ status: 'wrong-event' });
  });

  it('rejects wrong-site payloads', () => {
    const resolution = resolveCoordinatorQrPayload('https://other-couple.dayof.love/rsvp?token=guest-token-1', baseArgs);
    expect(resolution).toMatchObject({ status: 'wrong-site' });
  });

  it('marks public hub qr payloads as not valid for private check-in', () => {
    const resolution = resolveCoordinatorQrPayload('https://maya-and-leo.dayof.love/event/maya-and-leo', baseArgs);
    expect(resolution).toMatchObject({ status: 'expired-invalid-token' });
  });
});

describe('isPrivateQrPayloadForThirdPartyQr', () => {
  it('rejects tokenized urls from third-party qr generation', () => {
    expect(isPrivateQrPayloadForThirdPartyQr('https://dayof.love/rsvp?token=guest-token-1')).toBe(true);
    expect(isPrivateQrPayloadForThirdPartyQr('https://dayof.love/guest-contact/maya-and-leo?invite_token=guest-token-1')).toBe(true);
    expect(isPrivateQrPayloadForThirdPartyQr('https://dayof.love/event/maya-and-leo')).toBe(false);
  });
});
