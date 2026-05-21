import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { ToastType } from '../../../components/ui/Toast';
import { isDeclinedRsvpStatus } from '../../../lib/rsvpStatus';
import type { GuestAuditEntry, GuestWithRSVP, ItineraryEvent } from './guestDashboardTypes';
import {
  addGuestEventInvitation,
  assignGuestsToHouseholdForSite,
  loadGuestItineraryDrawerSnapshot,
  refreshGuestDashboardSession,
  removeGuestEventInvitation,
  saveAssistedGuestRsvp,
  setGuestsPreferredLanguageForSite,
  updateGuestCheckInForSite,
  updateGuestHouseholdForSite,
  updateGuestForSite,
  generateSecureGuestInviteToken,
  type AssistedRsvpSource,
  type AssistedRsvpStatus,
} from './guestService';
import { buildDemoGuestItinerarySnapshot } from './demoGuestItinerary';

interface UseGuestDashboardGuestDetailActionsInput {
  fetchGuests: () => Promise<void>;
  guests: GuestWithRSVP[];
  isDemoMode: boolean;
  isGuestsReadOnly: boolean;
  setGuests: Dispatch<SetStateAction<GuestWithRSVP[]>>;
  toast: (message: string, type?: ToastType) => void;
  weddingSiteId: string | null;
}

export function useGuestDashboardGuestDetailActions({
  fetchGuests,
  guests,
  isDemoMode,
  isGuestsReadOnly,
  setGuests,
  toast,
  weddingSiteId,
}: UseGuestDashboardGuestDetailActionsInput) {
  const guestDetailContextVersionRef = useRef(0);
  const itineraryDrawerRequestIdRef = useRef(0);
  const inviteTokenRequestIdRef = useRef(0);
  const assistedRsvpRequestIdRef = useRef(0);
  const detailCheckInRequestIdRef = useRef(0);
  const demoItinerarySnapshot = buildDemoGuestItinerarySnapshot();
  const [householdBusy, setHouseholdBusy] = useState(false);
  const [itineraryDrawerGuest, setItineraryDrawerGuest] = useState<GuestWithRSVP | null>(null);
  const [drawerItineraryEvents, setDrawerItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [guestEventIds, setGuestEventIds] = useState<Set<string>>(new Set());
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [guestAuditEntries, setGuestAuditEntries] = useState<GuestAuditEntry[]>([]);
  const [assistedRsvpGuest, setAssistedRsvpGuest] = useState<GuestWithRSVP | null>(null);
  const [assistedRsvpStatus, setAssistedRsvpStatus] = useState<AssistedRsvpStatus>('confirmed');
  const [assistedRsvpSource, setAssistedRsvpSource] = useState<AssistedRsvpSource>('phone');
  const [assistedRsvpNotes, setAssistedRsvpNotes] = useState('');
  const [assistedRsvpSaving, setAssistedRsvpSaving] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<{ guestId: string; guestName: string; at: number } | null>(null);
  const [rotatingInviteToken, setRotatingInviteToken] = useState(false);

  function resetGuestDetailState() {
    itineraryDrawerRequestIdRef.current += 1;
    inviteTokenRequestIdRef.current += 1;
    assistedRsvpRequestIdRef.current += 1;
    detailCheckInRequestIdRef.current += 1;
    setHouseholdBusy(false);
    setItineraryDrawerGuest(null);
    setDrawerItineraryEvents([]);
    setGuestEventIds(new Set());
    setLoadingDrawer(false);
    setTogglingEventId(null);
    setGuestAuditEntries([]);
    setAssistedRsvpGuest(null);
    setAssistedRsvpStatus('confirmed');
    setAssistedRsvpSource('phone');
    setAssistedRsvpNotes('');
    setAssistedRsvpSaving(false);
    setLastCheckIn(null);
    setRotatingInviteToken(false);
  }

  useEffect(() => {
    guestDetailContextVersionRef.current += 1;
    if (!weddingSiteId && !isDemoMode) {
      resetGuestDetailState();
    }
  }, [isDemoMode, weddingSiteId]);

  function isCurrentGuestDetailContext(contextVersion: number) {
    return contextVersion === guestDetailContextVersionRef.current;
  }

  function applyInviteTokenLocally(guestId: string, inviteToken: string | null) {
    setGuests((prev) =>
      prev.map((guest) => (
        guest.id === guestId
          ? { ...guest, invite_token: inviteToken }
          : guest
      )),
    );
    setItineraryDrawerGuest((prev) => (
      prev?.id === guestId
        ? { ...prev, invite_token: inviteToken }
        : prev
    ));
  }

  async function handleMergeIntoHousehold(selectedGuestIds: Set<string>, onMerged?: () => void) {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (selectedGuestIds.size < 2 || !weddingSiteId || isDemoMode) return;
    const contextVersion = guestDetailContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    setHouseholdBusy(true);
    try {
      const ids = [...selectedGuestIds];
      const householdId = ids[0];
      await assignGuestsToHouseholdForSite(targetWeddingSiteId, ids, householdId);
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      onMerged?.();
      toast(`${ids.length} guests merged into one household`, 'success');
    } catch {
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      toast('Couldn’t merge guests.', 'error');
    } finally {
      if (isCurrentGuestDetailContext(contextVersion)) {
        setHouseholdBusy(false);
      }
    }
  }

  async function handleSplitFromHousehold(guestId: string) {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    const contextVersion = guestDetailContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    setHouseholdBusy(true);
    try {
      await updateGuestHouseholdForSite(targetWeddingSiteId, guestId, null);
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      toast('Guest removed from household', 'success');
    } catch {
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      toast('Couldn’t remove guest from household.', 'error');
    } finally {
      if (isCurrentGuestDetailContext(contextVersion)) {
        setHouseholdBusy(false);
      }
    }
  }

  async function handleReassignHousehold(guestId: string, newHouseholdId: string) {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    const contextVersion = guestDetailContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    try {
      await updateGuestHouseholdForSite(targetWeddingSiteId, guestId, newHouseholdId || null);
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      toast('Guest reassigned', 'success');
    } catch {
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      toast('Couldn’t move guest to that household.', 'error');
    }
  }

  async function handleSetGuestsPreferredLanguage(
    selectedGuestIds: Set<string>,
    preferredLanguage: string,
    onApplied?: () => void,
  ) {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (selectedGuestIds.size < 1 || !weddingSiteId || isDemoMode) return;
    const contextVersion = guestDetailContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    setHouseholdBusy(true);
    try {
      const ids = [...selectedGuestIds];
      await setGuestsPreferredLanguageForSite(targetWeddingSiteId, ids, preferredLanguage || null);
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      await fetchGuests();
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      onApplied?.();
      toast(
        preferredLanguage
          ? `Saved guest language for ${ids.length} guest${ids.length === 1 ? '' : 's'}`
          : `Cleared guest language for ${ids.length} guest${ids.length === 1 ? '' : 's'}`,
        'success',
      );
    } catch {
      if (!isCurrentGuestDetailContext(contextVersion)) return;
      toast('Couldn’t update guest language right now.', 'error');
    } finally {
      if (isCurrentGuestDetailContext(contextVersion)) {
        setHouseholdBusy(false);
      }
    }
  }

  async function openItineraryDrawer(guest: GuestWithRSVP) {
    if (!weddingSiteId) return;
    const contextVersion = guestDetailContextVersionRef.current;
    const requestId = ++itineraryDrawerRequestIdRef.current;
    const isCurrentItineraryDrawer = () =>
      isCurrentGuestDetailContext(contextVersion) && requestId === itineraryDrawerRequestIdRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const targetGuest = guest;
    setItineraryDrawerGuest(guest);
    setLoadingDrawer(true);
    setDrawerItineraryEvents([]);
    setGuestEventIds(new Set());
    setGuestAuditEntries([]);
    setTogglingEventId(null);
    setRotatingInviteToken(false);
    try {
      if (isDemoMode) {
        const now = Date.now();
        if (!isCurrentItineraryDrawer()) return;
        setDrawerItineraryEvents(demoItinerarySnapshot.itineraryEvents);
        setGuestAuditEntries([
          { id: `${targetGuest.id}-a1`, action: 'update', changed_at: new Date(now - 1000 * 60 * 90).toISOString(), changed_by: null, old_data: { rsvp_status: 'pending' }, new_data: { rsvp_status: targetGuest.rsvp_status } },
          { id: `${targetGuest.id}-a2`, action: 'update', changed_at: new Date(now - 1000 * 60 * 60 * 26).toISOString(), changed_by: null, old_data: { invited_to_reception: false }, new_data: { invited_to_reception: targetGuest.invited_to_reception } },
        ]);
        setGuestEventIds(new Set(demoItinerarySnapshot.guestInvitedEventIds.get(targetGuest.id) ?? []));
      }

      if (!isDemoMode) {
        const snapshot = await loadGuestItineraryDrawerSnapshot(targetWeddingSiteId, targetGuest.id);
        if (!isCurrentItineraryDrawer()) return;
        setDrawerItineraryEvents(snapshot.events);
        setGuestEventIds(snapshot.guestEventIds);
        setGuestAuditEntries(snapshot.auditEntries);
      }
    } catch {
      if (!isCurrentItineraryDrawer()) return;
      toast('Couldn’t load guest itinerary details right now. Please try again.', 'error');
    } finally {
      if (isCurrentItineraryDrawer()) {
        setLoadingDrawer(false);
      }
    }
  }

  async function handleToggleEventInvite(eventId: string, currentlyInvited: boolean) {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (!itineraryDrawerGuest || togglingEventId) return;
    const contextVersion = guestDetailContextVersionRef.current;
    const requestId = itineraryDrawerRequestIdRef.current;
    const isCurrentItineraryDrawer = () =>
      isCurrentGuestDetailContext(contextVersion) && requestId === itineraryDrawerRequestIdRef.current;
    const targetGuestId = itineraryDrawerGuest.id;
    setTogglingEventId(eventId);
    try {
      if (currentlyInvited) {
        await removeGuestEventInvitation(eventId, targetGuestId);
        if (!isCurrentItineraryDrawer()) return;
        setGuestEventIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      } else {
        await addGuestEventInvitation(eventId, targetGuestId);
        if (!isCurrentItineraryDrawer()) return;
        setGuestEventIds((prev) => new Set([...prev, eventId]));
      }
    } catch {
      if (!isCurrentItineraryDrawer()) return;
      toast('Couldn’t update that event invite.', 'error');
    } finally {
      if (isCurrentItineraryDrawer()) {
        setTogglingEventId(null);
      }
    }
  }

  async function handleRotateGuestInviteToken() {
    if (!itineraryDrawerGuest) return;
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot rotate guest access links.', 'info');
      return;
    }
    if (!weddingSiteId && !isDemoMode) return;

    const contextVersion = guestDetailContextVersionRef.current;
    const requestId = ++inviteTokenRequestIdRef.current;
    const isCurrentInviteTokenRequest = () =>
      isCurrentGuestDetailContext(contextVersion) && requestId === inviteTokenRequestIdRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const targetGuestId = itineraryDrawerGuest.id;
    setRotatingInviteToken(true);
    try {
      const nextToken = isDemoMode
        ? `demo-guest-${targetGuestId}-${Date.now().toString(36)}`
        : await generateSecureGuestInviteToken();
      if (!isCurrentInviteTokenRequest()) return;

      if (isDemoMode) {
        applyInviteTokenLocally(targetGuestId, nextToken);
      } else if (targetWeddingSiteId) {
        await updateGuestForSite(targetWeddingSiteId, targetGuestId, { invite_token: nextToken });
        if (!isCurrentInviteTokenRequest()) return;
        await fetchGuests();
        if (!isCurrentInviteTokenRequest()) return;
        applyInviteTokenLocally(targetGuestId, nextToken);
      }

      toast('Private RSVP access rotated for this guest', 'success');
    } catch {
      if (!isCurrentInviteTokenRequest()) return;
      toast('Couldn’t rotate guest access right now.', 'error');
    } finally {
      if (isCurrentInviteTokenRequest()) {
        setRotatingInviteToken(false);
      }
    }
  }

  async function handleRevokeGuestInviteToken() {
    if (!itineraryDrawerGuest) return;
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot revoke guest access links.', 'info');
      return;
    }
    if (!weddingSiteId && !isDemoMode) return;

    const contextVersion = guestDetailContextVersionRef.current;
    const requestId = ++inviteTokenRequestIdRef.current;
    const isCurrentInviteTokenRequest = () =>
      isCurrentGuestDetailContext(contextVersion) && requestId === inviteTokenRequestIdRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const targetGuestId = itineraryDrawerGuest.id;
    setRotatingInviteToken(true);
    try {
      if (isDemoMode) {
        applyInviteTokenLocally(targetGuestId, null);
      } else if (targetWeddingSiteId) {
        await updateGuestForSite(targetWeddingSiteId, targetGuestId, { invite_token: null });
        if (!isCurrentInviteTokenRequest()) return;
        await fetchGuests();
        if (!isCurrentInviteTokenRequest()) return;
        applyInviteTokenLocally(targetGuestId, null);
      }

      toast('Private RSVP access revoked for this guest', 'success');
    } catch {
      if (!isCurrentInviteTokenRequest()) return;
      toast('Couldn’t revoke guest access right now.', 'error');
    } finally {
      if (isCurrentInviteTokenRequest()) {
        setRotatingInviteToken(false);
      }
    }
  }

  function openAssistedRsvpModal(guest: GuestWithRSVP) {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }

    setAssistedRsvpGuest(guest);
    setAssistedRsvpStatus(isDeclinedRsvpStatus(guest.rsvp_status) ? 'declined' : 'confirmed');
    setAssistedRsvpSource('phone');
    setAssistedRsvpNotes('');
  }

  async function handleSaveAssistedRsvp() {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot record assisted RSVPs.', 'info');
      return;
    }
    if (!assistedRsvpGuest) return;
    const contextVersion = guestDetailContextVersionRef.current;
    const requestId = ++assistedRsvpRequestIdRef.current;
    const isCurrentAssistedRsvpRequest = () =>
      isCurrentGuestDetailContext(contextVersion) && requestId === assistedRsvpRequestIdRef.current;
    const targetAssistedRsvpGuest = assistedRsvpGuest;
    const targetAssistedRsvpStatus = assistedRsvpStatus;
    const targetAssistedRsvpSource = assistedRsvpSource;
    const targetAssistedRsvpNotes = assistedRsvpNotes;
    try {
      setAssistedRsvpSaving(true);

      if (isDemoMode) {
        const demoRecordedAt = new Date().toISOString();
        const demoManualTag = `[Manual RSVP source:${targetAssistedRsvpSource} recorded:${demoRecordedAt}]`;
        const nextNotes = [demoManualTag, targetAssistedRsvpNotes.trim()].filter(Boolean).join(' ');
        if (!isCurrentAssistedRsvpRequest()) return;
        setGuests((prev) =>
          prev.map((guest) =>
            guest.id === targetAssistedRsvpGuest.id
              ? {
                  ...guest,
                  rsvp_status: targetAssistedRsvpStatus,
                  rsvp_received_at: new Date().toISOString(),
                  notes: nextNotes,
                  rsvp: targetAssistedRsvpStatus === 'confirmed'
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
                }
              : guest,
          ),
        );
        setAssistedRsvpGuest(null);
        toast('RSVP recorded for guest', 'success');
        return;
      }

      await saveAssistedGuestRsvp({
        guest: targetAssistedRsvpGuest,
        status: targetAssistedRsvpStatus,
        source: targetAssistedRsvpSource,
        notes: targetAssistedRsvpNotes,
      });
      if (!isCurrentAssistedRsvpRequest()) return;

      await fetchGuests();
      if (!isCurrentAssistedRsvpRequest()) return;
      setAssistedRsvpGuest(null);
      toast('RSVP recorded for guest', 'success');
    } catch {
      if (!isCurrentAssistedRsvpRequest()) return;
      toast('Couldn’t save assisted RSVP.', 'error');
    } finally {
      if (isCurrentAssistedRsvpRequest()) {
        setAssistedRsvpSaving(false);
      }
    }
  }

  async function handleToggleCheckIn(guest: GuestWithRSVP) {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update guest check-in.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) {
      toast('Check-in is unavailable in demo mode.', 'error');
      return;
    }

    const nextValue = guest.checked_in_at ? null : new Date().toISOString();
    const contextVersion = guestDetailContextVersionRef.current;
    const requestId = ++detailCheckInRequestIdRef.current;
    const isCurrentDetailCheckInRequest = () =>
      isCurrentGuestDetailContext(contextVersion) && requestId === detailCheckInRequestIdRef.current;
    const targetWeddingSiteId = weddingSiteId;
    const updateCheckin = async () => updateGuestCheckInForSite(targetWeddingSiteId, guest.id, nextValue);

    try {
      await updateCheckin();
      if (!isCurrentDetailCheckInRequest()) return;
      await fetchGuests();
      if (!isCurrentDetailCheckInRequest()) return;
      if (nextValue) {
        const guestName = (guest.first_name || guest.last_name)
          ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim()
          : guest.name;
        setLastCheckIn({ guestId: guest.id, guestName, at: Date.now() });
      }
      toast(nextValue ? 'Guest checked in' : 'Guest check-in cleared', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (authish) {
        try {
          await refreshGuestDashboardSession();
          if (!isCurrentDetailCheckInRequest()) return;
          await updateCheckin();
          if (!isCurrentDetailCheckInRequest()) return;
          await fetchGuests();
          if (!isCurrentDetailCheckInRequest()) return;
          toast(nextValue ? 'Guest checked in' : 'Guest check-in cleared', 'success');
          return;
        } catch {
          // fall through
        }
      }
      if (!isCurrentDetailCheckInRequest()) return;
      toast('Couldn’t update check-in status.', 'error');
    }
  }

  return {
    assistedRsvpGuest,
    assistedRsvpNotes,
    assistedRsvpSaving,
    assistedRsvpSource,
    assistedRsvpStatus,
    guestAuditEntries,
    guestEventIds,
    handleMergeIntoHousehold,
    handleReassignHousehold,
    handleSaveAssistedRsvp,
    handleSetGuestsPreferredLanguage,
    handleSplitFromHousehold,
    handleToggleCheckIn,
    handleToggleEventInvite,
    householdBusy,
    itineraryDrawerGuest,
    drawerItineraryEvents,
    lastCheckIn,
    loadingDrawer,
    openAssistedRsvpModal,
    openItineraryDrawer,
    handleRevokeGuestInviteToken,
    handleRotateGuestInviteToken,
    rotatingInviteToken,
    setAssistedRsvpGuest,
    setAssistedRsvpNotes,
    setAssistedRsvpSource,
    setAssistedRsvpStatus,
    setGuestAuditEntries,
    setGuestEventIds,
    setDrawerItineraryEvents,
    setItineraryDrawerGuest,
    setLastCheckIn,
    setLoadingDrawer,
    togglingEventId,
    setTogglingEventId,
    setRotatingInviteToken,
  };
}
