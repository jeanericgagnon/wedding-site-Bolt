import { useEffect, useRef } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';

import type { ToastType } from '../../../components/ui/Toast';
import type { GuestWithRSVP, ItineraryEvent } from './guestDashboardTypes';
import {
  createGuest,
  deleteGuestById,
  deleteGuestWithDependencies,
  generateSecureGuestInviteToken,
  insertEventInvitations,
  replaceGuestEventInvitations,
  restoreGuestEventInvitations,
  toEventInvitationRows,
  updateGuest,
  type GuestEventInvitationRollback,
} from './guestService';
import { safeGuestsDashboardError } from './guestDashboardUtils';

interface GuestFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  preferred_language: string;
  plus_one_allowed: boolean;
  require_plus_one_name: boolean;
  invited_to_ceremony: boolean;
  invited_to_reception: boolean;
}

interface UseGuestDashboardCrudActionsInput {
  effectiveItineraryEvents: ItineraryEvent[];
  eventInviteGuestMap: Map<string, Set<string>>;
  fetchGuests: () => Promise<void>;
  formData: GuestFormData;
  formEventInviteIds: Set<string>;
  guests: GuestWithRSVP[];
  isDemoMode: boolean;
  isGuestsReadOnly: boolean;
  logGuestAction: (type: string, summary: string, metadata?: Record<string, unknown>, targetId?: string | null, targetLabel?: string | null) => void;
  setConfirmDeleteId: Dispatch<SetStateAction<string | null>>;
  setDeletingGuestId: Dispatch<SetStateAction<string | null>>;
  setEditingGuest: Dispatch<SetStateAction<GuestWithRSVP | null>>;
  setFormData: Dispatch<SetStateAction<GuestFormData>>;
  setFormEventInviteIds: Dispatch<SetStateAction<Set<string>>>;
  setGuests: Dispatch<SetStateAction<GuestWithRSVP[]>>;
  setShowAddModal: Dispatch<SetStateAction<boolean>>;
  toast: (message: string, type?: ToastType) => void;
  weddingSiteId: string | null;
}

export function useGuestDashboardCrudActions({
  effectiveItineraryEvents,
  eventInviteGuestMap,
  fetchGuests,
  formData,
  formEventInviteIds,
  guests,
  isDemoMode,
  isGuestsReadOnly,
  logGuestAction,
  setConfirmDeleteId,
  setDeletingGuestId,
  setEditingGuest,
  setFormData,
  setFormEventInviteIds,
  setGuests,
  setShowAddModal,
  toast,
  weddingSiteId,
}: UseGuestDashboardCrudActionsInput) {
  const confirmDeleteTimeoutRef = useRef<number | null>(null);
  const guestCrudContextVersionRef = useRef(0);
  const guestCrudRequestIdRef = useRef(0);

  useEffect(() => {
    guestCrudContextVersionRef.current += 1;
    guestCrudRequestIdRef.current += 1;
    setConfirmDeleteId(null);
    setDeletingGuestId(null);
  }, [isDemoMode, setConfirmDeleteId, setDeletingGuestId, weddingSiteId]);

  useEffect(() => () => {
    guestCrudContextVersionRef.current += 1;
    guestCrudRequestIdRef.current += 1;
    if (confirmDeleteTimeoutRef.current) window.clearTimeout(confirmDeleteTimeoutRef.current);
  }, []);

  function isCurrentGuestCrudContext(contextVersion: number) {
    return contextVersion === guestCrudContextVersionRef.current;
  }

  const generateLocalInviteToken = () => `demo_${Math.random().toString(36).slice(2, 14)}`;

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      preferred_language: '',
      plus_one_allowed: false,
      require_plus_one_name: false,
      invited_to_ceremony: true,
      invited_to_reception: true,
    });
    setFormEventInviteIds(new Set(effectiveItineraryEvents.map((event) => event.id)));
  };

  const openEditModal = (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    setEditingGuest(guest);
    setFormData({
      first_name: guest.first_name || '',
      last_name: guest.last_name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      preferred_language: guest.preferred_language || '',
      plus_one_allowed: guest.plus_one_allowed,
      require_plus_one_name: false,
      invited_to_ceremony: guest.invited_to_ceremony,
      invited_to_reception: guest.invited_to_reception,
    });
    const invitedIds = effectiveItineraryEvents
      .filter((event) => {
        if (event.id === 'legacy-ceremony') return guest.invited_to_ceremony;
        if (event.id === 'legacy-reception') return guest.invited_to_reception;
        return eventInviteGuestMap.get(event.id)?.has(guest.id);
      })
      .map((event) => event.id);
    setFormEventInviteIds(new Set(invitedIds));
  };

  const handleAddGuest = async (event: FormEvent) => {
    event.preventDefault();
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (!weddingSiteId) return;

    const contextVersion = guestCrudContextVersionRef.current;
    const requestId = ++guestCrudRequestIdRef.current;
    const isCurrentGuestCrudRequest = () => (
      isCurrentGuestCrudContext(contextVersion) && requestId === guestCrudRequestIdRef.current
    );
    const targetWeddingSiteId = weddingSiteId;
    const targetFormData = { ...formData };
    const targetFormEventInviteIds = new Set(formEventInviteIds);
    let createdGuestId: string | null = null;

    try {
      if (isDemoMode) {
        const newGuest: GuestWithRSVP = {
          id: `demo-${Date.now()}`,
          first_name: targetFormData.first_name,
          last_name: targetFormData.last_name,
          name: `${targetFormData.first_name} ${targetFormData.last_name}`.trim(),
          email: targetFormData.email || null,
          phone: targetFormData.phone || null,
          preferred_language: targetFormData.preferred_language || null,
          plus_one_allowed: targetFormData.plus_one_allowed,
          plus_one_name: null,
          invited_to_ceremony: targetFormData.invited_to_ceremony,
          invited_to_reception: targetFormData.invited_to_reception,
          invite_token: generateLocalInviteToken(),
          rsvp_status: 'pending',
          rsvp_received_at: null,
          household_id: null,
        };

        if (!isCurrentGuestCrudRequest()) return;
        setGuests((prev) => [newGuest, ...prev]);
        setShowAddModal(false);
        resetForm();
        toast(`${targetFormData.first_name} ${targetFormData.last_name} added`, 'success');
        return;
      }

      const inviteToken = await generateSecureGuestInviteToken();
      if (!isCurrentGuestCrudRequest()) return;
      const selectedEventIds = Array.from(targetFormEventInviteIds);
      const invitedToCeremony = selectedEventIds.includes('legacy-ceremony');
      const invitedToReception = selectedEventIds.includes('legacy-reception');
      const realEventIds = selectedEventIds.filter((id) => !id.startsWith('legacy-'));

      createdGuestId = await createGuest({
        weddingSiteId: targetWeddingSiteId,
        firstName: targetFormData.first_name,
        lastName: targetFormData.last_name,
        email: targetFormData.email || null,
        phone: targetFormData.phone || null,
        preferredLanguage: targetFormData.preferred_language || null,
        plusOneAllowed: targetFormData.plus_one_allowed,
        invitedToCeremony,
        invitedToReception,
        inviteToken,
      });
      await insertEventInvitations(toEventInvitationRows(createdGuestId, realEventIds));
      if (!isCurrentGuestCrudRequest()) return;

      await fetchGuests();
      if (!isCurrentGuestCrudRequest()) return;
      setShowAddModal(false);
      resetForm();
      toast(`${targetFormData.first_name} ${targetFormData.last_name} added`, 'success');
    } catch (err) {
      if (createdGuestId) {
        await deleteGuestById(createdGuestId);
      }
      if (!isCurrentGuestCrudRequest()) return;
      toast(safeGuestsDashboardError(err, 'Couldn’t add guest. Please try again.'), 'error');
    }
  };

  const handleEditGuest = async (event: FormEvent, editingGuest: GuestWithRSVP | null) => {
    event.preventDefault();
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (!editingGuest) return;

    const contextVersion = guestCrudContextVersionRef.current;
    const requestId = ++guestCrudRequestIdRef.current;
    const isCurrentGuestCrudRequest = () => (
      isCurrentGuestCrudContext(contextVersion) && requestId === guestCrudRequestIdRef.current
    );
    const targetEditingGuest = editingGuest;
    const targetFormData = { ...formData };
    const targetFormEventInviteIds = new Set(formEventInviteIds);
    const previousGuestValues = {
      first_name: targetEditingGuest.first_name ?? null,
      last_name: targetEditingGuest.last_name ?? null,
      name: targetEditingGuest.name ?? null,
      email: targetEditingGuest.email ?? null,
      phone: targetEditingGuest.phone ?? null,
      preferred_language: targetEditingGuest.preferred_language ?? null,
      plus_one_allowed: targetEditingGuest.plus_one_allowed,
      invited_to_ceremony: targetEditingGuest.invited_to_ceremony,
      invited_to_reception: targetEditingGuest.invited_to_reception,
    };
    let eventInvitationRollback: GuestEventInvitationRollback | null = null;
    let guestUpdated = false;
    let invitesCleared = false;

    try {
      if (isDemoMode) {
        if (!isCurrentGuestCrudRequest()) return;
        setGuests((prev) => prev.map((guest) => (
          guest.id === targetEditingGuest.id
            ? {
                ...guest,
                first_name: targetFormData.first_name,
                last_name: targetFormData.last_name,
                name: `${targetFormData.first_name} ${targetFormData.last_name}`.trim(),
                email: targetFormData.email || null,
                phone: targetFormData.phone || null,
                preferred_language: targetFormData.preferred_language || null,
                plus_one_allowed: targetFormData.plus_one_allowed,
                invited_to_ceremony: targetFormData.invited_to_ceremony,
                invited_to_reception: targetFormData.invited_to_reception,
              }
            : guest
        )));
        setEditingGuest(null);
        resetForm();
        toast('Guest updated', 'success');
        return;
      }

      const selectedEventIds = Array.from(targetFormEventInviteIds);
      const invitedToCeremony = selectedEventIds.includes('legacy-ceremony');
      const invitedToReception = selectedEventIds.includes('legacy-reception');
      const realEventIds = selectedEventIds.filter((id) => !id.startsWith('legacy-'));

      await updateGuest({
        guestId: targetEditingGuest.id,
        firstName: targetFormData.first_name,
        lastName: targetFormData.last_name,
        name: `${targetFormData.first_name} ${targetFormData.last_name}`,
        email: targetFormData.email || null,
        phone: targetFormData.phone || null,
        preferredLanguage: targetFormData.preferred_language || null,
        plusOneAllowed: targetFormData.plus_one_allowed,
        invitedToCeremony,
        invitedToReception,
      });
      guestUpdated = true;

      eventInvitationRollback = await replaceGuestEventInvitations(targetEditingGuest.id, realEventIds);
      invitesCleared = true;
      if (!isCurrentGuestCrudRequest()) return;

      await fetchGuests();
      if (!isCurrentGuestCrudRequest()) return;
      setEditingGuest(null);
      resetForm();
      toast('Guest updated', 'success');
    } catch {
      if (!isDemoMode) {
        if (invitesCleared && eventInvitationRollback) {
          await restoreGuestEventInvitations(targetEditingGuest.id, eventInvitationRollback);
        }
        if (guestUpdated) {
          await updateGuest({
            guestId: targetEditingGuest.id,
            firstName: previousGuestValues.first_name,
            lastName: previousGuestValues.last_name,
            name: previousGuestValues.name,
            email: previousGuestValues.email,
            phone: previousGuestValues.phone,
            preferredLanguage: previousGuestValues.preferred_language,
            plusOneAllowed: previousGuestValues.plus_one_allowed,
            invitedToCeremony: previousGuestValues.invited_to_ceremony,
            invitedToReception: previousGuestValues.invited_to_reception,
          });
        }
      }
      if (!isCurrentGuestCrudRequest()) return;
      toast('Couldn’t update guest. Please try again.', 'error');
    }
  };

  const handleDeleteGuest = async (guestId: string, confirmDeleteId: string | null) => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (confirmDeleteId !== guestId) {
      setConfirmDeleteId(guestId);
      if (confirmDeleteTimeoutRef.current) window.clearTimeout(confirmDeleteTimeoutRef.current);
      confirmDeleteTimeoutRef.current = window.setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    const contextVersion = guestCrudContextVersionRef.current;
    const requestId = ++guestCrudRequestIdRef.current;
    const isCurrentGuestCrudRequest = () => (
      isCurrentGuestCrudContext(contextVersion) && requestId === guestCrudRequestIdRef.current
    );
    const targetGuestId = guestId;

    setDeletingGuestId(targetGuestId);
    setConfirmDeleteId(null);
    const guest = guests.find((candidate) => candidate.id === targetGuestId);
    try {
      if (isDemoMode) {
        if (!isCurrentGuestCrudRequest()) return;
        setGuests((prev) => prev.filter((candidate) => candidate.id !== targetGuestId));
        toast('Guest removed', 'success');
        return;
      }

      const { invitationCount } = await deleteGuestWithDependencies(targetGuestId);
      if (!isCurrentGuestCrudRequest()) return;

      await fetchGuests();
      if (!isCurrentGuestCrudRequest()) return;
      logGuestAction('guest_deleted', 'Guest was deleted from the guest list.', {
        hadRsvp: Boolean(guest?.rsvp),
        hadEmail: Boolean(guest?.email),
        hadPhone: Boolean(guest?.phone),
        invitationCount,
      }, targetGuestId, guest?.name || 'Guest');
      toast('Guest removed', 'success');
    } catch {
      if (!isCurrentGuestCrudRequest()) return;
      toast('Couldn’t remove guest. Please try again.', 'error');
    } finally {
      if (isCurrentGuestCrudRequest()) {
        setDeletingGuestId(null);
      }
    }
  };

  return {
    generateLocalInviteToken,
    handleAddGuest,
    handleDeleteGuest,
    handleEditGuest,
    openEditModal,
    resetForm,
  };
}
