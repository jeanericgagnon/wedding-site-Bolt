import { getDaysUntilGuestWedding } from '../guestWeddingDate';
import { parseRsvpEventSelections } from './guestDisplayUtils';
import type { GuestWithRSVP, ItineraryEvent } from './guestDashboardTypes';
import {
  buildGuestExceptionStateMap,
  buildGuestFallbackStateMap,
  buildGuestHouseholdStateMap,
  buildGuestOpsQueue,
  getGuestCampaignReadiness,
  getGuestContactStats,
  getGuestCustomAnswerRollup,
  getGuestIssueCount,
  getGuestMealChoiceRollup,
  getGuestMealSummary,
  getGuestRecommendedAction,
  getGuestRsvpCompleteness,
  getGuestRsvpOpsStats,
  getGuestSongRequestEntries,
  sortGuestsForDisplay,
} from './guestDashboardUtils';
import { hasRespondedRsvpStatus, isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../../lib/rsvpStatus';

type EventInviteGuestMap = Map<string, Set<string>>;

type BuildGuestDashboardDerivedStateArgs = {
  checkInMode: boolean;
  eventInviteGuestMap: EventInviteGuestMap;
  extraFilters: string[];
  filterStatus: 'all' | 'confirmed' | 'declined' | 'pending' | 'checked-in' | 'thank-you-due' | 'due-reminder' | 'missing-address' | 'ceremony-no' | 'reception-no' | 'missing-meal' | 'plusone-missing' | 'pending-no-email' | 'manual-follow-up' | 'manual-handled' | 'no-contact';
  guests: GuestWithRSVP[];
  searchQuery: string;
  skipRecentlyInvited: boolean;
  sortByPriority: boolean;
  reminderCadenceDays: 1 | 3 | 7;
  effectiveItineraryEvents: ItineraryEvent[];
  weddingDate: string | null | undefined;
};

export function buildGuestDashboardDerivedState({
  checkInMode,
  effectiveItineraryEvents,
  eventInviteGuestMap,
  extraFilters,
  filterStatus,
  guests,
  reminderCadenceDays,
  searchQuery,
  skipRecentlyInvited,
  sortByPriority,
  weddingDate,
}: BuildGuestDashboardDerivedStateArgs) {
  const reminderCadenceMs = reminderCadenceDays * 24 * 60 * 60 * 1000;
  const isDueReminder = (guestRecord: GuestWithRSVP) => {
    const guest = guestRecord as GuestWithRSVP & { reminder_last_sent_at?: string | null; invitation_sent_at?: string | null };
    if (!guest.email || !isPendingRsvpStatus(guest.rsvp_status)) return false;
    const lastSentRaw = guest.reminder_last_sent_at || guest.invitation_sent_at;
    const lastSent = lastSentRaw ? new Date(lastSentRaw) : null;
    if (!lastSent || Number.isNaN(lastSent.getTime())) return true;
    return (Date.now() - lastSent.getTime()) >= reminderCadenceMs;
  };

  const dueReminderGuestIds = new Set(guests.filter(isDueReminder).map((guest) => guest.id));
  const dueThankYouGuestIds = new Set(
    guests
      .filter((guest) => {
        const withThanks = guest as GuestWithRSVP & { thank_you_sent_at?: string | null };
        return isAttendingRsvpStatus(guest.rsvp_status) && !withThanks.thank_you_sent_at;
      })
      .map((guest) => guest.id)
  );

  const filteredGuests = guests.filter((guest) => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch =
      guest.first_name?.toLowerCase().includes(searchTerm) ||
      guest.last_name?.toLowerCase().includes(searchTerm) ||
      guest.name.toLowerCase().includes(searchTerm) ||
      guest.email?.toLowerCase().includes(searchTerm);

    const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
    const checkFilter = (filter: string) => {
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
    };

    const matchesPrimaryFilter = checkFilter(filterStatus);
    const matchesExtraFilters = extraFilters.every((filter) => checkFilter(filter));
    return matchesSearch && matchesPrimaryFilter && matchesExtraFilters;
  });

  const emailableFilteredGuests = filteredGuests.filter((guest) => !!guest.email && !!guest.invite_token);
  const daysToWedding = getDaysUntilGuestWedding(weddingDate ?? null);
  const displayedGuests = sortGuestsForDisplay({
    guests: filteredGuests,
    sortByPriority,
    checkInMode,
    daysToWedding,
  });
  const nextUnresolvedGuest = displayedGuests.find((guest) => getGuestIssueCount(guest) > 0);

  const stats = {
    total: guests.length,
    confirmed: guests.filter((guest) => isAttendingRsvpStatus(guest.rsvp_status)).length,
    declined: guests.filter((guest) => isDeclinedRsvpStatus(guest.rsvp_status)).length,
    pending: guests.filter((guest) => isPendingRsvpStatus(guest.rsvp_status)).length,
    rsvpRate: guests.length > 0
      ? Math.round((guests.filter((guest) => hasRespondedRsvpStatus(guest.rsvp_status)).length / guests.length) * 100)
      : 0,
  };

  const plannerHandoff = {
    title: 'Planner handoff guidance',
    detail: 'Work the queue, keep guest updates moving, and escalate sensitive calls back to the couple.',
  };

  const eventReport = effectiveItineraryEvents.map((event) => {
    const invitedGuests = guests.filter((guest) => {
      if (event.id === 'legacy-ceremony') return guest.invited_to_ceremony;
      if (event.id === 'legacy-reception') return guest.invited_to_reception;
      return eventInviteGuestMap.get(event.id)?.has(guest.id) ?? false;
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

  const mealChoiceRollup = getGuestMealChoiceRollup(guests);
  const customAnswerRollup = getGuestCustomAnswerRollup(guests);
  const songRequestEntries = getGuestSongRequestEntries(guests);
  const contactStats = getGuestContactStats(guests);
  const fallbackByGuest = buildGuestFallbackStateMap(filteredGuests);
  const householdStateByGuest = buildGuestHouseholdStateMap(filteredGuests);
  const mealSummary = getGuestMealSummary(filteredGuests);
  const exceptionStateByGuest = buildGuestExceptionStateMap(filteredGuests);
  const rsvpOps = getGuestRsvpOpsStats(guests);
  const recommendedAction = getGuestRecommendedAction(rsvpOps);
  const rsvpCompleteness = getGuestRsvpCompleteness(rsvpOps);
  const campaignReadiness = getGuestCampaignReadiness({ totalGuests: guests.length, contactStats, rsvpOps });
  const opsQueue = buildGuestOpsQueue(guests);
  const dueReminderCandidatesGlobal = guests.filter((guest) => !!guest.email && !!guest.invite_token && isDueReminder(guest));
  const reminderCandidates = emailableFilteredGuests.filter((guest) => {
    if (!skipRecentlyInvited) return true;
    return dueReminderGuestIds.has(guest.id);
  });

  return {
    campaignReadiness,
    contactStats,
    customAnswerRollup,
    daysToWedding,
    displayedGuests,
    dueReminderCandidatesGlobal,
    dueReminderGuestIds,
    dueThankYouGuestIds,
    emailableFilteredGuests,
    eventReport,
    exceptionStateByGuest,
    fallbackByGuest,
    filteredGuests,
    householdStateByGuest,
    isDueReminder,
    mealChoiceRollup,
    mealSummary,
    nextUnresolvedGuest,
    opsQueue,
    plannerHandoff,
    recommendedAction,
    reminderCandidates,
    rsvpCompleteness,
    rsvpOps,
    songRequestEntries,
    stats,
  };
}
