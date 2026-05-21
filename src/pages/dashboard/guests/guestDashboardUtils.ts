import { customerSafeErrorMessage } from '../../../lib/customerSafeError';
import { toSafeCsv } from '../../../lib/csvExport';
import { downloadTextFile } from '../../../lib/copyText';
import { extractDietaryNote } from '../../../lib/dietaryNotes';
import { getRsvpExceptionStates, type RsvpExceptionState } from '../../../lib/rsvpExceptionState';
import { getRsvpFallbackState, type RsvpFallbackDescriptor } from '../../../lib/rsvpFallbackState';
import { isAttendingRsvpStatus, isPendingRsvpStatus } from '../../../lib/rsvpStatus';
import { formatGuestOpsDate } from '../guestOpsTime';
import { formatCustomAnswers, parseRsvpEventSelections } from './guestDisplayUtils';
import { type GuestWithRSVP, type ItineraryEvent, type RSVPQuestionSetting } from './guestDashboardTypes';
import { type RsvpFollowUpTask, type RsvpSavedSegment } from './guestDashboardStorage';

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

function rsvpLinkForInvite(origin: string, inviteToken: string | null | undefined): string {
  return inviteToken ? `${origin}/rsvp?token=${encodeURIComponent(inviteToken)}` : '';
}

export function buildGuestSmsRsvpLinkRows(input: { guests: GuestWithRSVP[]; siteSlug: string }): string[] {
  return input.guests.flatMap((guest) => {
    const link = rsvpLinkForInvite(`https://${input.siteSlug}.dayof.love`, guest.invite_token);
    if (!link) return [];
    return [`${getGuestDisplayName(guest)}: ${link}`];
  });
}

export function getGuestExportSegmentSuffix(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'segment';
}

export function downloadGuestCsv(csv: string, suffix: string): void {
  downloadTextFile(`dayof-${suffix}.csv`, csv, 'text/csv;charset=utf-8');
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
