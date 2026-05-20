import { describe, expect, it, vi } from 'vitest';

import { buildGuestDashboardRouteActions } from './buildGuestDashboardRouteActions';

describe('guest dashboard header add action', () => {
  it('resets stale guest form state before opening the add modal', () => {
    const resetForm = vi.fn();
    const setShowAddModal = vi.fn();
    const actions = buildGuestDashboardRouteActions({
      resetForm,
      setShowAddModal,
    });

    actions.onHeaderAddGuest();

    expect(resetForm).toHaveBeenCalledBefore(setShowAddModal);
    expect(setShowAddModal).toHaveBeenCalledWith(true);
  });

  it('blocks route-level guest write actions for read-only collaborators', () => {
    const writeHandlers = {
      handleClearAllCheckIns: vi.fn(),
      handleDeleteGuest: vi.fn(),
      handleMarkAllDueThankYous: vi.fn(),
      handleSendBulkInvitations: vi.fn(),
      handleSendDueRemindersNow: vi.fn(),
      handleSendSelectedInvitations: vi.fn(),
    };
    const toast = vi.fn();
    const actions = buildGuestDashboardRouteActions({
      ...writeHandlers,
      confirmDeleteId: 'guest-1',
      isGuestsReadOnly: true,
      toast,
    });

    actions.onClearAllCheckIns();
    actions.onDeleteGuest('guest-1');
    actions.onMarkAllDueThankYous();
    actions.onSendDueReminders();
    actions.onSendFilteredInvitations();
    actions.onSendSelectedInvitations();

    expect(writeHandlers.handleClearAllCheckIns).not.toHaveBeenCalled();
    expect(writeHandlers.handleDeleteGuest).not.toHaveBeenCalled();
    expect(writeHandlers.handleMarkAllDueThankYous).not.toHaveBeenCalled();
    expect(writeHandlers.handleSendBulkInvitations).not.toHaveBeenCalled();
    expect(writeHandlers.handleSendDueRemindersNow).not.toHaveBeenCalled();
    expect(writeHandlers.handleSendSelectedInvitations).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Viewer mode is read-only.', 'info');
    expect(toast).toHaveBeenCalledTimes(6);
  });
});
