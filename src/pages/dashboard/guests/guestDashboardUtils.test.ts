import { describe, expect, it, vi } from 'vitest';
import {
  buildCheckedInGuestsCsv,
  buildEventAttendanceCsv,
  buildGuestAddressCollectionCsv,
  buildGuestExceptionStateMap,
  buildGuestExportCsv,
  buildGuestFallbackStateMap,
  buildFilteredEmailList,
  buildFollowUpTask,
  buildGeneratedFollowUpTasks,
  downloadGuestCsv,
  buildGuestHouseholdGroups,
  buildGuestHouseholdStateMap,
  buildGuestOpsQueue,
  buildHouseholdLabelsCsv,
  buildMissingMealChecklistLines,
  buildNoContactChecklistLines,
  buildRsvpExceptionChecklistLines,
  buildRsvpFollowUpSummary,
  buildSavedSegment,
  buildThankYouDueCsv,
  csvColumnLetter,
  getGuestCustomAnswerRollup,
  compareGuestsByLastName,
  getGuestCampaignReadiness,
  getGuestContactStats,
  getGuestIssueCount,
  getGuestMealChoiceRollup,
  getGuestMealSummary,
  getGuestPriorityScore,
  getGuestRecommendedAction,
  getGuestRsvpCompleteness,
  getGuestRsvpOpsStats,
  getGuestSegmentLabel,
  getGuestSongRequestEntries,
  makeRsvpQuestion,
  safeGuestImportReadError,
  safeGuestsDashboardError,
  sortGuestsForDisplay,
  toTitleCase,
} from './guestDashboardUtils';
import type { GuestWithRSVP } from './guestDashboardTypes';

describe('guestDashboardUtils', () => {
  it('keeps guest dashboard errors customer-safe', () => {
    expect(safeGuestsDashboardError(new Error('Supabase policy denied on wedding_guests'), 'Couldn’t save guest.')).toBe('Couldn’t save guest.');
  });

  it('allows known actionable import validation copy', () => {
    expect(safeGuestImportReadError(new Error('Guest import files must be CSV or .xlsx.'))).toBe('Guest import files must be CSV or .xlsx.');
    expect(safeGuestImportReadError(new Error('database relation failed'))).toBe('Couldn’t read that guest file. Please check the format and try again.');
  });

  it('downloads guest CSV exports through the shared attached-anchor helper path', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:guest-export');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      downloadGuestCsv('"First Name"\n"Maya"', 'filtered-guests');

      expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:guest-export');
    } finally {
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
      click.mockRestore();
    }
  });

  it('creates blank RSVP question drafts', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.123456789);

    expect(makeRsvpQuestion()).toEqual({
      id: 'q_4fzzzxjy',
      label: '',
      type: 'short_text',
      required: false,
      appliesTo: 'all',
      options: [],
    });

    vi.restoreAllMocks();
  });

  it('formats imported headings for owner-facing labels', () => {
    expect(toTitleCase('meal choice')).toBe('Meal Choice');
    expect(toTitleCase('VIP guest')).toBe('Vip Guest');
  });

  it('formats CSV mapper column letters beyond one alphabet', () => {
    expect(csvColumnLetter(0)).toBe('A');
    expect(csvColumnLetter(25)).toBe('Z');
    expect(csvColumnLetter(26)).toBe('AA');
    expect(csvColumnLetter(701)).toBe('ZZ');
    expect(csvColumnLetter(702)).toBe('AAA');
  });

  it('builds main guest export CSV with safe formulas, RSVP links, and custom answers', () => {
    const guest = {
      id: 'g1',
      first_name: '=Maya',
      last_name: 'Stone',
      name: '=Maya Stone',
      email: 'maya@example.com',
      phone: '+15555550123',
      plus_one_allowed: true,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: 'tok/en+1',
      rsvp_status: 'confirmed',
      rsvp_received_at: '2026-05-05T12:00:00Z',
      household_id: 'h1',
      rsvp: {
        attending: true,
        meal_choice: '@steak',
        plus_one_name: null,
        notes: null,
        custom_answers: { song: '=SUM(A1:A2)' },
      },
    } satisfies GuestWithRSVP;

    const csv = buildGuestExportCsv({
      guests: [guest],
      origin: 'https://dayof.love',
      formatDate: () => 'May 5, 2026',
    });

    expect(csv).toContain('"\'=Maya"');
    expect(csv).toContain('"\'@steak"');
    expect(csv).toContain('https://dayof.love/rsvp?token=tok%2Fen%2B1');
    expect(csv).toContain('song: =SUM(A1:A2)');
    expect(csv).toContain('"May 5, 2026"');
  });

  it('builds focused status exports for thank-you and check-in followup', () => {
    const guest = {
      id: 'g1',
      first_name: 'Ava',
      last_name: 'Lee',
      name: 'Ava Lee',
      email: 'ava@example.com',
      phone: null,
      plus_one_allowed: false,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: null,
      rsvp_status: 'confirmed',
      rsvp_received_at: null,
      household_id: null,
      checked_in_at: '2026-05-05T18:00:00Z',
      thank_you_sent_at: '',
    } satisfies GuestWithRSVP;

    expect(buildThankYouDueCsv([guest])).toContain('"RSVP Status","Thank You Sent At"');
    expect(buildCheckedInGuestsCsv([guest])).toContain('"2026-05-05T18:00:00Z"');
  });

  it('builds address and household label CSVs with grouped names and RSVP links', () => {
    const first = {
      id: 'g1',
      first_name: 'Maya',
      last_name: 'Stone',
      name: 'Maya Stone',
      email: 'maya@example.com',
      phone: '555-0101',
      plus_one_allowed: false,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: 'tok1',
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: 'house-1',
      mailing_address_line1: '1 Main St',
      mailing_city: 'Boston',
      mailing_state: 'MA',
      mailing_postal_code: '02101',
      mailing_country: 'US',
    } as GuestWithRSVP;
    const second = {
      ...first,
      id: 'g2',
      first_name: 'Leo',
      last_name: 'Stone',
      name: 'Leo Stone',
      email: null,
      phone: null,
      invite_token: 'tok2',
      mailing_address_line1: null,
    } as GuestWithRSVP;

    const addressCsv = buildGuestAddressCollectionCsv([first]);
    expect(addressCsv).toContain('"1 Main St"');
    expect(addressCsv).toContain('"02101"');

    const labelsCsv = buildHouseholdLabelsCsv({ guests: [second, first], origin: 'https://dayof.love' });
    expect(labelsCsv).toContain('"house-1"');
    expect(labelsCsv).toContain('"Leo Stone and Maya Stone"');
    expect(labelsCsv).toContain('https://dayof.love/rsvp?token=tok2; https://dayof.love/rsvp?token=tok1');
  });

  it('builds owner-facing RSVP state maps for guest segments', () => {
    const householdPending = {
      id: 'g1',
      first_name: 'Maya',
      last_name: 'Stone',
      name: 'Maya Stone',
      email: null,
      phone: null,
      plus_one_allowed: true,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: null,
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: 'house-1',
      notes: '[Manual RSVP]',
      rsvp: {
        attending: true,
        meal_choice: null,
        plus_one_name: null,
        notes: null,
      },
    } satisfies GuestWithRSVP;
    const householdConfirmed = {
      ...householdPending,
      id: 'g2',
      first_name: 'Leo',
      name: 'Leo Stone',
      email: 'leo@example.com',
      rsvp_status: 'confirmed',
    } satisfies GuestWithRSVP;
    const standalone = {
      ...householdPending,
      id: 'g3',
      first_name: 'Ava',
      name: 'Ava Lee',
      household_id: null,
      plus_one_allowed: false,
      rsvp_status: 'confirmed',
      rsvp: { attending: true, meal_choice: 'Chicken', plus_one_name: null, notes: null },
    } satisfies GuestWithRSVP;

    const guests = [householdPending, householdConfirmed, standalone];

    expect(buildGuestFallbackStateMap(guests).get('g1')?.state).toBe('manual-handled');
    expect(buildGuestHouseholdStateMap(guests).get('g1')).toBe('Mixed household responses');
    expect(buildGuestHouseholdStateMap([standalone]).get('g3')).toBe('Standalone guest');
    expect(buildGuestExceptionStateMap(guests).get('g1')).toEqual(expect.arrayContaining([
      'split-household',
      'unnamed-plus-one',
      'partial-reply',
      'manual-response',
    ]));
  });

  it('builds RSVP follow-up summary, checklist, email, segment, and task payloads outside the page component', () => {
    const now = new Date('2026-05-05T12:00:00Z');
    const missingMeal = {
      id: 'g1',
      first_name: 'Maya',
      last_name: 'Stone',
      name: 'Maya Stone',
      email: 'maya@example.com',
      phone: null,
      plus_one_allowed: true,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: null,
      rsvp_status: 'confirmed',
      rsvp_received_at: null,
      household_id: 'house-1',
      notes: '[Manual RSVP]',
      rsvp: {
        attending: true,
        meal_choice: null,
        plus_one_name: null,
        notes: null,
      },
    } satisfies GuestWithRSVP;
    const noContact = {
      ...missingMeal,
      id: 'g2',
      first_name: 'Leo',
      name: 'Leo Stone',
      email: null,
      rsvp_status: 'pending',
      household_id: 'house-1',
    } satisfies GuestWithRSVP;
    const guests = [missingMeal, noContact];
    const rsvpOps = {
      noResponse: 1,
      missingMeal: 1,
      plusOneMissingName: 1,
      ceremonyNo: 0,
      receptionNo: 0,
      pendingNoEmail: 1,
    };
    const contactStats = {
      withEmail: 1,
      withPhone: 0,
      withNoContact: 1,
      contactCoverage: 50,
    };

    const summary = buildRsvpFollowUpSummary({
      generatedAt: now,
      segmentLabel: 'Pending',
      eligibleReminderCount: 2,
      rsvpOps,
      contactStats,
    });
    expect(summary).toContain('RSVP Follow-up Summary');
    expect(summary).toContain('Segment: Pending');
    expect(summary).toContain('Missing contact info: 1');

    const exceptions = buildGuestExceptionStateMap(guests);
    expect(buildRsvpExceptionChecklistLines({ guests, exceptionStateByGuest: exceptions })).toEqual([
      '- Maya Stone: resolve split-household, partial-reply, unnamed-plus-one, manual-response',
      '- Leo Stone: resolve split-household, partial-reply, unnamed-plus-one, manual-response',
    ]);
    expect(buildMissingMealChecklistLines(guests)).toEqual([
      '- Maya Stone: confirm meal choice',
    ]);
    expect(buildNoContactChecklistLines(guests)).toEqual([
      '- Leo Stone: get phone or email, then resend invite',
    ]);
    expect(buildFilteredEmailList(guests)).toEqual(['maya@example.com']);
    expect(buildSavedSegment({ now, filterStatus: 'pending', segmentLabel: 'Pending', guestCount: 2 })).toMatchObject({
      id: now.getTime(),
      label: 'Pending (2)',
      filter: 'pending',
    });
    expect(buildFollowUpTask({ now, text: 'Call Maya' })).toMatchObject({
      id: now.getTime(),
      text: 'Call Maya',
    });
    expect(buildGeneratedFollowUpTasks({ now, rsvpOps, contactStats }).map((task) => task.text)).toEqual([
      'Follow up 1 pending RSVP(s)',
      'Collect 1 missing meal choice(s)',
      'Collect 1 plus-one name(s)',
      'Add contact details for 1 pending guest(s)',
      'Add contact info for 1 guest(s)',
    ]);
  });

  it('labels static and event-based guest filters', () => {
    const events = [{ id: 'welcome', event_name: 'Welcome Party', event_date: null, start_time: null, location_name: null }];

    expect(getGuestSegmentLabel('pending-no-email', events)).toBe('Pending, No Email');
    expect(getGuestSegmentLabel('event-invited:welcome', events)).toBe('Welcome Party: Invited');
    expect(getGuestSegmentLabel('event-not-invited:missing', events)).toBe('Event: Not invited');
    expect(getGuestSegmentLabel('custom-filter', events)).toBe('custom-filter');
  });

  it('builds event attendance CSV scoped by event invitations', () => {
    const guests = [{
      id: 'g1',
      first_name: 'Maya',
      last_name: 'Stone',
      name: 'Maya Stone',
      email: 'maya@example.com',
      phone: null,
      plus_one_allowed: false,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: false,
      invite_token: null,
      rsvp_status: 'confirmed',
      rsvp_received_at: null,
      household_id: null,
      rsvp: {
        attending: true,
        attending_ceremony: true,
        attending_reception: false,
        meal_choice: 'Chicken',
        plus_one_name: null,
        notes: 'Event RSVP: ceremony=yes; reception=no',
        custom_answers: { shuttle: 'Yes' },
      },
    }] satisfies GuestWithRSVP[];

    const csv = buildEventAttendanceCsv({
      guests,
      events: [
        { id: 'legacy-ceremony', event_name: 'Ceremony', event_date: null, start_time: null, location_name: null },
        { id: 'custom-event', event_name: 'Welcome Party', event_date: null, start_time: null, location_name: null },
      ],
      eventInviteGuestMap: new Map([['custom-event', new Set(['g1'])]]),
    });

    expect(csv).toContain('"Ceremony","Maya Stone"');
    expect(csv).toContain('"Welcome Party","Maya Stone"');
    expect(csv).toContain('"shuttle: Yes"');
  });

  it('scores guest follow-up issues and priority without hiding unresolved RSVP work', () => {
    const guest = {
      id: 'g1',
      first_name: 'Maya',
      last_name: 'Stone',
      name: 'Maya Stone',
      email: null,
      phone: null,
      plus_one_allowed: true,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: null,
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: null,
      rsvp: {
        attending: true,
        meal_choice: null,
        plus_one_name: null,
        notes: '[Events ceremony:no, reception:yes]',
      },
    } satisfies GuestWithRSVP;

    expect(getGuestIssueCount(guest)).toBe(5);
    expect(getGuestPriorityScore(guest, 14)).toBe(250);
  });

  it('summarizes contact coverage and RSVP operation gaps for owner follow-up', () => {
    const guests: GuestWithRSVP[] = [
      {
        id: 'pending-no-email',
        first_name: 'No',
        last_name: 'Email',
        name: 'No Email',
        email: null,
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
      },
      {
        id: 'missing-meal',
        first_name: 'Meal',
        last_name: 'Missing',
        name: 'Meal Missing',
        email: 'meal@example.com',
        phone: null,
        plus_one_allowed: true,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'confirmed',
        rsvp_received_at: null,
        household_id: null,
        rsvp: {
          attending: true,
          meal_choice: null,
          plus_one_name: null,
          notes: '[Events ceremony:no, reception:yes]',
        },
      },
      {
        id: 'reception-decline',
        first_name: 'Reception',
        last_name: 'Decline',
        name: 'Reception Decline',
        email: null,
        phone: '555-0100',
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'confirmed',
        rsvp_received_at: null,
        household_id: null,
        rsvp: {
          attending: true,
          meal_choice: 'Salmon',
          plus_one_name: null,
          notes: '[Events ceremony:yes, reception:no]',
        },
      },
    ];

    expect(getGuestContactStats(guests)).toEqual({
      withEmail: 1,
      withPhone: 1,
      withNoContact: 1,
      contactCoverage: 67,
    });
    expect(getGuestRsvpOpsStats(guests)).toEqual({
      missingMeal: 1,
      plusOneMissingName: 1,
      ceremonyNo: 1,
      receptionNo: 1,
      noResponse: 1,
      pendingNoEmail: 1,
    });
  });

  it('prioritizes recommended RSVP actions without hiding lower-priority gaps', () => {
    expect(getGuestRecommendedAction({
      pendingNoEmail: 2,
      noResponse: 5,
      missingMeal: 3,
      plusOneMissingName: 1,
      ceremonyNo: 0,
      receptionNo: 0,
    })).toMatchObject({ filter: 'pending-no-email', title: 'Collect missing email addresses' });
    expect(getGuestRecommendedAction({
      pendingNoEmail: 0,
      noResponse: 5,
      missingMeal: 3,
      plusOneMissingName: 1,
      ceremonyNo: 0,
      receptionNo: 0,
    })).toMatchObject({ filter: 'pending', title: 'Send reminder to pending guests' });
    expect(getGuestRecommendedAction({
      pendingNoEmail: 0,
      noResponse: 0,
      missingMeal: 3,
      plusOneMissingName: 1,
      ceremonyNo: 0,
      receptionNo: 0,
    })).toMatchObject({ filter: 'missing-meal', title: 'Collect missing meal choices' });
    expect(getGuestRecommendedAction({
      pendingNoEmail: 0,
      noResponse: 0,
      missingMeal: 0,
      plusOneMissingName: 1,
      ceremonyNo: 0,
      receptionNo: 0,
    })).toMatchObject({ filter: 'plusone-missing', title: 'Collect plus-one names' });
    expect(getGuestRecommendedAction({
      pendingNoEmail: 0,
      noResponse: 0,
      missingMeal: 0,
      plusOneMissingName: 0,
      ceremonyNo: 2,
      receptionNo: 1,
    })).toBeNull();
  });

  it('calculates RSVP completeness and campaign readiness as bounded percentages', () => {
    const rsvpOps = {
      missingMeal: 4,
      plusOneMissingName: 5,
      ceremonyNo: 0,
      receptionNo: 0,
      noResponse: 10,
      pendingNoEmail: 2,
    };

    expect(getGuestRsvpCompleteness(rsvpOps)).toBeCloseTo(92.5);
    expect(getGuestRsvpCompleteness({ ...rsvpOps, noResponse: 300 })).toBe(0);
    expect(getGuestCampaignReadiness({
      totalGuests: 10,
      contactStats: { withEmail: 5, withPhone: 2, withNoContact: 3, contactCoverage: 70 },
      rsvpOps,
    })).toBe(69);
    expect(getGuestCampaignReadiness({
      totalGuests: 0,
      contactStats: { withEmail: 0, withPhone: 0, withNoContact: 0, contactCoverage: 0 },
      rsvpOps: { missingMeal: 0, plusOneMissingName: 0, ceremonyNo: 0, receptionNo: 0, noResponse: 0, pendingNoEmail: 0 },
    })).toBe(100);
  });

  it('builds the RSVP operations queue in a stable, bounded order', () => {
    const guests: GuestWithRSVP[] = [
      {
        id: 'g1',
        first_name: 'Maya',
        last_name: 'Stone',
        name: 'Maya Stone',
        email: null,
        phone: null,
        plus_one_allowed: true,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
        rsvp: {
          attending: true,
          meal_choice: null,
          plus_one_name: null,
          notes: '[Events ceremony:no, reception:no]',
        },
      },
      {
        id: 'g2',
        first_name: 'Leo',
        last_name: 'Stone',
        name: 'Leo Stone',
        email: 'leo@example.com',
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'confirmed',
        rsvp_received_at: null,
        household_id: null,
      },
    ];

    expect(buildGuestOpsQueue(guests, 4)).toEqual([
      { guestId: 'g1', guestName: 'Maya Stone', issue: 'No RSVP response yet', filter: 'pending' },
      { guestId: 'g1', guestName: 'Maya Stone', issue: 'Missing meal choice', filter: 'missing-meal' },
      { guestId: 'g1', guestName: 'Maya Stone', issue: 'Missing plus-one name', filter: 'plusone-missing' },
      { guestId: 'g1', guestName: 'Maya Stone', issue: 'Ceremony declined', filter: 'ceremony-no' },
    ]);
  });

  it('sorts guests by name, priority, and check-in mode deterministically', () => {
    const base = {
      first_name: null,
      email: 'guest@example.com',
      phone: null,
      plus_one_allowed: false,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: null,
      rsvp_received_at: null,
      household_id: null,
    };
    const alpha = { ...base, id: 'a', last_name: 'Alpha', name: 'A Alpha', rsvp_status: 'confirmed' } satisfies GuestWithRSVP;
    const zed = { ...base, id: 'z', last_name: 'Zed', name: 'Z Zed', rsvp_status: 'confirmed', checked_in_at: '2026-05-05T18:00:00Z' } satisfies GuestWithRSVP;
    const pending = { ...base, id: 'p', last_name: 'Pending', name: 'P Pending', rsvp_status: 'pending', email: null } satisfies GuestWithRSVP;

    expect(compareGuestsByLastName(zed, alpha)).toBeGreaterThan(0);
    expect(sortGuestsForDisplay({ guests: [zed, pending, alpha], sortByPriority: false, checkInMode: false, daysToWedding: null }).map((guest) => guest.id)).toEqual(['a', 'p', 'z']);
    expect(sortGuestsForDisplay({ guests: [zed, pending, alpha], sortByPriority: true, checkInMode: false, daysToWedding: 20 }).map((guest) => guest.id)).toEqual(['p', 'a', 'z']);
    expect(sortGuestsForDisplay({ guests: [zed, pending, alpha], sortByPriority: false, checkInMode: true, daysToWedding: null }).map((guest) => guest.id)).toEqual(['a', 'p', 'z']);
  });

  it('groups households and ungrouped guests in deterministic display order', () => {
    const base = {
      email: null,
      phone: null,
      plus_one_allowed: false,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: null,
      rsvp_status: 'pending',
      rsvp_received_at: null,
    };
    const groups = buildGuestHouseholdGroups([
      { ...base, id: 'z1', first_name: 'Zoe', last_name: 'Zimmer', name: 'Zoe Zimmer', household_id: 'h-z' },
      { ...base, id: 'a2', first_name: 'Bea', last_name: 'Able', name: 'Bea Able', household_id: 'h-a' },
      { ...base, id: 'a1', first_name: 'Ari', last_name: 'Able', name: 'Ari Able', household_id: 'h-a' },
      { ...base, id: 'u', first_name: 'Maya', last_name: 'Moss', name: 'Maya Moss', household_id: null },
    ] satisfies GuestWithRSVP[]);

    expect(groups.grouped.map(([id]) => id)).toEqual(['h-a', 'h-z']);
    expect(groups.grouped[0][1].map((guest) => guest.id)).toEqual(['a1', 'a2']);
    expect(groups.ungrouped.map((guest) => guest.id)).toEqual(['u']);
  });

  it('builds meal, answer, song, and dietary rollups without page component logic', () => {
    const guests: GuestWithRSVP[] = [
      {
        id: 'g1',
        first_name: 'Maya',
        last_name: 'Stone',
        name: 'Maya Stone',
        email: null,
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'confirmed',
        rsvp_received_at: null,
        household_id: null,
        notes: 'Allergic to peanuts',
        rsvp: {
          attending: true,
          meal_choice: 'Chicken',
          plus_one_name: null,
          notes: null,
          custom_answers: {
            Shuttle: 'Yes',
            'First dance song': ['At Last', ''],
            'Dietary restrictions': 'Gluten-free',
          },
        },
      },
      {
        id: 'g2',
        first_name: 'Leo',
        last_name: 'Stone',
        name: 'Leo Stone',
        email: null,
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'confirmed',
        rsvp_received_at: null,
        household_id: null,
        rsvp: {
          attending: true,
          meal_choice: '',
          plus_one_name: null,
          notes: null,
          custom_answers: {
            Shuttle: 'Yes',
            Playlist: 'September',
          },
        },
      },
    ];

    expect(getGuestMealChoiceRollup(guests)).toEqual([
      ['Chicken', 1],
      ['No meal selected', 1],
    ]);
    expect(getGuestCustomAnswerRollup(guests, 3)).toEqual([
      { question: 'Shuttle', answer: 'Yes', count: 2 },
      { question: 'First dance song', answer: 'At Last', count: 1 },
      { question: 'Dietary restrictions', answer: 'Gluten-free', count: 1 },
    ]);
    expect(getGuestSongRequestEntries(guests)).toEqual([
      { guestName: 'Maya Stone', question: 'First dance song', answer: 'At Last' },
      { guestName: 'Leo Stone', question: 'Playlist', answer: 'September' },
    ]);
    expect(getGuestMealSummary(guests)).toEqual({
      withMealChoice: 1,
      missingMealChoice: 1,
      withDietaryNote: 1,
    });
  });
});
