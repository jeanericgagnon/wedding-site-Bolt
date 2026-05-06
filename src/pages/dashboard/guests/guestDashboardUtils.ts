import { customerSafeErrorMessage } from '../../../lib/customerSafeError';
import { toSafeCsv } from '../../../lib/csvExport';
import { extractDietaryNote } from '../../../lib/dietaryNotes';
import { getRsvpExceptionStates, type RsvpExceptionState } from '../../../lib/rsvpExceptionState';
import { getRsvpFallbackState, type RsvpFallbackDescriptor } from '../../../lib/rsvpFallbackState';
import { isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../../lib/rsvpStatus';
import { formatGuestOpsDate, getGuestOpsTimestamp } from '../guestOpsTime';
import { formatCustomAnswers, parseRsvpEventSelections } from './guestDisplayUtils';
import { type GuestWithRSVP, type ItineraryEvent, type RSVPQuestionSetting, type RsvpConflict, type RsvpConflictStats, type WeddingSiteInfo } from './guestDashboardTypes';
import type { AssistedRsvpSource, AssistedRsvpStatus, GuestFormData } from './GuestModals';
import { type RsvpCampaignLogEntry, type RsvpFollowUpTask, type RsvpSavedSegment } from './guestDashboardStorage';

export function safeGuestsDashboardError(err: unknown, fallback: string): string {
  return customerSafeErrorMessage(err, fallback);
}

export function safeGuestImportReadError(err: unknown): string {
  return customerSafeErrorMessage(err, 'Couldn’t read that guest file. Please check the format and try again.', {
    allow: [
      /^Guest import files must be 5MB or smaller\.$/i,
      /^Guest import files must be CSV or \.xlsx\.$/i,
      /^Please save legacy \.xls files as \.xlsx or CSV before importing\.$/i,
      /^Guest import is limited to [\d,]+ rows at a time\. Split the spreadsheet and import in batches\.$/i,
      /^Guest import is limited to \d+ columns\. Remove unused columns and try again\.$/i,
    ],
  });
}

export const makeRsvpQuestion = (): RSVPQuestionSetting => ({
  id: `q_${Math.random().toString(36).slice(2, 10)}`,
  label: '',
  type: 'short_text',
  required: false,
  appliesTo: 'all',
  options: [],
});

export const toTitleCase = (value: string) => value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

export function cleanGuestRsvpConfig(input: {
  questions: RSVPQuestionSetting[];
  mealEnabled: boolean;
  mealOptions: string[];
}): {
  questions: RSVPQuestionSetting[];
  mealOptions: string[];
  validationError: string | null;
} {
  const questions = input.questions
    .map((question) => ({
      ...question,
      label: question.label.trim(),
      options: (question.type === 'single_choice' || question.type === 'multi_choice')
        ? (question.options ?? []).map((option) => option.trim()).filter(Boolean)
        : [],
    }))
    .filter((question) => question.label.length > 0);

  const missingOptions = questions.find(
    (question) => (question.type === 'single_choice' || question.type === 'multi_choice') && (question.options?.length ?? 0) < 2,
  );
  if (missingOptions) {
    return {
      questions,
      mealOptions: [],
      validationError: `Choice question "${missingOptions.label}" needs at least 2 options.`,
    };
  }

  const mealOptions = input.mealOptions.map((option) => toTitleCase(option.trim())).filter(Boolean);
  if (input.mealEnabled && mealOptions.length < 2) {
    return {
      questions,
      mealOptions,
      validationError: 'Meal choices need at least 2 options when enabled.',
    };
  }

  return { questions, mealOptions, validationError: null };
}

export function csvColumnLetter(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

type GuestAddressFields = GuestWithRSVP & {
  mailing_address_line1?: string | null;
  mailing_address_line2?: string | null;
  mailing_city?: string | null;
  mailing_state?: string | null;
  mailing_postal_code?: string | null;
  mailing_country?: string | null;
};

export function getGuestDisplayName(guest: GuestWithRSVP): string {
  return [guest.first_name, guest.last_name].filter(Boolean).join(' ').trim() || guest.name;
}

export function getGuestExportSegmentSuffix(segmentLabel: string): string {
  return segmentLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function buildGuestSmsRsvpLinkRows(input: {
  guests: GuestWithRSVP[];
  siteSlug: string;
}): string[] {
  return input.guests
    .filter((guest) => !!guest.invite_token)
    .map((guest) => `${getGuestDisplayName(guest)}: https://${input.siteSlug}.dayof.love/rsvp?token=${guest.invite_token}`);
}

export type GuestInvitationPayload = {
  weddingSiteId: string;
  guestEmail: string;
  guestName: string;
  coupleName1: string;
  coupleName2: string;
  weddingDate?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  siteUrl?: string | null;
  inviteToken?: string | null;
};

export function buildGuestInvitationPayload(input: {
  guest: GuestWithRSVP;
  weddingSiteId: string | null;
  weddingSiteInfo: Partial<WeddingSiteInfo> | null;
}): GuestInvitationPayload {
  return {
    weddingSiteId: input.weddingSiteInfo?.id ?? input.weddingSiteId ?? '',
    guestEmail: input.guest.email ?? '',
    guestName: getGuestDisplayName(input.guest),
    coupleName1: input.weddingSiteInfo?.couple_name_1 ?? '',
    coupleName2: input.weddingSiteInfo?.couple_name_2 ?? '',
    weddingDate: input.weddingSiteInfo?.wedding_date ?? null,
    venueName: input.weddingSiteInfo?.venue_name ?? null,
    venueAddress: input.weddingSiteInfo?.venue_address ?? null,
    siteUrl: input.weddingSiteInfo?.site_url ?? null,
    inviteToken: input.guest.invite_token ?? null,
  };
}

export async function sendGuestInvitationBatch(input: {
  guests: GuestWithRSVP[];
  weddingSiteId: string | null;
  weddingSiteInfo: Partial<WeddingSiteInfo> | null;
  timestampFields: (sentAtIso: string) => Record<string, string>;
  sendInvitation: (payload: GuestInvitationPayload) => Promise<unknown>;
  updateTimestamps: (guestId: string, patch: Record<string, string>) => Promise<unknown>;
}): Promise<{ successCount: number; failedCount: number }> {
  let successCount = 0;
  let failedCount = 0;

  for (const guest of input.guests) {
    if (!guest.email) continue;
    try {
      await input.sendInvitation(buildGuestInvitationPayload({
        guest,
        weddingSiteId: input.weddingSiteId,
        weddingSiteInfo: input.weddingSiteInfo,
      }));
      await input.updateTimestamps(guest.id, input.timestampFields(new Date().toISOString()));
      successCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  return { successCount, failedCount };
}

export type GuestFormEventSelection = {
  selectedEventIds: string[];
  invitedToCeremony: boolean;
  invitedToReception: boolean;
  realEventIds: string[];
};

export function buildGuestFormEventSelection(formEventInviteIds: Set<string>): GuestFormEventSelection {
  const selectedEventIds = Array.from(formEventInviteIds);
  return {
    selectedEventIds,
    invitedToCeremony: selectedEventIds.includes('legacy-ceremony'),
    invitedToReception: selectedEventIds.includes('legacy-reception'),
    realEventIds: selectedEventIds.filter((id) => !id.startsWith('legacy-')),
  };
}

export function buildDemoGuestFromForm(input: {
  formData: GuestFormData;
  id: string;
  inviteToken: string;
}): GuestWithRSVP {
  const { formData } = input;
  return {
    id: input.id,
    first_name: formData.first_name,
    last_name: formData.last_name,
    name: `${formData.first_name} ${formData.last_name}`.trim(),
    email: formData.email || null,
    phone: formData.phone || null,
    plus_one_allowed: formData.plus_one_allowed,
    plus_one_name: null,
    invited_to_ceremony: formData.invited_to_ceremony,
    invited_to_reception: formData.invited_to_reception,
    invite_token: input.inviteToken,
    rsvp_status: 'pending',
    rsvp_received_at: null,
    household_id: null,
  };
}

export function applyGuestFormToDemoGuest(guest: GuestWithRSVP, formData: GuestFormData): GuestWithRSVP {
  return {
    ...guest,
    first_name: formData.first_name,
    last_name: formData.last_name,
    name: `${formData.first_name} ${formData.last_name}`.trim(),
    email: formData.email || null,
    phone: formData.phone || null,
    plus_one_allowed: formData.plus_one_allowed,
    invited_to_ceremony: formData.invited_to_ceremony,
    invited_to_reception: formData.invited_to_reception,
  };
}

export function buildGuestFormDataFromGuest(guest: GuestWithRSVP): GuestFormData {
  return {
    first_name: guest.first_name || '',
    last_name: guest.last_name || '',
    email: guest.email || '',
    phone: guest.phone || '',
    plus_one_allowed: guest.plus_one_allowed,
    require_plus_one_name: false,
    invited_to_ceremony: guest.invited_to_ceremony,
    invited_to_reception: guest.invited_to_reception,
  };
}

export function buildGuestEventInviteIdSet(input: {
  guest: GuestWithRSVP;
  events: ItineraryEvent[];
  eventInviteGuestMap: Map<string, Set<string>>;
}): Set<string> {
  return new Set(input.events
    .filter((event) => {
      if (event.id === 'legacy-ceremony') return input.guest.invited_to_ceremony;
      if (event.id === 'legacy-reception') return input.guest.invited_to_reception;
      return input.eventInviteGuestMap.get(event.id)?.has(input.guest.id);
    })
    .map((event) => event.id));
}

export type GuestPreviousValues = Pick<GuestWithRSVP,
  'first_name' |
  'last_name' |
  'name' |
  'email' |
  'phone' |
  'plus_one_allowed' |
  'invited_to_ceremony' |
  'invited_to_reception'
>;

export function buildGuestPreviousValues(guest: GuestWithRSVP): GuestPreviousValues {
  return {
    first_name: guest.first_name ?? null,
    last_name: guest.last_name ?? null,
    name: guest.name ?? null,
    email: guest.email ?? null,
    phone: guest.phone ?? null,
    plus_one_allowed: guest.plus_one_allowed,
    invited_to_ceremony: guest.invited_to_ceremony,
    invited_to_reception: guest.invited_to_reception,
  };
}

export function buildAssistedRsvpNotes(input: {
  source: AssistedRsvpSource;
  notes: string;
  recordedAt: string;
}): string {
  const manualTag = `[Manual RSVP source:${input.source} recorded:${input.recordedAt}]`;
  return [manualTag, input.notes.trim()].filter(Boolean).join(' ');
}

export function applyDemoAssistedRsvp(guest: GuestWithRSVP, status: AssistedRsvpStatus, notes: string, receivedAt: string): GuestWithRSVP {
  return {
    ...guest,
    rsvp_status: status,
    rsvp_received_at: receivedAt,
    notes,
    rsvp: status === 'confirmed'
      ? guest.rsvp
        ? {
            ...guest.rsvp,
            attending: true,
            attending_ceremony: guest.invited_to_ceremony,
            attending_reception: guest.invited_to_reception,
          }
        : guest.rsvp
      : guest.rsvp
        ? {
            ...guest.rsvp,
            attending: false,
            attending_ceremony: false,
            attending_reception: false,
            meal_choice: null,
            plus_one_name: null,
            plus_one_count: 0,
          }
        : guest.rsvp,
  };
}

export type GuestReminderSendSummary = {
  message: string;
  variant: 'success' | 'info' | 'error';
};

export function buildGuestReminderSendSummary(input: {
  successCount: number;
  failedCount: number;
  label: string;
  emptyMessage: string;
}): GuestReminderSendSummary {
  const { successCount, failedCount, label, emptyMessage } = input;
  if (successCount > 0) {
    return {
      message: failedCount > 0
        ? `Sent ${successCount} ${label}${successCount === 1 ? '' : 's'}. ${failedCount} need review.`
        : `Sent ${successCount} ${label}${successCount === 1 ? '' : 's'}`,
      variant: failedCount > 0 ? 'info' : 'success',
    };
  }

  return {
    message: failedCount > 0
      ? `${failedCount} ${label}${failedCount === 1 ? '' : 's'} need review.`
      : emptyMessage,
    variant: 'error',
  };
}

export function buildGuestReminderCampaignConfirmDescription(input: {
  segmentLabel: string;
  recipientCount: number;
  skipRecentlyInvited: boolean;
  noContactCount: number;
  recipients: GuestWithRSVP[];
}): string {
  const previewNames = input.recipients.slice(0, 3).map(getGuestDisplayName);
  const previewText = previewNames.length
    ? `\n\nFirst recipients: ${previewNames.join(', ')}${input.recipientCount > 3 ? ` +${input.recipientCount - 3} more` : ''}`
    : '';
  const noContactWarning = input.noContactCount > 0 ? `\nGuests without contact info: ${input.noContactCount} (not included)` : '';

  return `Group: ${input.segmentLabel}. Recipients: ${input.recipientCount}. Skip recent reminders: ${input.skipRecentlyInvited ? 'On' : 'Off'}.${noContactWarning ? ` ${noContactWarning.trim()}` : ''}${previewText ? ` ${previewText.trim()}` : ''}`;
}

export function buildGuestCampaignLogEntry(input: {
  now: Date;
  segment: string;
  count: number;
}): RsvpCampaignLogEntry {
  return {
    id: input.now.getTime(),
    segment: input.segment,
    count: input.count,
    sentAt: input.now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export function buildGuestCsvPreviewToast(input: {
  parsedCount: number;
  skippedCount: number;
  unknownEventCount: number;
  duplicateNameCount: number;
  householdWarningCount: number;
}): string {
  const skippedMsg = input.skippedCount > 0 ? ` (${input.skippedCount} row${input.skippedCount === 1 ? '' : 's'} need review)` : '';
  const unknownMsg = input.unknownEventCount > 0 ? `, ${input.unknownEventCount} event name${input.unknownEventCount === 1 ? '' : 's'} need review` : '';
  const duplicateMsg = input.duplicateNameCount > 0 ? `, ${input.duplicateNameCount} possible repeat${input.duplicateNameCount === 1 ? '' : 's'}` : '';
  const householdMsg = input.householdWarningCount > 0 ? `, ${input.householdWarningCount} household match${input.householdWarningCount === 1 ? '' : 'es'} need review` : '';
  return `${input.parsedCount} guest${input.parsedCount !== 1 ? 's' : ''} ready to import${skippedMsg}${unknownMsg}${duplicateMsg}${householdMsg}.`;
}

export function buildGuestCsvImportToast(input: {
  importedCount: number;
  skippedCount: number;
  unknownEventCount: number;
  householdKeyCount?: number;
  guardedHouseholdCount?: number;
  eventInviteCount?: number;
}): string {
  const skippedMsg = input.skippedCount > 0 ? `, ${input.skippedCount} row${input.skippedCount === 1 ? '' : 's'} need review` : '';
  const householdsMsg = (input.householdKeyCount ?? 0) > 0 ? `, ${input.householdKeyCount} household group${input.householdKeyCount === 1 ? '' : 's'}` : '';
  const guardedMsg = (input.guardedHouseholdCount ?? 0) > 0 ? `, ${input.guardedHouseholdCount} household match${input.guardedHouseholdCount === 1 ? '' : 'es'} left separate` : '';
  const eventsMsg = (input.eventInviteCount ?? 0) > 0 ? `, ${input.eventInviteCount} event invite${input.eventInviteCount === 1 ? '' : 's'}` : '';
  const unknownEventsMsg = input.unknownEventCount > 0 ? `, ${input.unknownEventCount} event name${input.unknownEventCount === 1 ? '' : 's'} need review` : '';
  return `${input.importedCount} guest${input.importedCount !== 1 ? 's' : ''} imported${skippedMsg}${householdsMsg}${guardedMsg}${eventsMsg}${unknownEventsMsg}`;
}

function rsvpLinkForInvite(origin: string, inviteToken: string | null | undefined): string {
  return inviteToken ? `${origin}/rsvp?token=${encodeURIComponent(inviteToken)}` : '';
}

export function buildGuestExportCsv(input: {
  guests: GuestWithRSVP[];
  origin: string;
  formatDate?: (value: string | null | undefined) => string;
}): string {
  const formatDate = input.formatDate ?? ((value) => value ? formatGuestOpsDate(value, undefined, '') : '');
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Plus One', 'Meal Choice', 'RSVP Date', 'RSVP Link', 'Custom Answers'];
  const rows = input.guests.map((guest) => [
    guest.first_name || '',
    guest.last_name || '',
    guest.email || '',
    guest.phone || '',
    guest.rsvp_status,
    guest.plus_one_allowed ? 'Yes' : 'No',
    guest.rsvp?.meal_choice || '',
    formatDate(guest.rsvp_received_at),
    rsvpLinkForInvite(input.origin, guest.invite_token),
    formatCustomAnswers(guest.rsvp?.custom_answers || null),
  ]);

  return toSafeCsv([headers, ...rows]);
}

export function buildThankYouDueCsv(guests: GuestWithRSVP[]): string {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'RSVP Status', 'Thank You Sent At'];
  const rows = guests.map((guest) => [
    guest.first_name || '',
    guest.last_name || '',
    guest.email || '',
    guest.phone || '',
    guest.rsvp_status,
    guest.thank_you_sent_at || '',
  ]);
  return toSafeCsv([headers, ...rows]);
}

export function buildCheckedInGuestsCsv(guests: GuestWithRSVP[]): string {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Checked In At'];
  const rows = guests.map((guest) => [
    guest.first_name || '',
    guest.last_name || '',
    guest.email || '',
    guest.phone || '',
    guest.checked_in_at || '',
  ]);
  return toSafeCsv([headers, ...rows]);
}

export function buildGuestAddressCollectionCsv(guests: GuestWithRSVP[]): string {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Address Line 1', 'Address Line 2', 'City', 'State/Province', 'ZIP/Postal', 'Country'];
  const rows = guests.map((guest) => {
    const row = guest as GuestAddressFields;
    return [
      guest.first_name || '',
      guest.last_name || '',
      guest.email || '',
      guest.phone || '',
      row.mailing_address_line1 || '',
      row.mailing_address_line2 || '',
      row.mailing_city || '',
      row.mailing_state || '',
      row.mailing_postal_code || '',
      row.mailing_country || '',
    ];
  });

  return toSafeCsv([headers, ...rows]);
}

export function buildHouseholdLabelsCsv(input: {
  guests: GuestWithRSVP[];
  origin: string;
}): string {
  const headers = ['Household ID', 'Recipient Names', 'Primary Email', 'Primary Phone', 'Address Line 1', 'Address Line 2', 'City', 'State/Province', 'ZIP/Postal', 'Country', 'Guest Count', 'RSVP Links'];
  const grouped = new Map<string, GuestWithRSVP[]>();
  input.guests.forEach((guest) => {
    const key = guest.household_id || `guest:${guest.id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), guest]);
  });

  const rows = Array.from(grouped.entries()).map(([householdId, members]) => {
    const sortedMembers = [...members].sort((a, b) => (a.last_name || a.name || '').localeCompare(b.last_name || b.name || ''));
    const primary = sortedMembers.find((guest) => {
      const row = guest as GuestAddressFields;
      return Boolean(row.mailing_address_line1 || guest.email || guest.phone);
    }) ?? sortedMembers[0];
    const primaryAddress = primary as GuestAddressFields;
    const recipientNames = sortedMembers
      .map(getGuestDisplayName)
      .filter(Boolean)
      .join(' and ');

    return [
      householdId.startsWith('guest:') ? '' : householdId,
      recipientNames,
      primary?.email || '',
      primary?.phone || '',
      primaryAddress?.mailing_address_line1 || '',
      primaryAddress?.mailing_address_line2 || '',
      primaryAddress?.mailing_city || '',
      primaryAddress?.mailing_state || '',
      primaryAddress?.mailing_postal_code || '',
      primaryAddress?.mailing_country || '',
      String(sortedMembers.length),
      sortedMembers
        .map((guest) => rsvpLinkForInvite(input.origin, guest.invite_token))
        .filter(Boolean)
        .join('; '),
    ];
  });

  return toSafeCsv([headers, ...rows]);
}

export function buildEventAttendanceCsv(input: {
  guests: GuestWithRSVP[];
  events: ItineraryEvent[];
  eventInviteGuestMap: Map<string, Set<string>>;
}): string {
  const headers = ['Event', 'Guest Name', 'Email', 'Phone', 'Invited', 'Event RSVP', 'Overall RSVP', 'Meal Choice', 'Custom Answers'];
  const rows = input.events.flatMap((event) => {
    const invitedGuests = input.guests.filter((guest) => {
      if (event.id === 'legacy-ceremony') return guest.invited_to_ceremony;
      if (event.id === 'legacy-reception') return guest.invited_to_reception;
      return input.eventInviteGuestMap.get(event.id)?.has(guest.id) ?? false;
    });

    return invitedGuests.map((guest) => {
      const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
      const eventRsvp =
        event.id === 'legacy-ceremony'
          ? eventSelections?.ceremony
          : event.id === 'legacy-reception'
            ? eventSelections?.reception
            : null;
      return [
        event.event_name,
        getGuestDisplayName(guest),
        guest.email || '',
        guest.phone || '',
        'Yes',
        eventRsvp === true ? 'Yes' : eventRsvp === false ? 'No' : 'Not captured',
        guest.rsvp_status,
        guest.rsvp?.meal_choice || '',
        formatCustomAnswers(guest.rsvp?.custom_answers || null),
      ];
    });
  });

  return toSafeCsv([headers, ...rows]);
}

export function getGuestIssueCount(guest: GuestWithRSVP): number {
  let issues = 0;
  const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
  if (isPendingRsvpStatus(guest.rsvp_status)) issues += 1;
  if (guest.rsvp?.attending && !guest.rsvp?.meal_choice) issues += 1;
  if (guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name) issues += 1;
  if (isPendingRsvpStatus(guest.rsvp_status) && !guest.email && !guest.phone) issues += 1;
  if (eventSelections?.ceremony === false || eventSelections?.reception === false) issues += 1;
  return issues;
}

export function getGuestPriorityScore(guest: GuestWithRSVP, daysToWedding: number | null): number {
  let score = 0;
  const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
  if (isPendingRsvpStatus(guest.rsvp_status)) score += 100;
  if (guest.rsvp?.attending && !guest.rsvp?.meal_choice) score += 60;
  if (guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name) score += 40;
  if (eventSelections?.ceremony === false || eventSelections?.reception === false) score += 15;
  if (isPendingRsvpStatus(guest.rsvp_status) && !guest.email) score += 20;
  if (daysToWedding !== null && daysToWedding <= 30) score += 15;
  return score;
}

export function compareGuestsByLastName(a: GuestWithRSVP, b: GuestWithRSVP): number {
  const aLast = (a.last_name || '').trim().toLowerCase();
  const bLast = (b.last_name || '').trim().toLowerCase();
  if (aLast !== bLast) return aLast.localeCompare(bLast);

  const aFirst = (a.first_name || '').trim().toLowerCase();
  const bFirst = (b.first_name || '').trim().toLowerCase();
  if (aFirst !== bFirst) return aFirst.localeCompare(bFirst);

  const aName = (a.name || '').trim().toLowerCase();
  const bName = (b.name || '').trim().toLowerCase();
  return aName.localeCompare(bName);
}

export function sortGuestsForDisplay(input: {
  guests: GuestWithRSVP[];
  sortByPriority: boolean;
  checkInMode: boolean;
  daysToWedding: number | null;
}): GuestWithRSVP[] {
  const base = input.sortByPriority
    ? [...input.guests].sort((a, b) => {
      const scoreDelta = getGuestPriorityScore(b, input.daysToWedding) - getGuestPriorityScore(a, input.daysToWedding);
      if (scoreDelta !== 0) return scoreDelta;
      return compareGuestsByLastName(a, b);
    })
    : [...input.guests].sort(compareGuestsByLastName);

  return input.checkInMode
    ? [...base].sort((a, b) => {
      const aChecked = Boolean(a.checked_in_at);
      const bChecked = Boolean(b.checked_in_at);
      if (aChecked !== bChecked) return aChecked ? 1 : -1;
      return compareGuestsByLastName(a, b);
    })
    : base;
}

export type GuestHouseholdGroups = {
  grouped: Array<[string, GuestWithRSVP[]]>;
  ungrouped: GuestWithRSVP[];
};

export function buildGuestHouseholdGroups(guests: GuestWithRSVP[]): GuestHouseholdGroups {
  const map = new Map<string, GuestWithRSVP[]>();
  const ungrouped: GuestWithRSVP[] = [];

  guests.forEach((guest) => {
    if (guest.household_id) {
      map.set(guest.household_id, [...(map.get(guest.household_id) ?? []), guest]);
    } else {
      ungrouped.push(guest);
    }
  });

  const grouped = [...map.entries()]
    .map(([id, members]) => [id, [...members].sort(compareGuestsByLastName)] as [string, GuestWithRSVP[]])
    .sort((a, b) => compareGuestsByLastName(a[1][0], b[1][0]));

  return { grouped, ungrouped: [...ungrouped].sort(compareGuestsByLastName) };
}

export function buildGuestFallbackStateMap(guests: GuestWithRSVP[]): Map<string, RsvpFallbackDescriptor> {
  return new Map(guests.map((guest) => [guest.id, getRsvpFallbackState({
    rsvpStatus: guest.rsvp_status,
    hasEmail: Boolean(guest.email),
    hasPhone: Boolean(guest.phone),
    manualHandled: typeof guest.notes === 'string' && guest.notes.toLowerCase().includes('[manual rsvp]'),
  })]));
}

export function buildGuestHouseholdStateMap(guests: GuestWithRSVP[]): Map<string, string> {
  return new Map(guests.map((guest) => {
    const householdMembers = guest.household_id ? guests.filter((member) => member.household_id === guest.household_id) : [];
    const mixedResponses = householdMembers.length > 1 && new Set(householdMembers.map((member) => member.rsvp_status)).size > 1;
    const unnamedPlusOne = Boolean(guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name);
    const state = mixedResponses
      ? 'Mixed household responses'
      : unnamedPlusOne
        ? 'Plus-one unresolved'
        : householdMembers.length > 1
          ? 'Grouped household'
          : 'Standalone guest';
    return [guest.id, state] as const;
  }));
}

export function buildGuestExceptionStateMap(guests: GuestWithRSVP[]): Map<string, RsvpExceptionState[]> {
  return new Map(guests.map((guest) => {
    const householdStatuses = guest.household_id ? guests.filter((member) => member.household_id === guest.household_id).map((member) => member.rsvp_status) : [];
    const states = getRsvpExceptionStates({
      householdStatuses,
      plusOneAllowed: guest.plus_one_allowed,
      plusOneName: guest.rsvp?.plus_one_name,
      attending: guest.rsvp?.attending,
      mealChoice: guest.rsvp?.meal_choice,
      manualHandled: typeof guest.notes === 'string' && guest.notes.toLowerCase().includes('[manual rsvp]'),
    });
    return [guest.id, states] as const;
  }));
}

export const GUEST_SEGMENT_LABELS: Record<string, string> = {
  all: 'All Guests',
  confirmed: 'Confirmed',
  declined: 'Declined',
  pending: 'Pending',
  'checked-in': 'Checked In',
  'thank-you-due': 'Thank You Due',
  'due-reminder': 'Due Reminder',
  'missing-address': 'Missing Address',
  'ceremony-no': 'Ceremony: No',
  'reception-no': 'Reception: No',
  'missing-meal': 'Missing Meal',
  'plusone-missing': 'Plus-one Missing Name',
  'pending-no-email': 'Pending, No Email',
  'manual-follow-up': 'Personal follow-up',
  'manual-handled': 'Handled personally',
  'no-contact': 'Missing contact info',
};

export function getGuestSegmentLabel(filter: string, events: ItineraryEvent[]): string {
  if (GUEST_SEGMENT_LABELS[filter]) return GUEST_SEGMENT_LABELS[filter];
  if (filter.startsWith('event-invited:')) {
    const eventId = filter.replace('event-invited:', '');
    const name = events.find((event) => event.id === eventId)?.event_name ?? 'Event';
    return `${name}: Invited`;
  }
  if (filter.startsWith('event-not-invited:')) {
    const eventId = filter.replace('event-not-invited:', '');
    const name = events.find((event) => event.id === eventId)?.event_name ?? 'Event';
    return `${name}: Not invited`;
  }
  return filter;
}

export function buildRsvpFollowUpSummary(input: {
  generatedAt: Date;
  segmentLabel: string;
  eligibleReminderCount: number;
  rsvpOps: GuestRsvpOpsStats;
  contactStats: GuestContactStats;
}): string {
  return [
    `RSVP Follow-up Summary (${input.generatedAt.toLocaleString()})`,
    `Segment: ${input.segmentLabel}`,
    `Eligible reminders: ${input.eligibleReminderCount}`,
    `No response: ${input.rsvpOps.noResponse}`,
    `Missing meal: ${input.rsvpOps.missingMeal}`,
    `Plus-one missing: ${input.rsvpOps.plusOneMissingName}`,
    `Pending no email: ${input.rsvpOps.pendingNoEmail}`,
    `Missing contact info: ${input.contactStats.withNoContact}`,
  ].join('\n');
}

export function buildRsvpExceptionChecklistLines(input: {
  guests: GuestWithRSVP[];
  exceptionStateByGuest: Map<string, RsvpExceptionState[]>;
}): string[] {
  return input.guests.flatMap((guest) => {
    const states = input.exceptionStateByGuest.get(guest.id) || [];
    if (!states.length) return [];
    return [`- ${getGuestDisplayName(guest)}: resolve ${states.join(', ')}`];
  });
}

export function buildMissingMealChecklistLines(guests: GuestWithRSVP[]): string[] {
  return guests
    .filter((guest) => isAttendingRsvpStatus(guest.rsvp_status) && !guest.rsvp?.meal_choice)
    .map((guest) => `- ${getGuestDisplayName(guest)}: confirm meal choice`);
}

export function buildNoContactChecklistLines(guests: GuestWithRSVP[]): string[] {
  return guests
    .filter((guest) => !guest.email && !guest.phone)
    .map((guest) => `- ${getGuestDisplayName(guest)}: get phone or email, then resend invite`);
}

export function buildFilteredEmailList(guests: GuestWithRSVP[]): string[] {
  return guests.map((guest) => guest.email).filter((email): email is string => Boolean(email));
}

export function buildSavedSegment(input: {
  now: Date;
  filterStatus: string;
  segmentLabel: string;
  guestCount: number;
}): RsvpSavedSegment {
  return {
    id: input.now.getTime(),
    label: `${input.segmentLabel} (${input.guestCount})`,
    filter: input.filterStatus,
    createdAt: input.now.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };
}

export function buildFollowUpTask(input: {
  now: Date;
  text: string;
}): RsvpFollowUpTask {
  return {
    id: input.now.getTime(),
    text: input.text,
    createdAt: input.now.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };
}

export function buildGeneratedFollowUpTasks(input: {
  now: Date;
  rsvpOps: GuestRsvpOpsStats;
  contactStats: GuestContactStats;
}): RsvpFollowUpTask[] {
  const tasks: string[] = [];
  if (input.rsvpOps.noResponse > 0) tasks.push(`Follow up ${input.rsvpOps.noResponse} pending RSVP(s)`);
  if (input.rsvpOps.missingMeal > 0) tasks.push(`Collect ${input.rsvpOps.missingMeal} missing meal choice(s)`);
  if (input.rsvpOps.plusOneMissingName > 0) tasks.push(`Collect ${input.rsvpOps.plusOneMissingName} plus-one name(s)`);
  if (input.rsvpOps.pendingNoEmail > 0) tasks.push(`Add contact details for ${input.rsvpOps.pendingNoEmail} pending guest(s)`);
  if (input.contactStats.withNoContact > 0) tasks.push(`Add contact info for ${input.contactStats.withNoContact} guest(s)`);

  return tasks.map((text, index) => ({
    id: input.now.getTime() + index,
    text,
    createdAt: input.now.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }));
}

export type GuestContactStats = {
  withEmail: number;
  withPhone: number;
  withNoContact: number;
  contactCoverage: number;
};

export type GuestDashboardStats = {
  confirmed: number;
  declined: number;
  pending: number;
  rsvpRate: number;
  total: number;
};

export type GuestRsvpOpsStats = {
  missingMeal: number;
  plusOneMissingName: number;
  ceremonyNo: number;
  receptionNo: number;
  noResponse: number;
  pendingNoEmail: number;
};

export type GuestRecommendedAction = {
  filter: 'pending-no-email' | 'pending' | 'missing-meal' | 'plusone-missing';
  title: string;
  detail: string;
};

export type GuestOpsQueueItem = {
  guestId: string;
  guestName: string;
  issue: string;
  filter: 'pending' | 'missing-meal' | 'plusone-missing' | 'ceremony-no' | 'reception-no';
};

export type GuestEventReportEntry = {
  id: string;
  name: string;
  invited: number;
  attending: number;
  declined: number;
  pending: number;
};

export type GuestDashboardFilterInput = {
  dueThankYouGuestIds: Set<string>;
  eventInviteGuestMap: Map<string, Set<string>>;
  extraFilters: string[];
  filterStatus: string;
  guests: GuestWithRSVP[];
  isDueReminder: (guest: GuestWithRSVP) => boolean;
  searchQuery: string;
};

export function getGuestRsvpConflictStats(input: {
  conflicts: RsvpConflict[];
  history: RsvpConflict[];
  now?: number;
}): RsvpConflictStats {
  const now = input.now ?? Date.now();
  const dayAgo = now - (24 * 60 * 60 * 1000);
  const threeDaysAgo = now - (72 * 60 * 60 * 1000);

  const opened24h = input.history.filter((conflict) => getGuestOpsTimestamp(conflict.created_at) >= dayAgo).length;
  const resolved24h = input.history.filter((conflict) => getGuestOpsTimestamp(conflict.resolved_at) >= dayAgo).length;
  const unresolvedOver24h = input.conflicts.filter((conflict) => getGuestOpsTimestamp(conflict.created_at) < dayAgo).length;
  const unresolvedOver72h = input.conflicts.filter((conflict) => getGuestOpsTimestamp(conflict.created_at) < threeDaysAgo).length;

  const codeCounts = new Map<string, number>();
  for (const conflict of input.history) {
    codeCounts.set(conflict.conflict_code, (codeCounts.get(conflict.conflict_code) ?? 0) + 1);
  }

  const topCodes = [...codeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([code, count]) => ({ code, count }));

  return {
    openNow: input.conflicts.length,
    opened24h,
    resolved24h,
    unresolvedOver24h,
    unresolvedOver72h,
    topCodes,
  };
}

export function isGuestDueReminder(guest: GuestWithRSVP, reminderCadenceDays: 1 | 3 | 7, now = Date.now()): boolean {
  const guestWithReminder = guest as GuestWithRSVP & { reminder_last_sent_at?: string | null; invitation_sent_at?: string | null };
  if (!guestWithReminder.email || !isPendingRsvpStatus(guestWithReminder.rsvp_status)) return false;
  const lastSentRaw = guestWithReminder.reminder_last_sent_at || guestWithReminder.invitation_sent_at;
  const lastSent = lastSentRaw ? new Date(lastSentRaw) : null;
  if (!lastSent || Number.isNaN(lastSent.getTime())) return true;
  return (now - lastSent.getTime()) >= reminderCadenceDays * 24 * 60 * 60 * 1000;
}

export function getGuestDueReminderIds(guests: GuestWithRSVP[], reminderCadenceDays: 1 | 3 | 7, now = Date.now()): Set<string> {
  return new Set(guests.filter((guest) => isGuestDueReminder(guest, reminderCadenceDays, now)).map((guest) => guest.id));
}

export function getGuestDueThankYouIds(guests: GuestWithRSVP[]): Set<string> {
  return new Set(
    guests
      .filter((guest) => isAttendingRsvpStatus(guest.rsvp_status) && !guest.thank_you_sent_at)
      .map((guest) => guest.id)
  );
}

export function downloadGuestCsv(csvContent: string, filenamePrefix: string, now = new Date()): void {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}_${now.toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function buildDemoImportedGuests(input: {
  previewRows: Record<string, unknown>[];
  now: number;
  createInviteToken: () => string;
}): GuestWithRSVP[] {
  return input.previewRows.map((row, idx) => ({
    id: `demo-import-${input.now}-${idx}`,
    first_name: String(row.first_name || ''),
    last_name: String(row.last_name || ''),
    name: `${String(row.first_name || '')} ${String(row.last_name || '')}`.trim(),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    plus_one_allowed: Boolean(row.plus_one_allowed),
    plus_one_name: null,
    children_allowed: Boolean(row.children_allowed),
    max_children: Number(row.max_children ?? 0),
    max_additional_guests: Number(row.max_additional_guests ?? 0),
    invited_to_ceremony: true,
    invited_to_reception: true,
    invite_token: input.createInviteToken(),
    rsvp_status: 'pending',
    rsvp_received_at: null,
    household_id: (row.__household_key as string | null) || null,
    group_name: (row.group_name as string | null) || null,
  } as GuestWithRSVP));
}

export function stripImportedGuestInternalFields(row: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...row };
  delete clean.__household_key;
  delete clean.__invited_event_ids;
  delete clean.__meal_choice;
  delete clean.__plus_one_name;
  delete clean.__plus_one_count;
  delete clean.__children_count;
  delete clean.__rsvp_date;
  return clean;
}

export function buildImportedGuestSidecars(input: {
  rows: Array<Record<string, unknown>>;
  inserted: Array<{ id?: string } | null | undefined>;
}): {
  keyToGuestIds: Map<string, string[]>;
  householdLastNames: Map<string, Set<string>>;
  eventInviteRows: Array<{ event_id: string; guest_id: string }>;
  rsvpRows: Array<{ guest_id: string; attending: boolean; meal_choice: string | null; plus_one_name: string | null; plus_one_count: number; children_count: number; responded_at: string | null }>;
} {
  const keyToGuestIds = new Map<string, string[]>();
  const householdLastNames = new Map<string, Set<string>>();
  const eventInviteRows: Array<{ event_id: string; guest_id: string }> = [];
  const rsvpRows: Array<{ guest_id: string; attending: boolean; meal_choice: string | null; plus_one_name: string | null; plus_one_count: number; children_count: number; responded_at: string | null }> = [];

  input.rows.forEach((row, idx) => {
    const guestId = input.inserted[idx]?.id;
    if (!guestId) return;

    const key = row.__household_key as string | null | undefined;
    if (key) {
      const existing = keyToGuestIds.get(key) ?? [];
      existing.push(guestId);
      keyToGuestIds.set(key, existing);
      const lastNames = householdLastNames.get(key) ?? new Set();
      const lastName = String(row.last_name || '').trim().toLowerCase();
      if (lastName) lastNames.add(lastName);
      householdLastNames.set(key, lastNames);
    }

    const eventIds = (row.__invited_event_ids as string[] | undefined) ?? [];
    eventIds.forEach((eventId) => eventInviteRows.push({ event_id: eventId, guest_id: guestId }));

    const status = String(row.rsvp_status || 'pending').toLowerCase();
    const attending = isAttendingRsvpStatus(status);
    const declined = isDeclinedRsvpStatus(status) || status === 'no';
    if (attending || declined) {
      rsvpRows.push({
        guest_id: guestId,
        attending,
        meal_choice: (row.__meal_choice as string | null | undefined) ?? null,
        plus_one_name: (row.__plus_one_name as string | null | undefined) ?? null,
        plus_one_count: Number(row.__plus_one_count ?? 0),
        children_count: Number(row.__children_count ?? 0),
        responded_at: (row.__rsvp_date as string | null | undefined)
          || (row.rsvp_received_at as string | null | undefined)
          || new Date().toISOString(),
      });
    }
  });

  return { keyToGuestIds, householdLastNames, eventInviteRows, rsvpRows };
}

export function getGuestDashboardStats(guests: GuestWithRSVP[]): GuestDashboardStats {
  const responded = guests.filter((guest) => !isPendingRsvpStatus(guest.rsvp_status)).length;
  return {
    total: guests.length,
    confirmed: guests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status)).length,
    declined: guests.filter((guest) => isDeclinedRsvpStatus(guest.rsvp_status)).length,
    pending: guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status)).length,
    rsvpRate: guests.length > 0 ? Math.round((responded / guests.length) * 100) : 0,
  };
}

function guestMatchesDashboardFilter(input: {
  dueThankYouGuestIds: Set<string>;
  eventInviteGuestMap: Map<string, Set<string>>;
  filter: string;
  guest: GuestWithRSVP;
  isDueReminder: (guest: GuestWithRSVP) => boolean;
}): boolean {
  const { dueThankYouGuestIds, eventInviteGuestMap, filter, guest, isDueReminder } = input;
  const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);

  if (filter.startsWith('event-invited:')) {
    const eventId = filter.replace('event-invited:', '');
    if (eventId === 'legacy-ceremony') return guest.invited_to_ceremony;
    if (eventId === 'legacy-reception') return guest.invited_to_reception;
    return eventInviteGuestMap.get(eventId)?.has(guest.id) ?? false;
  }

  if (filter.startsWith('event-not-invited:')) {
    const eventId = filter.replace('event-not-invited:', '');
    if (eventId === 'legacy-ceremony') return !guest.invited_to_ceremony;
    if (eventId === 'legacy-reception') return !guest.invited_to_reception;
    return !(eventInviteGuestMap.get(eventId)?.has(guest.id) ?? false);
  }

  return (
    filter === 'all' ||
    guest.rsvp_status === filter ||
    (filter === 'ceremony-no' && eventSelections?.ceremony === false) ||
    (filter === 'reception-no' && eventSelections?.reception === false) ||
    (filter === 'missing-meal' && !!guest.rsvp?.attending && !guest.rsvp?.meal_choice) ||
    (filter === 'plusone-missing' && !!guest.plus_one_allowed && !!guest.rsvp?.attending && !guest.rsvp?.plus_one_name) ||
    (filter === 'pending-no-email' && isPendingRsvpStatus(guest.rsvp_status) && !guest.email) ||
    (filter === 'no-contact' && !guest.email && !guest.phone) ||
    (filter === 'missing-address' && !(guest as GuestWithRSVP & { mailing_address_line1?: string | null }).mailing_address_line1) ||
    (filter === 'due-reminder' && isDueReminder(guest)) ||
    (filter === 'checked-in' && !!(guest as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at) ||
    (filter === 'thank-you-due' && dueThankYouGuestIds.has(guest.id))
  );
}

export function filterGuestDashboardGuests(input: GuestDashboardFilterInput): GuestWithRSVP[] {
  const searchTerm = input.searchQuery.toLowerCase();

  return input.guests.filter((guest) => {
    const matchesSearch =
      guest.first_name?.toLowerCase().includes(searchTerm) ||
      guest.last_name?.toLowerCase().includes(searchTerm) ||
      guest.name.toLowerCase().includes(searchTerm) ||
      guest.email?.toLowerCase().includes(searchTerm);

    const matchesPrimaryFilter = guestMatchesDashboardFilter({
      dueThankYouGuestIds: input.dueThankYouGuestIds,
      eventInviteGuestMap: input.eventInviteGuestMap,
      filter: input.filterStatus,
      guest,
      isDueReminder: input.isDueReminder,
    });
    const matchesExtraFilters = input.extraFilters.every((filter) => guestMatchesDashboardFilter({
      dueThankYouGuestIds: input.dueThankYouGuestIds,
      eventInviteGuestMap: input.eventInviteGuestMap,
      filter,
      guest,
      isDueReminder: input.isDueReminder,
    }));

    return matchesSearch && matchesPrimaryFilter && matchesExtraFilters;
  });
}

export function buildGuestEventReport(input: {
  eventInviteGuestMap: Map<string, Set<string>>;
  events: ItineraryEvent[];
  guests: GuestWithRSVP[];
}): GuestEventReportEntry[] {
  return input.events.map((event) => {
    const invitedGuests = input.guests.filter((guest) => {
      if (event.id === 'legacy-ceremony') return guest.invited_to_ceremony;
      if (event.id === 'legacy-reception') return guest.invited_to_reception;
      return input.eventInviteGuestMap.get(event.id)?.has(guest.id) ?? false;
    });

    const attendingCount = invitedGuests.filter((guest) => {
      const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
      if (event.id === 'legacy-ceremony') return eventSelections?.ceremony === true;
      if (event.id === 'legacy-reception') return eventSelections?.reception === true;
      return false;
    }).length;

    const declinedCount = invitedGuests.filter((guest) => {
      const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
      if (event.id === 'legacy-ceremony') return eventSelections?.ceremony === false;
      if (event.id === 'legacy-reception') return eventSelections?.reception === false;
      return false;
    }).length;

    return {
      id: event.id,
      name: event.event_name,
      invited: invitedGuests.length,
      attending: attendingCount,
      declined: declinedCount,
      pending: Math.max(invitedGuests.length - attendingCount - declinedCount, 0),
    };
  });
}

export function getGuestContactStats(guests: GuestWithRSVP[]): GuestContactStats {
  const reachable = guests.filter((guest) => Boolean(guest.email || guest.phone)).length;
  return {
    withEmail: guests.filter((guest) => Boolean(guest.email)).length,
    withPhone: guests.filter((guest) => Boolean(guest.phone)).length,
    withNoContact: guests.filter((guest) => !guest.email && !guest.phone).length,
    contactCoverage: guests.length > 0 ? Math.round((reachable / guests.length) * 100) : 0,
  };
}

export function getGuestRsvpOpsStats(guests: GuestWithRSVP[]): GuestRsvpOpsStats {
  return {
    missingMeal: guests.filter((guest) => guest.rsvp?.attending && !guest.rsvp?.meal_choice).length,
    plusOneMissingName: guests.filter((guest) => guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name).length,
    ceremonyNo: guests.filter((guest) => parseRsvpEventSelections(guest.rsvp?.notes ?? null)?.ceremony === false).length,
    receptionNo: guests.filter((guest) => parseRsvpEventSelections(guest.rsvp?.notes ?? null)?.reception === false).length,
    noResponse: guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status)).length,
    pendingNoEmail: guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status) && !guest.email).length,
  };
}

export function getGuestRecommendedAction(rsvpOps: GuestRsvpOpsStats): GuestRecommendedAction | null {
  if (rsvpOps.pendingNoEmail > 0) {
    return {
      filter: 'pending-no-email',
      title: 'Collect missing email addresses',
      detail: `${rsvpOps.pendingNoEmail} pending guests can’t receive reminders yet.`,
    };
  }
  if (rsvpOps.noResponse > 0) {
    return {
      filter: 'pending',
      title: 'Send reminder to pending guests',
      detail: `${rsvpOps.noResponse} guests still haven’t responded.`,
    };
  }
  if (rsvpOps.missingMeal > 0) {
    return {
      filter: 'missing-meal',
      title: 'Collect missing meal choices',
      detail: `${rsvpOps.missingMeal} attending guests are missing meal picks.`,
    };
  }
  if (rsvpOps.plusOneMissingName > 0) {
    return {
      filter: 'plusone-missing',
      title: 'Collect plus-one names',
      detail: `${rsvpOps.plusOneMissingName} RSVPs allow plus-ones but names are missing.`,
    };
  }
  return null;
}

export function getGuestRsvpCompleteness(rsvpOps: GuestRsvpOpsStats): number {
  return Math.max(0, 100 - Math.min(100, (
    (rsvpOps.noResponse * 0.55) +
    (rsvpOps.missingMeal * 0.25) +
    (rsvpOps.plusOneMissingName * 0.2)
  )));
}

export function getGuestCampaignReadiness(input: {
  totalGuests: number;
  contactStats: GuestContactStats;
  rsvpOps: GuestRsvpOpsStats;
}): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (input.totalGuests === 0
          ? 100
          : ((input.totalGuests - input.contactStats.withNoContact) / input.totalGuests) * 100) * 0.5 +
        (100 - Math.min(100, input.rsvpOps.pendingNoEmail * 12)) * 0.25 +
        (100 - Math.min(100, input.rsvpOps.noResponse * 4)) * 0.25
      )
    )
  );
}

export function buildGuestOpsQueue(guests: GuestWithRSVP[], limit = 8): GuestOpsQueueItem[] {
  return guests.flatMap((guest) => {
    const items: GuestOpsQueueItem[] = [];
    const name = getGuestDisplayName(guest);
    const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);

    if (isPendingRsvpStatus(guest.rsvp_status)) {
      items.push({ guestId: guest.id, guestName: name, issue: 'No RSVP response yet', filter: 'pending' });
    }
    if (guest.rsvp?.attending && !guest.rsvp?.meal_choice) {
      items.push({ guestId: guest.id, guestName: name, issue: 'Missing meal choice', filter: 'missing-meal' });
    }
    if (guest.plus_one_allowed && guest.rsvp?.attending && !guest.rsvp?.plus_one_name) {
      items.push({ guestId: guest.id, guestName: name, issue: 'Missing plus-one name', filter: 'plusone-missing' });
    }
    if (eventSelections?.ceremony === false) {
      items.push({ guestId: guest.id, guestName: name, issue: 'Ceremony declined', filter: 'ceremony-no' });
    }
    if (eventSelections?.reception === false) {
      items.push({ guestId: guest.id, guestName: name, issue: 'Reception declined', filter: 'reception-no' });
    }

    return items;
  }).slice(0, limit);
}

export type GuestSelectionToast = {
  message: string;
  variant: 'success' | 'error';
};

export function getUnresolvedGuestIds(guests: GuestWithRSVP[]): string[] {
  return guests.filter((guest) => getGuestIssueCount(guest) > 0).map((guest) => guest.id);
}

export function buildGuestSelectionToast(input: {
  count: number;
  singularLabel: string;
  pluralLabel: string;
  emptyMessage: string;
}): GuestSelectionToast {
  return {
    message: input.count > 0
      ? `Selected ${input.count} ${input.count === 1 ? input.singularLabel : input.pluralLabel}`
      : input.emptyMessage,
    variant: input.count > 0 ? 'success' : 'error',
  };
}

export function trimGuestSelectionToVisible(input: {
  selectedIds: Set<string>;
  visibleGuests: GuestWithRSVP[];
}): Set<string> {
  const visibleIds = new Set(input.visibleGuests.map((guest) => guest.id));
  const next = new Set<string>();
  input.selectedIds.forEach((id) => {
    if (visibleIds.has(id)) next.add(id);
  });
  return next;
}

export function buildGuestCampaignDryRun(input: {
  guests: GuestWithRSVP[];
  segmentLabel: string;
  previewLimit?: number;
}): {
  recipientNames: string[];
  text: string;
} {
  const previewLimit = input.previewLimit ?? 8;
  const recipientNames = input.guests.slice(0, previewLimit).map(getGuestDisplayName);
  const extraCount = Math.max(input.guests.length - recipientNames.length, 0);
  return {
    recipientNames,
    text: `Campaign dry run (${input.segmentLabel})\nRecipients: ${input.guests.length}\n\n${recipientNames.join('\n')}${extraCount > 0 ? `\n+${extraCount} more` : ''}`,
  };
}

export function buildGuestChecklistMarkdown(tasks: RsvpFollowUpTask[]): string {
  const lines = tasks.map((task) => `- [ ] ${task.text}`);
  return lines.length ? lines.join('\n') : '- [ ] No follow-up tasks yet';
}

export type GuestMealSummary = {
  withMealChoice: number;
  missingMealChoice: number;
  withDietaryNote: number;
};

export type GuestCustomAnswerRollupEntry = {
  question: string;
  answer: string;
  count: number;
};

export type GuestSongRequestEntry = {
  guestName: string;
  question: string;
  answer: string;
};

export function getGuestMealChoiceRollup(guests: GuestWithRSVP[]): Array<[string, number]> {
  return Array.from(
    guests.reduce((map, guest) => {
      const key = (guest.rsvp?.meal_choice || 'No meal selected').trim();
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);
}

export function getGuestCustomAnswerRollup(guests: GuestWithRSVP[], limit = 8): GuestCustomAnswerRollupEntry[] {
  return Array.from(
    guests.reduce((map, guest) => {
      const answers = guest.rsvp?.custom_answers || {};
      Object.entries(answers).forEach(([question, value]) => {
        const values = Array.isArray(value) ? value : [value];
        values
          .map((entry) => String(entry ?? '').trim())
          .filter(Boolean)
          .forEach((entry) => {
            const key = `${question}::${entry}`;
            map.set(key, (map.get(key) || 0) + 1);
          });
      });
      return map;
    }, new Map<string, number>())
  )
    .map(([key, count]) => {
      const [question, answer] = key.split('::');
      return { question, answer, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getGuestSongRequestEntries(guests: GuestWithRSVP[], limit = 12): GuestSongRequestEntry[] {
  return guests
    .flatMap((guest) => {
      const answers = guest.rsvp?.custom_answers || {};
      return Object.entries(answers)
        .filter(([question]) => /song|playlist|dance/i.test(question))
        .flatMap(([question, value]) => {
          const values = Array.isArray(value) ? value : [value];
          return values
            .map((entry) => String(entry ?? '').trim())
            .filter(Boolean)
            .map((entry) => ({
              guestName: getGuestDisplayName(guest),
              question,
              answer: entry,
            }));
        });
    })
    .slice(0, limit);
}

export function getGuestMealSummary(guests: GuestWithRSVP[]): GuestMealSummary {
  return {
    withMealChoice: guests.filter((guest) => Boolean(guest.rsvp?.meal_choice)).length,
    missingMealChoice: guests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status) && !guest.rsvp?.meal_choice).length,
    withDietaryNote: guests.filter((guest) => Boolean(extractDietaryNote(guest.rsvp?.custom_answers as Record<string, unknown> | null | undefined, guest.notes))).length,
  };
}
