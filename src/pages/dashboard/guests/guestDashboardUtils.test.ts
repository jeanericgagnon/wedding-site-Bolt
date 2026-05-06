import { describe, expect, it, vi } from 'vitest';
import {
  buildCheckedInGuestsCsv,
  buildEventAttendanceCsv,
  buildGuestEventReport,
  buildGuestAddressCollectionCsv,
  buildGuestExceptionStateMap,
  buildGuestExportCsv,
  buildGuestFallbackStateMap,
  filterGuestDashboardGuests,
  buildFilteredEmailList,
  buildFollowUpTask,
  buildGeneratedFollowUpTasks,
  applyGuestFormToDemoGuest,
  applyDemoAssistedRsvp,
  buildAssistedRsvpNotes,
  buildDemoImportedGuests,
  buildDemoGuestFromForm,
  buildGuestEventInviteIdSet,
  buildGuestFormDataFromGuest,
  buildGuestFormEventSelection,
  buildGuestHouseholdGroups,
  buildGuestHouseholdStateMap,
  buildImportedGuestSidecars,
  buildGuestInvitationPayload,
  buildGuestPreviousValues,
  buildGuestCampaignLogEntry,
  buildGuestCsvImportToast,
  buildGuestCsvPreviewToast,
  buildGuestCampaignDryRun,
  buildGuestChecklistMarkdown,
  buildGuestReminderCampaignConfirmDescription,
  buildGuestReminderSendSummary,
  buildGuestSelectionToast,
  buildGuestSmsRsvpLinkRows,
  buildGuestOpsQueue,
  buildHouseholdLabelsCsv,
  buildMissingMealChecklistLines,
  buildNoContactChecklistLines,
  buildRsvpExceptionChecklistLines,
  buildRsvpFollowUpSummary,
  buildSavedSegment,
  buildThankYouDueCsv,
  cleanGuestRsvpConfig,
  csvColumnLetter,
  getGuestCustomAnswerRollup,
  getGuestDashboardStats,
  getGuestDisplayName,
  getGuestExportSegmentSuffix,
  getGuestDueReminderIds,
  getGuestDueThankYouIds,
  getGuestRsvpConflictStats,
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
  getUnresolvedGuestIds,
  makeRsvpQuestion,
  safeGuestImportReadError,
  safeGuestsDashboardError,
  sendGuestInvitationBatch,
  isGuestDueReminder,
  sortGuestsForDisplay,
  stripImportedGuestInternalFields,
  toTitleCase,
  trimGuestSelectionToVisible,
} from './guestDashboardUtils';
import type { GuestWithRSVP, RsvpConflict } from './guestDashboardTypes';

describe('guestDashboardUtils', () => {
  it('keeps guest dashboard errors customer-safe', () => {
    expect(safeGuestsDashboardError(new Error('Supabase policy denied on wedding_guests'), 'Couldn’t save guest.')).toBe('Couldn’t save guest.');
  });

  it('allows known actionable import validation copy', () => {
    expect(safeGuestImportReadError(new Error('Guest import files must be CSV or .xlsx.'))).toBe('Guest import files must be CSV or .xlsx.');
    expect(safeGuestImportReadError(new Error('database relation failed'))).toBe('Couldn’t read that guest file. Please check the format and try again.');
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

  it('cleans guest RSVP config before saving', () => {
    const result = cleanGuestRsvpConfig({
      mealEnabled: true,
      mealOptions: [' chicken ', '', 'VEGAN'],
      questions: [
        { id: 'blank', label: '   ', type: 'short_text', required: false, appliesTo: 'all', options: ['ignored'] },
        { id: 'choice', label: ' Meal ', type: 'single_choice', required: true, appliesTo: 'all', options: [' fish ', '', 'beef'] },
        { id: 'text', label: ' Song ', type: 'short_text', required: false, appliesTo: 'all', options: ['nope'] },
      ],
    });

    expect(result).toEqual({
      questions: [
        { id: 'choice', label: 'Meal', type: 'single_choice', required: true, appliesTo: 'all', options: ['fish', 'beef'] },
        { id: 'text', label: 'Song', type: 'short_text', required: false, appliesTo: 'all', options: [] },
      ],
      mealOptions: ['Chicken', 'Vegan'],
      validationError: null,
    });

    expect(cleanGuestRsvpConfig({
      mealEnabled: false,
      mealOptions: [],
      questions: [{ id: 'q1', label: 'Pick one', type: 'single_choice', required: false, appliesTo: 'all', options: ['Only'] }],
    }).validationError).toBe('Choice question "Pick one" needs at least 2 options.');
    expect(cleanGuestRsvpConfig({ mealEnabled: true, mealOptions: ['Only one'], questions: [] }).validationError).toBe('Meal choices need at least 2 options when enabled.');
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

  it('builds guest display names, export slugs, and SMS RSVP link rows', () => {
    const guests = [
      {
        id: 'g1',
        first_name: 'Maya',
        last_name: 'Stone',
        name: 'Fallback',
        email: null,
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: 'tok1',
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
      },
      {
        id: 'g2',
        first_name: '',
        last_name: '',
        name: 'Ava Lee',
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
    ] satisfies GuestWithRSVP[];

    expect(getGuestDisplayName(guests[0])).toBe('Maya Stone');
    expect(getGuestDisplayName(guests[1])).toBe('Ava Lee');
    expect(getGuestExportSegmentSuffix('Pending, No Email')).toBe('pending-no-email');
    expect(buildGuestSmsRsvpLinkRows({ guests, siteSlug: 'maya-leo' })).toEqual([
      'Maya Stone: https://maya-leo.dayof.love/rsvp?token=tok1',
    ]);
    expect(buildGuestInvitationPayload({
      guest: guests[0],
      weddingSiteId: 'site-fallback',
      weddingSiteInfo: {
        id: 'site-1',
        couple_name_1: 'Maya',
        couple_name_2: 'Leo',
        wedding_date: '2026-06-01',
        venue_name: 'Garden Hall',
        venue_address: '1 Main St',
        site_url: 'https://maya-leo.dayof.love',
      },
    })).toEqual({
      weddingSiteId: 'site-1',
      guestEmail: '',
      guestName: 'Maya Stone',
      coupleName1: 'Maya',
      coupleName2: 'Leo',
      weddingDate: '2026-06-01',
      venueName: 'Garden Hall',
      venueAddress: '1 Main St',
      siteUrl: 'https://maya-leo.dayof.love',
      inviteToken: 'tok1',
    });
    expect(buildGuestReminderSendSummary({
      successCount: 2,
      failedCount: 1,
      label: 'reminder',
      emptyMessage: 'No reminders sent.',
    })).toEqual({
      message: 'Sent 2 reminders. 1 need review.',
      variant: 'info',
    });
    expect(buildGuestReminderSendSummary({
      successCount: 0,
      failedCount: 0,
      label: 'selected reminder',
      emptyMessage: 'No selected reminders were sent.',
    })).toEqual({
      message: 'No selected reminders were sent.',
      variant: 'error',
    });
    expect(buildGuestReminderCampaignConfirmDescription({
      segmentLabel: 'Pending',
      recipientCount: 4,
      skipRecentlyInvited: true,
      noContactCount: 2,
      recipients: [guests[0], { ...guests[0], id: 'g3', first_name: 'Leo' }, { ...guests[0], id: 'g4', first_name: 'Ava' }, { ...guests[0], id: 'g5', first_name: 'Nia' }],
    })).toContain('First recipients: Maya Stone, Leo Stone, Ava Stone +1 more');
    expect(buildGuestCampaignLogEntry({ now: new Date('2026-05-06T18:30:00Z'), segment: 'Pending', count: 4 })).toMatchObject({
      id: new Date('2026-05-06T18:30:00Z').getTime(),
      segment: 'Pending',
      count: 4,
    });
    expect(buildGuestCsvPreviewToast({
      parsedCount: 3,
      skippedCount: 1,
      unknownEventCount: 2,
      duplicateNameCount: 1,
      householdWarningCount: 1,
    })).toBe('3 guests ready to import (1 row need review), 2 event names need review, 1 possible repeat, 1 household match need review.');
    expect(buildGuestCsvImportToast({
      importedCount: 3,
      skippedCount: 1,
      unknownEventCount: 2,
      householdKeyCount: 1,
      guardedHouseholdCount: 1,
      eventInviteCount: 2,
    })).toBe('3 guests imported, 1 row need review, 1 household group, 1 household match left separate, 2 event invites, 2 event names need review');
  });

  it('sends guest invitation batches with per-guest timestamp updates', async () => {
    const guests = [
      {
        id: 'g1',
        first_name: 'Maya',
        last_name: 'Stone',
        name: 'Maya Stone',
        email: 'maya@example.com',
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: 'tok1',
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
      },
      {
        id: 'g2',
        first_name: 'Ava',
        last_name: 'Lee',
        name: 'Ava Lee',
        email: 'ava@example.com',
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: 'tok2',
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
      },
      {
        id: 'g3',
        first_name: 'No',
        last_name: 'Email',
        name: 'No Email',
        email: null,
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: 'tok3',
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
      },
    ] satisfies GuestWithRSVP[];
    const sendInvitation = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('provider down'));
    const updateTimestamps = vi.fn().mockResolvedValue(undefined);

    const result = await sendGuestInvitationBatch({
      guests,
      weddingSiteId: 'site-1',
      weddingSiteInfo: { id: 'site-1', couple_name_1: 'Maya', couple_name_2: 'Leo' },
      sendInvitation,
      updateTimestamps,
      timestampFields: () => ({ reminder_last_sent_at: 'now' }),
    });

    expect(result).toEqual({ successCount: 1, failedCount: 1 });
    expect(sendInvitation).toHaveBeenCalledTimes(2);
    expect(sendInvitation.mock.calls[0][0]).toMatchObject({
      weddingSiteId: 'site-1',
      guestEmail: 'maya@example.com',
      guestName: 'Maya Stone',
      inviteToken: 'tok1',
    });
    expect(updateTimestamps).toHaveBeenCalledWith('g1', { reminder_last_sent_at: 'now' });
    expect(updateTimestamps).toHaveBeenCalledTimes(1);
  });

  it('maps guest form data to demo guests, edit payloads, and event selections', () => {
    const formData = {
      first_name: 'Maya',
      last_name: 'Stone',
      email: '',
      phone: '+15555550123',
      plus_one_allowed: true,
      require_plus_one_name: false,
      invited_to_ceremony: true,
      invited_to_reception: false,
    };
    const guest = buildDemoGuestFromForm({ formData, id: 'demo-1', inviteToken: 'tok-demo' });

    expect(guest).toMatchObject({
      id: 'demo-1',
      first_name: 'Maya',
      last_name: 'Stone',
      name: 'Maya Stone',
      email: null,
      phone: '+15555550123',
      plus_one_allowed: true,
      invited_to_ceremony: true,
      invited_to_reception: false,
      invite_token: 'tok-demo',
      rsvp_status: 'pending',
    });

    expect(applyGuestFormToDemoGuest(guest, { ...formData, first_name: 'Ava', email: 'ava@example.com' })).toMatchObject({
      first_name: 'Ava',
      name: 'Ava Stone',
      email: 'ava@example.com',
    });

    expect(buildGuestFormDataFromGuest(guest)).toEqual(formData);
    expect(buildGuestPreviousValues(guest)).toMatchObject({
      first_name: 'Maya',
      name: 'Maya Stone',
      email: null,
      invited_to_reception: false,
    });

    expect(buildGuestFormEventSelection(new Set(['legacy-ceremony', 'itinerary-1']))).toEqual({
      selectedEventIds: ['legacy-ceremony', 'itinerary-1'],
      invitedToCeremony: true,
      invitedToReception: false,
      realEventIds: ['itinerary-1'],
    });

    const invitedIds = buildGuestEventInviteIdSet({
      guest,
      events: [
        { id: 'legacy-ceremony', event_name: 'Ceremony', event_date: '', start_time: '', location_name: '' },
        { id: 'legacy-reception', event_name: 'Reception', event_date: '', start_time: '', location_name: '' },
        { id: 'welcome', event_name: 'Welcome', event_date: '', start_time: '', location_name: '' },
      ],
      eventInviteGuestMap: new Map([['welcome', new Set(['demo-1'])]]),
    });
    expect([...invitedIds]).toEqual(['legacy-ceremony', 'welcome']);
  });

  it('maps assisted RSVP notes and demo RSVP state updates', () => {
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
      invited_to_reception: false,
      invite_token: null,
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: null,
      rsvp: {
        attending: true,
        meal_choice: 'Chicken',
        plus_one_name: 'Leo',
        plus_one_count: 1,
        notes: null,
        custom_answers: null,
      },
    } satisfies GuestWithRSVP;
    const notes = buildAssistedRsvpNotes({
      source: 'phone',
      notes: 'Left a voicemail confirmation.',
      recordedAt: '2026-05-06T18:46:00Z',
    });

    expect(notes).toBe('[Manual RSVP source:phone recorded:2026-05-06T18:46:00Z] Left a voicemail confirmation.');
    expect(applyDemoAssistedRsvp(guest, 'confirmed', notes, '2026-05-06T18:46:00Z')).toMatchObject({
      rsvp_status: 'confirmed',
      rsvp_received_at: '2026-05-06T18:46:00Z',
      notes,
      rsvp: {
        attending: true,
        attending_ceremony: true,
        attending_reception: false,
        meal_choice: 'Chicken',
      },
    });
    expect(applyDemoAssistedRsvp(guest, 'declined', notes, '2026-05-06T18:46:00Z')).toMatchObject({
      rsvp_status: 'declined',
      rsvp: {
        attending: false,
        attending_ceremony: false,
        attending_reception: false,
        meal_choice: null,
        plus_one_name: null,
        plus_one_count: 0,
      },
    });
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

  it('prepares imported guest demo rows and import sidecars without page component state', () => {
    const previewRows: Record<string, unknown>[] = [
      {
        first_name: 'Maya',
        last_name: 'Stone',
        email: 'maya@example.com',
        plus_one_allowed: true,
        __household_key: 'name:stone',
        __invited_event_ids: ['welcome'],
        rsvp_status: 'confirmed',
        __meal_choice: 'Chicken',
        __plus_one_name: 'Leo',
        __plus_one_count: 1,
        __children_count: 0,
        __rsvp_date: '2026-05-05T12:00:00Z',
      },
      {
        first_name: 'Ava',
        last_name: 'Stone',
        __household_key: 'name:stone',
        rsvp_status: 'pending',
      },
    ];

    const demoGuests = buildDemoImportedGuests({
      previewRows,
      now: 1778090400000,
      createInviteToken: () => 'demo-token',
    });
    expect(demoGuests[0]).toMatchObject({
      id: 'demo-import-1778090400000-0',
      name: 'Maya Stone',
      invite_token: 'demo-token',
      household_id: 'name:stone',
    });

    expect(stripImportedGuestInternalFields(previewRows[0])).not.toHaveProperty('__household_key');
    expect(stripImportedGuestInternalFields(previewRows[0])).not.toHaveProperty('__invited_event_ids');

    const sidecars = buildImportedGuestSidecars({
      rows: previewRows,
      inserted: [{ id: 'g1' }, { id: 'g2' }],
    });
    expect(sidecars.keyToGuestIds.get('name:stone')).toEqual(['g1', 'g2']);
    expect(sidecars.householdLastNames.get('name:stone')).toEqual(new Set(['stone']));
    expect(sidecars.eventInviteRows).toEqual([{ event_id: 'welcome', guest_id: 'g1' }]);
    expect(sidecars.rsvpRows).toEqual([{
      guest_id: 'g1',
      attending: true,
      meal_choice: 'Chicken',
      plus_one_name: 'Leo',
      plus_one_count: 1,
      children_count: 0,
      responded_at: '2026-05-05T12:00:00Z',
    }]);
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

  it('derives RSVP conflict stats from open and historical conflicts', () => {
    const now = new Date('2026-05-06T18:00:00Z').getTime();
    const openConflicts: RsvpConflict[] = [
      {
        id: 'open-old',
        guest_id: 'g1',
        conflict_code: 'duplicate-email',
        message: 'Duplicate email',
        severity: 'warning',
        created_at: '2026-05-03T17:00:00Z',
        resolved: false,
        resolved_at: null,
      },
      {
        id: 'open-new',
        guest_id: 'g2',
        conflict_code: 'plus-one',
        message: 'Plus-one mismatch',
        severity: 'error',
        created_at: '2026-05-06T12:00:00Z',
        resolved: false,
        resolved_at: null,
      },
    ];
    const history: RsvpConflict[] = [
      ...openConflicts,
      {
        id: 'resolved-recent',
        guest_id: 'g3',
        conflict_code: 'duplicate-email',
        message: 'Duplicate email',
        severity: 'warning',
        created_at: '2026-05-06T09:00:00Z',
        resolved: true,
        resolved_at: '2026-05-06T10:00:00Z',
      },
    ];

    expect(getGuestRsvpConflictStats({ conflicts: openConflicts, history, now })).toEqual({
      openNow: 2,
      opened24h: 2,
      resolved24h: 1,
      unresolvedOver24h: 1,
      unresolvedOver72h: 1,
      topCodes: [
        { code: 'duplicate-email', count: 2 },
        { code: 'plus-one', count: 1 },
      ],
    });
  });

  it('derives reminder and thank-you due segments outside the page component', () => {
    const now = new Date('2026-05-06T18:00:00Z').getTime();
    const dueReminder = {
      id: 'due-reminder',
      first_name: 'Maya',
      last_name: 'Stone',
      name: 'Maya Stone',
      email: 'maya@example.com',
      phone: null,
      plus_one_allowed: false,
      plus_one_name: null,
      invited_to_ceremony: true,
      invited_to_reception: true,
      invite_token: 'tok',
      rsvp_status: 'pending',
      rsvp_received_at: null,
      household_id: null,
      invitation_sent_at: '2026-05-01T18:00:00Z',
    } as GuestWithRSVP;
    const recentReminder = {
      ...dueReminder,
      id: 'recent-reminder',
      invitation_sent_at: '2026-05-05T18:00:00Z',
    } as GuestWithRSVP;
    const thankYouDue = {
      ...dueReminder,
      id: 'thank-you-due',
      rsvp_status: 'confirmed',
      thank_you_sent_at: null,
    } as GuestWithRSVP;
    const thankYouSent = {
      ...thankYouDue,
      id: 'thank-you-sent',
      thank_you_sent_at: '2026-05-06T12:00:00Z',
    } as GuestWithRSVP;

    expect(isGuestDueReminder(dueReminder, 3, now)).toBe(true);
    expect(isGuestDueReminder(recentReminder, 3, now)).toBe(false);
    expect([...getGuestDueReminderIds([dueReminder, recentReminder, thankYouDue], 3, now)]).toEqual(['due-reminder']);
    expect([...getGuestDueThankYouIds([thankYouDue, thankYouSent, dueReminder])]).toEqual(['thank-you-due']);
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
    expect(getGuestDashboardStats(guests)).toEqual({
      total: 3,
      confirmed: 2,
      declined: 0,
      pending: 1,
      rsvpRate: 67,
    });
  });

  it('filters guests by dashboard segments, event invitations, and search text', () => {
    const guests: GuestWithRSVP[] = [
      {
        id: 'g1',
        first_name: 'Maya',
        last_name: 'Stone',
        name: 'Maya Stone',
        email: 'maya@example.com',
        phone: null,
        plus_one_allowed: true,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: false,
        invite_token: 'tok_1',
        rsvp_status: 'confirmed',
        rsvp_received_at: null,
        household_id: null,
        rsvp: { attending: true, meal_choice: null, plus_one_name: null, notes: '[Events ceremony:yes, reception:no]' },
      },
      {
        id: 'g2',
        first_name: 'Leo',
        last_name: 'River',
        name: 'Leo River',
        email: null,
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: false,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
      },
    ];

    const eventInviteGuestMap = new Map([['welcome', new Set(['g2'])]]);
    const dueThankYouGuestIds = new Set(['g1']);
    const isDueReminder = (guest: GuestWithRSVP) => guest.id === 'g2';

    expect(filterGuestDashboardGuests({
      dueThankYouGuestIds,
      eventInviteGuestMap,
      extraFilters: [],
      filterStatus: 'missing-meal',
      guests,
      isDueReminder,
      searchQuery: '',
    }).map((guest) => guest.id)).toEqual(['g1']);

    expect(filterGuestDashboardGuests({
      dueThankYouGuestIds,
      eventInviteGuestMap,
      extraFilters: ['no-contact'],
      filterStatus: 'event-invited:welcome',
      guests,
      isDueReminder,
      searchQuery: 'leo',
    }).map((guest) => guest.id)).toEqual(['g2']);

    expect(filterGuestDashboardGuests({
      dueThankYouGuestIds,
      eventInviteGuestMap,
      extraFilters: [],
      filterStatus: 'thank-you-due',
      guests,
      isDueReminder,
      searchQuery: '',
    }).map((guest) => guest.id)).toEqual(['g1']);
  });

  it('builds event report counts from legacy and itinerary invitations', () => {
    const guests: GuestWithRSVP[] = [
      {
        id: 'g1',
        first_name: 'Maya',
        last_name: 'Stone',
        name: 'Maya Stone',
        email: 'maya@example.com',
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: null,
        rsvp_status: 'confirmed',
        rsvp_received_at: null,
        household_id: null,
        rsvp: { attending: true, meal_choice: 'Fish', plus_one_name: null, notes: '[Events ceremony:yes, reception:no]' },
      },
      {
        id: 'g2',
        first_name: 'Leo',
        last_name: 'River',
        name: 'Leo River',
        email: null,
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: false,
        invited_to_reception: false,
        invite_token: null,
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
      },
    ];

    expect(buildGuestEventReport({
      guests,
      eventInviteGuestMap: new Map([['welcome', new Set(['g1', 'g2'])]]),
      events: [
        { id: 'legacy-ceremony', event_name: 'Ceremony', event_date: null, start_time: null, location_name: null },
        { id: 'legacy-reception', event_name: 'Reception', event_date: null, start_time: null, location_name: null },
        { id: 'welcome', event_name: 'Welcome Party', event_date: null, start_time: null, location_name: null },
      ],
    })).toEqual([
      { id: 'legacy-ceremony', name: 'Ceremony', invited: 1, attending: 1, declined: 0, pending: 0 },
      { id: 'legacy-reception', name: 'Reception', invited: 1, attending: 0, declined: 1, pending: 0 },
      { id: 'welcome', name: 'Welcome Party', invited: 2, attending: 0, declined: 0, pending: 2 },
    ]);
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

  it('builds selection and campaign clipboard copy without page state', () => {
    const guests: GuestWithRSVP[] = [
      {
        id: 'g1',
        first_name: 'Maya',
        last_name: 'Stone',
        name: 'Maya Stone',
        email: 'maya@example.com',
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: 'tok1',
        rsvp_status: 'pending',
        rsvp_received_at: null,
        household_id: null,
      },
      {
        id: 'g2',
        first_name: '',
        last_name: '',
        name: 'Ava Lee',
        email: 'ava@example.com',
        phone: null,
        plus_one_allowed: false,
        plus_one_name: null,
        invited_to_ceremony: true,
        invited_to_reception: true,
        invite_token: 'tok2',
        rsvp_status: 'confirmed',
        rsvp_received_at: null,
        household_id: null,
      },
    ];

    expect(getUnresolvedGuestIds(guests)).toEqual(['g1']);
    expect(buildGuestSelectionToast({ count: 2, singularLabel: 'guest in current filter', pluralLabel: 'guests in current filter', emptyMessage: 'No guests' })).toEqual({
      message: 'Selected 2 guests in current filter',
      variant: 'success',
    });
    expect(buildGuestSelectionToast({ count: 0, singularLabel: 'guest', pluralLabel: 'guests', emptyMessage: 'No guests' })).toEqual({
      message: 'No guests',
      variant: 'error',
    });
    expect([...trimGuestSelectionToVisible({ selectedIds: new Set(['g1', 'missing']), visibleGuests: guests })]).toEqual(['g1']);
    expect(buildGuestChecklistMarkdown([{ id: 1, text: 'Call Maya', createdAt: 'now' }])).toBe('- [ ] Call Maya');
    expect(buildGuestChecklistMarkdown([])).toBe('- [ ] No follow-up tasks yet');
    expect(buildGuestCampaignDryRun({ guests, segmentLabel: 'Pending', previewLimit: 1 })).toEqual({
      recipientNames: ['Maya Stone'],
      text: 'Campaign dry run (Pending)\nRecipients: 2\n\nMaya Stone\n+1 more',
    });
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
