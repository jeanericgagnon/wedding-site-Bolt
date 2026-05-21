import { expect, it, vi } from 'vitest';
import { buildGuestDashboardOverlayActions } from './buildGuestDashboardOverlayActions';

it('resets all itinerary drawer state when closing the drawer', () => {
  const setAssistedRsvpGuest = vi.fn();
  const setDrawerItineraryEvents = vi.fn();
  const setGuestEventIds = vi.fn();
  const setDeleteAllConfirmInput = vi.fn();
  const setEditingGuest = vi.fn();
  const setGuestAuditEntries = vi.fn();
  const setItineraryDrawerGuest = vi.fn();
  const setLastCheckIn = vi.fn();
  const setLoadingDrawer = vi.fn();
  const setRotatingInviteToken = vi.fn();
  const setTogglingEventId = vi.fn();
  const setShowAddModal = vi.fn();
  const setShowDeleteAllModal = vi.fn();

  const action = buildGuestDashboardOverlayActions({
    csvImporting: false,
    deleteAllBusy: false,
    editingGuest: null,
    handleAddGuest: vi.fn(),
    handleEditGuest: vi.fn(),
    resetCsvParserState: vi.fn(),
    resetCsvReviewState: vi.fn(),
    resetForm: vi.fn(),
    setAssistedRsvpGuest,
    setDrawerItineraryEvents,
    setGuestEventIds,
    setDeleteAllConfirmInput,
    setEditingGuest,
    setGuestAuditEntries,
    setItineraryDrawerGuest,
    setLastCheckIn,
    setLoadingDrawer,
    setRotatingInviteToken,
    setTogglingEventId,
    setShowAddModal,
    setShowDeleteAllModal,
  });

  action.onCloseItineraryDrawer();

  expect(setItineraryDrawerGuest).toHaveBeenCalledWith(null);
  expect(setDrawerItineraryEvents).toHaveBeenCalledWith([]);
  expect(setGuestEventIds).toHaveBeenCalledWith(expect.any(Set));
  expect(setGuestAuditEntries).toHaveBeenCalledWith([]);
  expect(setLoadingDrawer).toHaveBeenCalledWith(false);
  expect(setTogglingEventId).toHaveBeenCalledWith(null);
  expect(setRotatingInviteToken).toHaveBeenCalledWith(false);
  expect(setLastCheckIn).toHaveBeenCalledWith(null);

  expect(setAssistedRsvpGuest).not.toHaveBeenCalled();
  expect(setDeleteAllConfirmInput).not.toHaveBeenCalled();
  expect(setEditingGuest).not.toHaveBeenCalled();
  expect(setShowAddModal).not.toHaveBeenCalled();
  expect(setShowDeleteAllModal).not.toHaveBeenCalled();
});
