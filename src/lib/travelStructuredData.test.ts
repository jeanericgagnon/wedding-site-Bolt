import { describe, expect, it } from 'vitest';
import {
  buildTravelVenueDirectionsHref,
  normalizeTravelPortalData,
  sanitizeTravelHotels,
  sanitizeTravelRoomBlocks,
  sanitizeTravelShuttles,
} from './travelStructuredData';

describe('travelStructuredData', () => {
  it('keeps only safe public fields from structured hotel records', () => {
    expect(sanitizeTravelHotels([
      {
        id: 'hotel-1',
        name: 'Harbor Hotel',
        url: 'https://example.com/stay',
        adminEmail: 'hide@example.com',
        bookingCode: 'MAYA',
      },
      {
        id: 'hotel-2',
        name: 'Unsafe Hotel',
        url: 'javascript:alert(1)',
      },
    ])).toEqual([
      {
        id: 'hotel-1',
        name: 'Harbor Hotel',
        url: 'https://example.com/stay',
        bookingCode: 'MAYA',
      },
      {
        id: 'hotel-2',
        name: 'Unsafe Hotel',
      },
    ]);
  });

  it('normalizes room blocks and shuttles without leaking unsafe URLs or empty labels', () => {
    expect(sanitizeTravelRoomBlocks([
      {
        hotel: 'Harbor Hotel',
        bookingCode: 'WEEKEND',
        url: 'ftp://bad.example.com',
      },
    ])).toEqual([
      {
        id: 'room-block-0',
        hotelName: 'Harbor Hotel',
        bookingCode: 'WEEKEND',
      },
    ]);

    expect(sanitizeTravelShuttles([
      { label: 'Friday shuttle', route: 'Hotel to welcome party', departureTime: '4:30 PM' },
      { route: 'missing label' },
    ])).toEqual([
      {
        id: 'shuttle-0',
        label: 'Friday shuttle',
        route: 'Hotel to welcome party',
        departureTime: '4:30 PM',
      },
    ]);
  });

  it('builds a normalized structured travel payload for guest-facing surfaces', () => {
    const data = normalizeTravelPortalData({
      hotels: [{ name: 'Harbor Hotel', bookingDeadline: 'May 20' }],
      roomBlocks: [{ hotelName: 'Harbor Hotel', bookingCode: 'MAYALEO' }],
      shuttles: [{ label: 'Ceremony shuttle' }],
      visaTips: ['Bring the passport you used for the booking.'],
      culturalTips: ['Bring a light layer for the waterfront.'],
      plannerOnly: 'hide-me',
    });

    expect(data).toEqual({
      hotels: [{ id: 'hotel-0', name: 'Harbor Hotel', bookingDeadline: 'May 20' }],
      roomBlocks: [{ id: 'room-block-0', hotelName: 'Harbor Hotel', bookingCode: 'MAYALEO' }],
      shuttles: [{ id: 'shuttle-0', label: 'Ceremony shuttle' }],
      visaTips: ['Bring the passport you used for the booking.'],
      culturalTips: ['Bring a light layer for the waterfront.'],
    });
  });

  it('falls back to a safe maps query when the supplied map link is unsafe', () => {
    expect(buildTravelVenueDirectionsHref('Garden ceremony', '100 Harbor Road, Sausalito, CA', 'javascript:alert(1)'))
      .toBe('https://maps.google.com/?q=Garden%20ceremony%20100%20Harbor%20Road%2C%20Sausalito%2C%20CA');
  });
});
