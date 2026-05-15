import { describe, expect, it } from 'vitest';
import { buildTravelGuestJourney, buildTravelGuestPortalReadiness, buildTravelHubSpotlight, buildTravelVenueMapLinks } from './travelGuestPortal';

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
    expect(readiness.needsInfoCount).toBe(0);
    expect(readiness.emptyCount).toBe(0);
    expect(readiness.plannedCount).toBe(0);
    expect(readiness.blockers).toEqual([]);
    expect(readiness.coverageBadges).toEqual([
      '7 of 7 travel sections ready',
      '6 of 6 guest sections ready',
      '100% guest-section coverage',
      'Stay guidance ready',
      'Weekend routing ready',
      'Arrival coverage ready',
    ]);
    expect(readiness.summary).toBe('7 ready.');
    expect(readiness.mainGapLabel).toBeNull();
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
    expect(readiness.coverageBadges).toEqual([
      '0 of 7 travel sections ready',
      '0 of 6 guest sections ready',
      '0% guest-section coverage',
      '6 guest sections still incomplete',
      'Stay guidance missing',
      'Weekend routing missing',
      'Arrival coverage missing',
    ]);
    expect(readiness.blockers).toContain('Add airport, train, shuttle, or arrival guidance.');
    expect(readiness.summary).toBe('0 ready · 4 need info · 2 empty · 1 planned. First blocker: Arrival guidance. Still missing: Arrival guidance, Lodging, Local transport, Venue addresses, Weekend schedule, Local context.');
    expect(readiness.mainGapLabel).toBe('Main gap: Arrival guidance');
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
    expect(readiness.coverageBadges).toEqual([
      '7 of 7 travel sections ready',
      '5 of 6 guest sections ready',
      '83% guest-section coverage',
      'Stay guidance ready',
      'Weekend routing ready',
      'Arrival coverage ready',
    ]);
    expect(readiness.summary).toBe('7 ready.');
    expect(readiness.mainGapLabel).toBeNull();
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
    expect(readiness.coverageBadges).toEqual([
      '0 of 7 travel sections ready',
      '0 of 6 guest sections ready',
      '0% guest-section coverage',
      '6 guest sections still incomplete',
      'Stay guidance missing',
      'Weekend routing missing',
      'Arrival coverage missing',
    ]);
    expect(readiness.summary).toBe('0 ready · 3 need info · 3 empty · 1 planned. First blocker: Arrival guidance. Still missing: Arrival guidance, Lodging, Local transport, Venue addresses, Weekend schedule, Local context.');
    expect(readiness.mainGapLabel).toBe('Main gap: Arrival guidance');
  });

  it('builds a safe mobile journey from travel to RSVP to photo upload', () => {
    const journey = buildTravelGuestJourney({
      siteSlug: 'maya-and-leo',
      enabledActionIds: ['travel', 'rsvp', 'photos'],
      guestInviteToken: 'guest-token-123',
      guestLanguage: 'fr',
    });

    expect(journey.map((step) => step.id)).toEqual(['travel', 'rsvp', 'photos']);
    expect(journey.map((step) => step.status)).toEqual(['ready', 'ready', 'ready']);
    expect(journey.map((step) => step.href)).toEqual([
      '/site/maya-and-leo?invite_token=guest-token-123&guestLang=fr#travel',
      '/site/maya-and-leo?invite_token=guest-token-123&guestLang=fr#rsvp',
      '/photos/upload?site=maya-and-leo&hub=1&invite_token=guest-token-123&guestLang=fr',
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

  it('builds a guest-hub travel spotlight with share-safe summary text', () => {
    const spotlight = buildTravelHubSpotlight({
      siteSlug: 'maya-and-leo',
      enabledActionIds: ['travel', 'rsvp', 'photos'],
      guestInviteToken: 'guest-token-123',
      guestLanguage: 'fr',
      schedule: [
        {
          id: 'evt-ceremony',
          label: 'Ceremony',
          startTimeISO: '2026-06-14T16:00:00.000Z',
          venueId: 'venue-1',
          notes: 'Arrive 15 minutes early.',
        },
      ],
      venues: [
        {
          id: 'venue-1',
          name: 'Sunset Gardens Estate',
          address: '123 Garden Lane, Napa Valley, CA 94558',
        },
      ],
      travel: {
        flightInfo: 'Fly into SFO and expect a 75 minute drive to wine country.',
        hotels: [{ name: 'Harbor Hotel', bookingCode: 'MAYALEO', url: 'https://harbor.example.com/stay' }],
        roomBlocks: [{ hotelName: 'Harbor Hotel', bookingCode: 'MAYALEO', url: 'https://harbor.example.com/block' }],
        shuttles: [{ label: 'Ceremony shuttle', route: 'Harbor Hotel to venue', notes: 'Board near the lobby fireplace.' }],
        culturalTips: ['Bring a light layer for the waterfront.'],
        parkingInfo: 'Valet opens at 3:15 PM at the garden gate.',
      },
      coupleLabel: 'Maya & Leo',
      weddingDateLabel: 'June 14, 2026',
    });

    expect(spotlight).toEqual({
      summary: '8 travel details ready from the guest hub, including 1 visible event window for this invitation, 1 route card, 2 booking links. Core travel coverage is 100%. It covers stay details, weekend timing, arrival guidance.',
      travelHref: '/site/maya-and-leo?invite_token=guest-token-123&guestLang=fr#travel',
      badges: ['Invite-scoped', '1 event window', '1 route card', '2 booking links', '3 of 3 core travel layers ready', '100% core travel coverage', 'Stay ready', 'Weekend timing ready', 'Arrival ready'],
      mainGapLabel: null,
      cards: [
        { id: 'hotel', label: 'Harbor Hotel', detail: 'Code MAYALEO', href: 'https://harbor.example.com/stay' },
        { id: 'room-block', label: 'Room block', detail: 'Harbor Hotel · Code MAYALEO', href: 'https://harbor.example.com/block' },
        { id: 'shuttle', label: 'Ceremony shuttle', detail: 'Harbor Hotel to venue · Board near the lobby fireplace.' },
        { id: 'parking', label: 'Parking', detail: 'Valet opens at 3:15 PM at the garden gate.' },
        { id: 'flight-info', label: 'Arrival guidance', detail: 'Fly into SFO and expect a 75 minute drive to wine country.' },
        { id: 'cultural-tip', label: 'Local tip', detail: 'Bring a light layer for the waterfront.' },
        { id: 'event-window-0', label: 'Ceremony', detail: 'Sun, Jun 14, 4:00 PM · Sunset Gardens Estate · Arrive 15 minutes early.' },
        {
          id: 'venue-route-0',
          label: 'Directions · Sunset Gardens Estate',
          detail: '123 Garden Lane, Napa Valley, CA 94558',
          href: 'https://maps.google.com/?q=Sunset%20Gardens%20Estate%20123%20Garden%20Lane%2C%20Napa%20Valley%2C%20CA%2094558',
        },
      ],
      shareText: [
        'DayOf travel quick plan',
        'Guide reflects the events visible for this invitation.',
        'Coverage: Invite-scoped · 1 event window · 1 route card · 2 booking links · 3 of 3 core travel layers ready · 100% core travel coverage · Stay ready · Weekend timing ready · Arrival ready',
        'Harbor Hotel: Code MAYALEO',
        'Room block: Harbor Hotel · Code MAYALEO',
        'Ceremony shuttle: Harbor Hotel to venue · Board near the lobby fireplace.',
        'Parking: Valet opens at 3:15 PM at the garden gate.',
        'Arrival guidance: Fly into SFO and expect a 75 minute drive to wine country.',
        'Local tip: Bring a light layer for the waterfront.',
        'Ceremony: Sun, Jun 14, 4:00 PM · Sunset Gardens Estate · Arrive 15 minutes early.',
        'Directions · Sunset Gardens Estate: 123 Garden Lane, Napa Valley, CA 94558',
        'Travel page: /site/maya-and-leo?invite_token=guest-token-123&guestLang=fr#travel',
      ].join('\n'),
      htmlDocument: expect.stringContaining('<title>Maya &amp; Leo travel guide</title>'),
      filename: 'maya-and-leo-travel-guide.html',
    });
    expect(spotlight?.htmlDocument).toContain('Open the live travel page');
    expect(spotlight?.htmlDocument).toContain('This guide reflects the events visible for this invitation.');
    expect(spotlight?.htmlDocument).toContain('Invite-scoped · 1 event window · 1 route card · 2 booking links · 3 of 3 core travel layers ready · 100% core travel coverage · Stay ready · Weekend timing ready · Arrival ready');
    expect(spotlight?.htmlDocument).toContain('https://harbor.example.com/stay');
    expect(spotlight?.htmlDocument).toContain('Valet opens at 3:15 PM at the garden gate.');
    expect(spotlight?.htmlDocument).not.toContain('guest-token-123</');
  });

  it('keeps multiple visible events and route cards in the guest travel spotlight', () => {
    const spotlight = buildTravelHubSpotlight({
      siteSlug: 'maya-and-leo',
      enabledActionIds: ['travel'],
      guestInviteToken: 'guest-token-123',
      schedule: [
        {
          id: 'evt-welcome',
          label: 'Welcome drinks',
          startTimeISO: '2026-06-13T23:00:00.000Z',
          venueId: 'venue-1',
        },
        {
          id: 'evt-ceremony',
          label: 'Ceremony',
          startTimeISO: '2026-06-14T16:00:00.000Z',
          venueId: 'venue-2',
        },
      ],
      venues: [
        {
          id: 'venue-1',
          name: 'Harbor Lounge',
          address: '1 Dock Road, Sausalito, CA',
        },
        {
          id: 'venue-2',
          name: 'Sunset Gardens Estate',
          address: '123 Garden Lane, Napa Valley, CA 94558',
        },
      ],
      travel: {},
    });

    expect(spotlight?.cards.map((card) => card.label)).toEqual([
      'Welcome drinks',
      'Ceremony',
      'Directions · Harbor Lounge',
      'Directions · Sunset Gardens Estate',
    ]);
    expect(spotlight?.badges).toEqual(['Invite-scoped', '2 event windows', '2 route cards', '1 of 3 core travel layers ready', '33% core travel coverage', '2 core travel layers still missing', 'Weekend timing ready']);
    expect(spotlight?.mainGapLabel).toBe('Main gap: Stay details');
    expect(spotlight?.summary).toBe('4 travel details ready from the guest hub, including 2 visible event windows for this invitation, 2 route cards. It covers weekend timing. 2 of 3 core travel layers still need setup. Still missing: Stay details.');
    expect(spotlight?.cards.filter((card) => card.href).length).toBe(2);
    expect(spotlight?.shareText).toContain('Coverage: Invite-scoped · 2 event windows · 2 route cards · 1 of 3 core travel layers ready · 33% core travel coverage · 2 core travel layers still missing · Weekend timing ready');
    expect(spotlight?.shareText).toContain('Welcome drinks: Sat, Jun 13, 11:00 PM · Harbor Lounge');
    expect(spotlight?.shareText).toContain('Directions · Harbor Lounge: 1 Dock Road, Sausalito, CA');
    expect(spotlight?.htmlDocument).toContain('Directions · Sunset Gardens Estate');
  });

  it('falls back to owner-written hotel, parking, and guest notes when structured records are sparse', () => {
    const spotlight = buildTravelHubSpotlight({
      siteSlug: 'maya-and-leo',
      enabledActionIds: ['travel'],
      guestInviteToken: 'guest-token-123',
      travel: {
        hotelInfo: 'Stay near the square if you are turning this into a long weekend.',
        parkingInfo: 'Street parking is limited after 4 PM, so rideshare is the easier option.',
        notes: 'Most guests dress for sun at ceremony and a cooler breeze by dinner.',
      },
    });

    expect(spotlight?.cards).toEqual([
      { id: 'hotel-note', label: 'Stay notes', detail: 'Stay near the square if you are turning this into a long weekend.' },
      { id: 'parking', label: 'Parking and arrival', detail: 'Street parking is limited after 4 PM, so rideshare is the easier option.' },
      { id: 'guest-note', label: 'Guest note', detail: 'Most guests dress for sun at ceremony and a cooler breeze by dinner.' },
    ]);
    expect(spotlight?.badges).toEqual(['1 of 3 core travel layers ready', '33% core travel coverage', '2 core travel layers still missing', 'Stay ready']);
    expect(spotlight?.mainGapLabel).toBe('Main gap: Weekend timing');
    expect(spotlight?.summary).toBe('3 travel details ready from the guest hub. It covers stay details, arrival guidance. 2 of 3 core travel layers still need setup. Still missing: Weekend timing.');
    expect(spotlight?.shareText).toContain('Guest note: Most guests dress for sun at ceremony and a cooler breeze by dinner.');
  });
});
