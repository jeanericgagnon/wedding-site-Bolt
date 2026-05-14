import { describe, expect, it } from 'vitest';
import { buildTravelGuestJourney, buildTravelGuestPortalReadiness, buildTravelVenueMapLinks } from './travelGuestPortal';

describe('travelGuestPortal', () => {
  it('marks core travel portal details ready when the owner has enough guest-facing guidance', () => {
    const readiness = buildTravelGuestPortalReadiness({
      flightInfo: 'Fly into SFO or Oakland and allow 90 minutes to reach the venue.',
      hotelInfo: 'Room block at Harbor House under the Chen Patel wedding.',
      parkingInfo: 'Use valet at the north entrance or rideshare to the garden gate.',
      notes: 'Bring a light layer for the waterfront after sunset.',
      hotelCount: 2,
      roomBlockCount: 1,
      shuttleCount: 2,
      visaTipCount: 1,
      culturalTipCount: 2,
      venueCount: 2,
      venueAddressCount: 2,
      scheduleCount: 4,
      eventInviteScoped: true,
    });

    expect(readiness.readyCount).toBe(7);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.steps.find((step) => step.id === 'guest-specific')?.status).toBe('ready');
  });

  it('surfaces missing travel details without treating empty optional context as a blocker', () => {
    const readiness = buildTravelGuestPortalReadiness({
      flightInfo: '',
      hotelInfo: '',
      parkingInfo: '',
      notes: '',
      venueCount: 1,
      venueAddressCount: 0,
      scheduleCount: 0,
      eventInviteScoped: false,
    });

    expect(readiness.steps.find((step) => step.id === 'arrival')?.status).toBe('needs-info');
    expect(readiness.steps.find((step) => step.id === 'lodging')?.status).toBe('needs-info');
    expect(readiness.steps.find((step) => step.id === 'transport')?.status).toBe('needs-info');
    expect(readiness.steps.find((step) => step.id === 'local-context')?.status).toBe('empty');
    expect(readiness.blockers).toContain('Add airport, train, shuttle, or arrival guidance.');
  });

  it('treats structured travel records as guest-ready even when the owner skips long-form summaries', () => {
    const readiness = buildTravelGuestPortalReadiness({
      hotelCount: 2,
      roomBlockCount: 1,
      shuttleCount: 1,
      visaTipCount: 1,
      culturalTipCount: 1,
      venueCount: 1,
      venueAddressCount: 1,
      scheduleCount: 1,
      eventInviteScoped: true,
    });

    expect(readiness.steps.find((step) => step.id === 'lodging')?.status).toBe('ready');
    expect(readiness.steps.find((step) => step.id === 'transport')?.status).toBe('ready');
    expect(readiness.steps.find((step) => step.id === 'local-context')?.status).toBe('ready');
    expect(readiness.steps.find((step) => step.id === 'guest-specific')?.status).toBe('ready');
  });

  it('keeps venue and schedule empty states clear before a couple has built those sections', () => {
    const readiness = buildTravelGuestPortalReadiness({
      venueCount: 0,
      venueAddressCount: 0,
      scheduleCount: 0,
      eventInviteScoped: false,
    });

    expect(readiness.steps.find((step) => step.id === 'venues')?.status).toBe('empty');
    expect(readiness.steps.find((step) => step.id === 'schedule')?.status).toBe('empty');
  });

  it('builds a safe mobile journey from travel to RSVP to photo upload', () => {
    const journey = buildTravelGuestJourney({
      siteSlug: 'maya-and-leo',
      enabledActionIds: ['travel', 'rsvp', 'photos'],
    });

    expect(journey.map((step) => step.id)).toEqual(['travel', 'rsvp', 'photos']);
    expect(journey.map((step) => step.status)).toEqual(['ready', 'ready', 'ready']);
    expect(journey.map((step) => step.href)).toEqual([
      '/site/maya-and-leo#travel',
      '/site/maya-and-leo#rsvp',
      '/photos/upload?site=maya-and-leo&hub=1',
    ]);
  });

  it('keeps disabled guest actions visible as needs-info instead of linking guests into a dead end', () => {
    const journey = buildTravelGuestJourney({
      siteSlug: 'maya-and-leo',
      enabledActionIds: ['travel'],
    });

    expect(journey.find((step) => step.id === 'travel')?.status).toBe('ready');
    expect(journey.find((step) => step.id === 'rsvp')?.status).toBe('needs-info');
    expect(journey.find((step) => step.id === 'photos')?.status).toBe('needs-info');
    expect(journey.find((step) => step.id === 'rsvp')?.href).toBe('');
    expect(journey.find((step) => step.id === 'photos')?.href).toBe('');
  });

  it('normalizes venue map links and falls back when an unsafe map URL is present', () => {
    const links = buildTravelVenueMapLinks([
      {
        id: 'ceremony',
        label: 'Garden ceremony',
        address: '100 Harbor Road, Sausalito, CA',
        mapUrl: 'https://maps.google.com/?q=Garden%20Ceremony',
      },
      {
        id: 'afterparty',
        label: 'After party',
        address: '200 Pier Street, Sausalito, CA',
        mapUrl: 'javascript:alert(1)',
      },
    ]);

    expect(links).toEqual([
      {
        id: 'ceremony',
        label: 'Garden ceremony',
        href: 'https://maps.google.com/?q=Garden%20Ceremony',
      },
      {
        id: 'afterparty',
        label: 'After party',
        href: 'https://maps.google.com/?q=After%20party%20200%20Pier%20Street%2C%20Sausalito%2C%20CA',
      },
    ]);
  });
});
