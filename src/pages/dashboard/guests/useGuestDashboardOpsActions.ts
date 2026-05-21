import { useCallback, useEffect, useRef } from 'react';
import type { GuestWithRSVP } from './guestDashboardTypes';
import { deleteAllGuestsForSite, persistGuestReminderSettings } from './guestService';
import { safeGuestsDashboardError } from './guestDashboardUtils';

type ToastFn = (message: string, tone?: 'success' | 'error' | 'warning' | 'info') => void;

type UseGuestDashboardOpsActionsArgs = {
  deleteAllConfirmInput: string;
  fetchGuests: () => Promise<void>;
  filteredGuests: GuestWithRSVP[];
  guests: GuestWithRSVP[];
  isDemoMode: boolean;
  isGuestsReadOnly: boolean;
  logGuestAction: (
    type: string,
    summary: string,
    metadata?: Record<string, unknown>,
    targetId?: string | null,
    targetLabel?: string | null
  ) => void;
  setCampaignPreset: React.Dispatch<React.SetStateAction<'pending' | 'missing-meal' | 'plusone-missing' | 'ceremony-no' | 'reception-no' | 'pending-no-email'>>;
  setDeleteAllBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setDeleteAllConfirmInput: React.Dispatch<React.SetStateAction<string>>;
  setExtraFilters: React.Dispatch<React.SetStateAction<string[]>>;
  setFilterStatus: React.Dispatch<React.SetStateAction<'all' | 'confirmed' | 'declined' | 'pending' | 'checked-in' | 'thank-you-due' | 'due-reminder' | 'missing-address' | 'ceremony-no' | 'reception-no' | 'missing-meal' | 'plusone-missing' | 'pending-no-email' | 'manual-follow-up' | 'manual-handled' | 'no-contact'>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setSelectedGuestIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowDeleteAllModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSortByPriority: React.Dispatch<React.SetStateAction<boolean>>;
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'households'>>;
  toast: ToastFn;
  weddingSiteId: string | null;
};

export function useGuestDashboardOpsActions({
  deleteAllConfirmInput,
  fetchGuests,
  filteredGuests,
  guests,
  isDemoMode,
  isGuestsReadOnly,
  logGuestAction,
  setCampaignPreset,
  setDeleteAllBusy,
  setDeleteAllConfirmInput,
  setExtraFilters,
  setFilterStatus,
  setSearchQuery,
  setSelectedGuestIds,
  setShowDeleteAllModal,
  setSortByPriority,
  setViewMode,
  toast,
  weddingSiteId,
}: UseGuestDashboardOpsActionsArgs) {
  const guestOpsContextVersionRef = useRef(0);

  useEffect(() => {
    guestOpsContextVersionRef.current += 1;
    setDeleteAllBusy(false);
  }, [isDemoMode, setDeleteAllBusy, weddingSiteId]);

  function isCurrentGuestOpsContext(contextVersion: number) {
    return contextVersion === guestOpsContextVersionRef.current;
  }

  const applyCampaignPreset = useCallback((preset: 'pending' | 'missing-meal' | 'plusone-missing' | 'ceremony-no' | 'reception-no' | 'pending-no-email') => {
    setCampaignPreset(preset);
    setFilterStatus(preset);
    setViewMode('list');
    setSearchQuery('');
  }, [setCampaignPreset, setFilterStatus, setSearchQuery, setViewMode]);

  const persistReminderSettingsForSite = useCallback(async (patch: { reminder_cadence_days?: 1 | 3 | 7; auto_reminders_enabled?: boolean }) => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return false;
    }

    if (!weddingSiteId || isDemoMode) return false;
    const contextVersion = guestOpsContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    await persistGuestReminderSettings(targetWeddingSiteId, patch);
    if (!isCurrentGuestOpsContext(contextVersion)) return false;
    return true;
  }, [isDemoMode, isGuestsReadOnly, toast, weddingSiteId]);

  const handleDeleteAllGuests = useCallback(async () => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }

    if (!weddingSiteId || isDemoMode) {
      toast('Deleting the full guest list is unavailable in demo mode.', 'error');
      return;
    }

    const required = String(guests.length);
    if (deleteAllConfirmInput.trim() !== required) {
      toast(`Type ${required} to confirm deletion.`, 'error');
      return;
    }

    const contextVersion = guestOpsContextVersionRef.current;
    const targetWeddingSiteId = weddingSiteId;
    setDeleteAllBusy(true);
    try {
      const { guestIds } = await deleteAllGuestsForSite(targetWeddingSiteId);
      if (!isCurrentGuestOpsContext(contextVersion)) return;

      await fetchGuests();
      if (!isCurrentGuestOpsContext(contextVersion)) return;
      setSelectedGuestIds(new Set());
      setShowDeleteAllModal(false);
      setDeleteAllConfirmInput('');
      logGuestAction('guest_list_deleted_bulk', 'All guests were deleted from the guest list.', {
        guestCount: guestIds.length,
      }, targetWeddingSiteId, 'Guest list');
      toast(`Deleted ${required} guests.`, 'success');
    } catch (err) {
      if (!isCurrentGuestOpsContext(contextVersion)) return;
      toast(safeGuestsDashboardError(err, 'Couldn’t delete all guests. Please try again.'), 'error');
    } finally {
      if (isCurrentGuestOpsContext(contextVersion)) {
        setDeleteAllBusy(false);
      }
    }
  }, [
    deleteAllConfirmInput,
    fetchGuests,
    guests.length,
    isDemoMode,
    isGuestsReadOnly,
    logGuestAction,
    setDeleteAllBusy,
    setDeleteAllConfirmInput,
    setSelectedGuestIds,
    setShowDeleteAllModal,
    toast,
    weddingSiteId,
  ]);

  const selectFilteredGuests = useCallback(() => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }

    const ids = filteredGuests.map((guest) => guest.id);
    setSelectedGuestIds(new Set(ids));
    toast(
      ids.length > 0 ? `Selected ${ids.length} guest${ids.length === 1 ? '' : 's'} in current filter` : 'No guests in current filter',
      ids.length > 0 ? 'success' : 'error'
    );
  }, [filteredGuests, isGuestsReadOnly, setSelectedGuestIds, toast]);

  const clearGuestSelection = useCallback(() => {
    setSelectedGuestIds(new Set());
  }, [setSelectedGuestIds]);

  const keepOnlyVisibleSelection = useCallback(() => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }

    const visibleIds = new Set(filteredGuests.map((guest) => guest.id));
    setSelectedGuestIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id);
      });
      return next;
    });
    toast('Selection trimmed to current filter', 'success');
  }, [filteredGuests, isGuestsReadOnly, setSelectedGuestIds, toast]);

  const clearFilters = useCallback(() => {
    setFilterStatus('all');
    setExtraFilters([]);
    setSearchQuery('');
    setViewMode('list');
  }, [setExtraFilters, setFilterStatus, setSearchQuery, setViewMode]);

  const focusHighRiskFirst = useCallback(() => {
    setFilterStatus('all');
    setViewMode('list');
    setSearchQuery('');
    setSortByPriority(true);
  }, [setFilterStatus, setSearchQuery, setSortByPriority, setViewMode]);

  return {
    applyCampaignPreset,
    clearFilters,
    clearGuestSelection,
    focusHighRiskFirst,
    handleDeleteAllGuests,
    keepOnlyVisibleSelection,
    persistReminderSettingsForSite,
    selectFilteredGuests,
  };
}
