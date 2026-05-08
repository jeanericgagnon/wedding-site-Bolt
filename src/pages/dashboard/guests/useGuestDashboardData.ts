import { useCallback, useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { demoGuests, demoRSVPs, demoWeddingSite } from '../../../lib/demoData';
import type { PlannerAccessRole, PlannerPermissionKey } from '../../../lib/plannerAccess';
import { hasRespondedRsvpStatus } from '../../../lib/rsvpStatus';
import type { ToastType } from '../../../components/ui/Toast';
import { readStoredDemoRsvpConfig } from './guestDashboardStorage';
import type {
  GuestAuditEntry,
  GuestWithRSVP,
  ItineraryEvent,
  RSVPQuestionSetting,
  RsvpConflict,
  WeddingSiteInfo,
} from './guestDashboardTypes';
import {
  loadGuestDashboardItineraryFilters,
  loadGuestDashboardRsvpAuditFeed,
  loadGuestDashboardSiteSettings,
  loadGuestDashboardSnapshot,
} from './guestService';

interface UseGuestDashboardDataInput {
  guestsTab: 'ops' | 'rsvp-config';
  isDemoMode: boolean;
  rsvpConfigLoadedRef: MutableRefObject<boolean>;
  setAutoRemindersEnabled: Dispatch<SetStateAction<boolean>>;
  setReminderCadenceDays: Dispatch<SetStateAction<1 | 3 | 7>>;
  toast: (message: string, type?: ToastType) => void;
  userId: string | null;
}

export function useGuestDashboardData({
  guestsTab,
  isDemoMode,
  rsvpConfigLoadedRef,
  setAutoRemindersEnabled,
  setReminderCadenceDays,
  toast,
  userId,
}: UseGuestDashboardDataInput) {
  const [guests, setGuests] = useState<GuestWithRSVP[]>([]);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingSiteInfo, setWeddingSiteInfo] = useState<WeddingSiteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestsRole, setGuestsRole] = useState<PlannerAccessRole>('owner');
  const [guestsPermissions, setGuestsPermissions] = useState<PlannerPermissionKey[] | null>(null);
  const [rsvpQuestions, setRsvpQuestions] = useState<RSVPQuestionSetting[]>([]);
  const [rsvpMealEnabled, setRsvpMealEnabled] = useState(true);
  const [rsvpMealOptions, setRsvpMealOptions] = useState<string[]>(['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan']);
  const [rsvpConflicts, setRsvpConflicts] = useState<RsvpConflict[]>([]);
  const [rsvpConflictHistory, setRsvpConflictHistory] = useState<RsvpConflict[]>([]);
  const [itineraryFilterEvents, setItineraryFilterEvents] = useState<ItineraryEvent[]>([]);
  const [eventInviteGuestMap, setEventInviteGuestMap] = useState<Map<string, Set<string>>>(new Map());
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [rsvpAuditFeed, setRsvpAuditFeed] = useState<GuestAuditEntry[]>([]);
  const [rsvpAuditLoading, setRsvpAuditLoading] = useState(false);

  const fetchWeddingSite = useCallback(async () => {
    if (!userId) {
      setWeddingSiteId(null);
      setWeddingSiteInfo(null);
      setGuests([]);
      return;
    }

    if (isDemoMode) {
      setWeddingSiteId(demoWeddingSite.id);
      const demoRsvpConfig = readStoredDemoRsvpConfig();
      setRsvpQuestions(demoRsvpConfig.questions);
      setRsvpMealEnabled(demoRsvpConfig.mealEnabled);
      setRsvpMealOptions(demoRsvpConfig.mealOptions);
      rsvpConfigLoadedRef.current = true;
      return;
    }

    try {
      const snapshot = await loadGuestDashboardSiteSettings(userId);
      setGuestsRole(snapshot.role);
      setGuestsPermissions(snapshot.permissions);

      if (snapshot.siteInfo) {
        setWeddingSiteId(snapshot.activeSiteId);
        setWeddingSiteInfo(snapshot.siteInfo);
        setRsvpQuestions(snapshot.questions);
        setRsvpMealEnabled(snapshot.mealEnabled);
        setRsvpMealOptions(snapshot.mealOptions);
        if (snapshot.reminderCadenceDays) setReminderCadenceDays(snapshot.reminderCadenceDays);
        setAutoRemindersEnabled(snapshot.autoRemindersEnabled);
        rsvpConfigLoadedRef.current = true;
      } else {
        setWeddingSiteId(null);
        setWeddingSiteInfo(null);
        setGuests([]);
      }
    } catch {
      setWeddingSiteId(null);
      setWeddingSiteInfo(null);
      setGuests([]);
      toast("Couldn’t load guest site settings right now. Please try again.", 'error');
    }
  }, [isDemoMode, rsvpConfigLoadedRef, setAutoRemindersEnabled, setReminderCadenceDays, toast, userId]);

  const fetchGuests = useCallback(async () => {
    if (!weddingSiteId) return;

    setLoading(true);
    try {
      if (isDemoMode) {
        const guestsWithRsvps = demoGuests.map((guest) => ({
          ...guest,
          phone: null,
          plus_one_allowed: false,
          plus_one_name: null,
          rsvp_received_at: hasRespondedRsvpStatus(guest.rsvp_status) ? new Date().toISOString() : null,
          rsvp: demoRSVPs.find((r) => r.guest_id === guest.id),
        }));
        setGuests(guestsWithRsvps as unknown as GuestWithRSVP[]);
        setRsvpConflicts([]);
        setRsvpConflictHistory([]);
        setLoading(false);
        return;
      }

      const snapshot = await loadGuestDashboardSnapshot(weddingSiteId);
      setGuests(snapshot.guests);
      setRsvpConflicts(snapshot.conflicts);
      setRsvpConflictHistory(snapshot.conflictHistory);
    } catch {
      setGuests([]);
      setRsvpConflicts([]);
      setRsvpConflictHistory([]);
      toast("Couldn’t load guest records right now. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, toast, weddingSiteId]);

  useEffect(() => {
    void fetchWeddingSite();
  }, [fetchWeddingSite]);

  useEffect(() => {
    if (weddingSiteId) {
      void fetchGuests();
    }
  }, [fetchGuests, weddingSiteId]);

  useEffect(() => {
    let cancelled = false;

    async function loadItineraryFilterData() {
      if (!weddingSiteId || isDemoMode) {
        if (!cancelled) {
          setItineraryFilterEvents([]);
          setEventInviteGuestMap(new Map());
        }
        return;
      }

      try {
        const snapshot = await loadGuestDashboardItineraryFilters(weddingSiteId);

        if (cancelled) return;
        setItineraryEvents(snapshot.itineraryEvents);
        setItineraryFilterEvents(snapshot.filterEvents);
        setEventInviteGuestMap(snapshot.eventInviteGuestMap);
      } catch {
        if (!cancelled) {
          toast("Couldn’t load itinerary filters right now. Please try again.", 'error');
          setItineraryFilterEvents([]);
          setEventInviteGuestMap(new Map());
        }
      }
    }

    void loadItineraryFilterData();
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, toast, weddingSiteId]);

  useEffect(() => {
    let cancelled = false;

    async function loadRsvpAuditFeed() {
      if (guestsTab !== 'rsvp-config') return;

      setRsvpAuditLoading(true);
      try {
        if (isDemoMode) {
          const now = Date.now();
          const demoEntries: GuestAuditEntry[] = guests.slice(0, 4).map((guest, index) => ({
            id: `demo-rsvp-audit-${guest.id}-${index}`,
            guest_id: guest.id,
            action: index % 3 === 0 ? 'insert' : 'update',
            changed_at: new Date(now - (index + 1) * 1000 * 60 * 35).toISOString(),
            changed_by: null,
            old_data: { rsvp_status: 'pending', name: guest.name },
            new_data: { rsvp_status: guest.rsvp_status, name: guest.name },
          }));
          if (!cancelled) setRsvpAuditFeed(demoEntries);
          return;
        }

        if (!weddingSiteId) {
          if (!cancelled) setRsvpAuditFeed([]);
          return;
        }

        const feed = await loadGuestDashboardRsvpAuditFeed(weddingSiteId);
        if (!cancelled) setRsvpAuditFeed(feed);
      } catch {
        if (!cancelled) {
          setRsvpAuditFeed([]);
          toast("Couldn’t load RSVP history right now. Please try again.", 'error');
        }
      } finally {
        if (!cancelled) setRsvpAuditLoading(false);
      }
    }

    void loadRsvpAuditFeed();
    return () => {
      cancelled = true;
    };
  }, [guests, guestsTab, isDemoMode, toast, weddingSiteId]);

  return {
    eventInviteGuestMap,
    fetchGuests,
    guests,
    guestsPermissions,
    guestsRole,
    itineraryEvents,
    itineraryFilterEvents,
    loading,
    rsvpAuditFeed,
    rsvpAuditLoading,
    rsvpConflictHistory,
    rsvpConflicts,
    rsvpMealEnabled,
    rsvpMealOptions,
    rsvpQuestions,
    setGuests,
    setGuestsPermissions,
    setGuestsRole,
    setItineraryEvents,
    setRsvpConflictHistory,
    setRsvpConflicts,
    setRsvpMealEnabled,
    setRsvpMealOptions,
    setRsvpQuestions,
    setWeddingSiteId,
    weddingSiteId,
    weddingSiteInfo,
  };
}
