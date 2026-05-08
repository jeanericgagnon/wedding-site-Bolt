import type React from 'react';
import { useCallback } from 'react';
import type { EligibleGuest, SeatingAssignment, SeatingTable } from './seatingService';
import {
  assignGuestToTable,
  autoCreateTables,
  autoSeatGuests,
  createTable,
  deleteTable,
  invalidateDriftedAssignments,
  refreshSeatingSession,
  resetSeating,
  setGuestCheckedIn,
  unassignGuest,
  updateTable,
} from './seatingService';
import { buildDemoAutoSeatAssignments, buildDemoAutoTables, type TableShape } from './seatingDashboardUtils';

export function useSeatingDashboardActions(args: {
  allGuests: EligibleGuest[];
  assignments: SeatingAssignment[];
  autoCapacity: number;
  counters: { attending: number } | null;
  isDemoMode: boolean;
  loadSeatingData: () => Promise<void>;
  seatingEvent: { id: string } | null;
  selectedEventId: string | null;
  setAddingTable: React.Dispatch<React.SetStateAction<boolean>>;
  setAssignments: React.Dispatch<React.SetStateAction<SeatingAssignment[]>>;
  setMovingTableId: React.Dispatch<React.SetStateAction<string | null>>;
  setSeatPicker: React.Dispatch<React.SetStateAction<{ tableId: string; seatIndex: number } | null>>;
  setSeatingBusyAction: React.Dispatch<React.SetStateAction<'auto-create' | 'auto-seat' | 'reset' | null>>;
  setShowAutoTablesModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowResetConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  setTables: React.Dispatch<React.SetStateAction<SeatingTable[]>>;
  siteId: string | null;
  tableDragRef: React.MutableRefObject<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>;
  tables: SeatingTable[];
  toast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) {
  const clearSeatAssignment = useCallback(async (tableId: string, seatIndex: number) => {
    const assignment = args.assignments.find((item) => item.table_id === tableId && item.seat_index === seatIndex);
    if (!assignment) return;
    try {
      if (!args.isDemoMode && args.seatingEvent) {
        await unassignGuest(args.seatingEvent.id, assignment.guest_id);
      }
      args.setAssignments((prev) => prev.filter((item) => item.id !== assignment.id));
      args.setSeatPicker(null);
    } catch {
      args.toast('Couldn’t clear that seat. Please try again.', 'error');
    }
  }, [args]);

  const assignGuestToSeatDirect = useCallback(async (guestId: string, targetTableId: string, targetSeatIndex?: number) => {
    if (!args.seatingEvent) return;
    const targetTable = args.tables.find((table) => table.id === targetTableId);
    if (!targetTable) return;

    const shape = targetTable.table_shape ?? 'round';
    if (shape === 'bar' || shape === 'dj_booth' || shape === 'dance_floor') {
      args.toast('This floor item can’t take seating assignments.', 'warning');
      return;
    }

    const existingForGuest = args.assignments.find((assignment) => assignment.guest_id === guestId);
    const targetAssignments = args.assignments.filter((assignment) => assignment.table_id === targetTable.id && assignment.guest_id !== guestId);
    const currentOccupants = targetAssignments.length;
    let occupiedAssignment: SeatingAssignment | null = null;
    const sourceSeatValue: number | null = existingForGuest?.seat_index ?? null;
    const sourceSeatIndex = sourceSeatValue ?? undefined;

    if (targetSeatIndex != null) {
      occupiedAssignment = args.assignments.find((assignment) => assignment.table_id === targetTable.id && assignment.seat_index === targetSeatIndex && assignment.guest_id !== guestId) ?? null;
    }

    if (currentOccupants >= targetTable.capacity && !(targetSeatIndex != null && occupiedAssignment)) {
      args.toast(`${targetTable.table_name} is full`, 'error');
      return;
    }

    if (targetSeatIndex == null) {
      const usedSeats = new Set(
        targetAssignments.map((assignment) => assignment.seat_index).filter((value): value is number => typeof value === 'number' && value > 0),
      );
      for (let index = 1; index <= targetTable.capacity; index += 1) {
        if (!usedSeats.has(index)) {
          targetSeatIndex = index;
          break;
        }
      }
    }

    try {
      const assignment = args.isDemoMode
        ? {
            id: `demo-assignment-${guestId}`,
            seating_event_id: args.seatingEvent.id,
            table_id: targetTable.id,
            guest_id: guestId,
            seat_index: targetSeatIndex ?? sourceSeatValue,
            is_valid: true,
            checked_in_at: null,
          }
        : await assignGuestToTable(args.seatingEvent.id, targetTable.id, guestId, targetSeatIndex);

      if (!args.isDemoMode && occupiedAssignment) {
        await assignGuestToTable(args.seatingEvent.id, occupiedAssignment.table_id, occupiedAssignment.guest_id, sourceSeatIndex);
      }

      args.setAssignments((prev) => {
        let next = prev.filter((item) => item.guest_id !== guestId);
        if (occupiedAssignment) {
          next = next.map((item) => (item.guest_id === occupiedAssignment.guest_id ? { ...item, seat_index: sourceSeatValue } : item));
        }
        return [...next, assignment];
      });
      args.setSeatPicker(null);
    } catch {
      args.toast('Couldn’t assign that guest. Please try again.', 'error');
    }
  }, [args]);

  const handleRemoveGuest = useCallback(async (guestId: string) => {
    if (!args.seatingEvent) return;
    try {
      if (!args.isDemoMode) {
        await unassignGuest(args.seatingEvent.id, guestId);
      }
      args.setAssignments((prev) => prev.filter((assignment) => assignment.guest_id !== guestId));
    } catch {
      args.toast('Couldn’t unassign that guest. Please try again.', 'error');
    }
  }, [args]);

  async function handleAddTable(tableData: Partial<SeatingTable>) {
    if (!args.seatingEvent) {
      args.toast('Seating is still loading. Please try again in a moment.', 'warning');
      return;
    }
    try {
      const sortOrder = args.tables.length;
      const created = args.isDemoMode
        ? {
            id: `demo-table-${Date.now()}`,
            seating_event_id: args.seatingEvent.id,
            table_name: tableData.table_name || (((tableData.table_shape as TableShape) === 'round' || (tableData.table_shape as TableShape) === 'rectangle') ? `Table ${sortOrder + 1}` : ''),
            capacity: tableData.capacity || 8,
            sort_order: sortOrder,
            notes: tableData.notes || '',
            table_shape: (tableData.table_shape as TableShape) || 'round',
            layout_width: Number(tableData.layout_width) || 260,
            layout_height: Number(tableData.layout_height) || 150,
            layout_x: 24 + (sortOrder % 3) * 360,
            layout_y: 24 + Math.floor(sortOrder / 3) * 330,
            rotation_deg: Number(tableData.rotation_deg) || 0,
          }
        : await createTable({ ...tableData, seating_event_id: args.seatingEvent.id, sort_order: sortOrder });
      args.setTables((prev) => [...prev, created]);
      args.setAddingTable(false);
      args.toast('Table added', 'success');
    } catch {
      args.toast('Couldn’t add that table. Please try again.', 'error');
    }
  }

  async function handleUpdateTable(id: string, tableData: Partial<SeatingTable>) {
    try {
      if (!args.isDemoMode) {
        await updateTable(id, tableData);
      }
      args.setTables((prev) => prev.map((table) => (table.id === id ? { ...table, ...tableData } : table)));
    } catch {
      args.toast('Couldn’t update that table. Please try again.', 'error');
    }
  }

  async function handleResizeTable(id: string, width: number, height: number) {
    const patch = { layout_width: width, layout_height: height };
    try {
      if (!args.isDemoMode) {
        await updateTable(id, patch);
      }
      args.setTables((prev) => prev.map((table) => (table.id === id ? { ...table, ...patch } : table)));
    } catch {
      args.toast('Couldn’t resize that table. Please try again.', 'error');
    }
  }

  async function handleRotateTable(id: string, deltaDeg: number) {
    let next = 0;
    args.setTables((prev) => prev.map((table) => {
      if (table.id !== id) return table;
      const current = table.rotation_deg ?? 0;
      next = current + deltaDeg;
      return { ...table, rotation_deg: next };
    }));

    try {
      if (!args.isDemoMode) {
        await updateTable(id, { rotation_deg: next });
      }
    } catch {
      args.toast('Couldn’t rotate this layout item. Please try again.', 'error');
    }
  }

  function getDefaultTablePosition(index: number) {
    return {
      x: 24 + (index % 3) * 360,
      y: 24 + Math.floor(index / 3) * 330,
    };
  }

  function startMoveTable(table: SeatingTable, index: number, event: React.MouseEvent, layoutMode: 'visual' | 'list') {
    if (layoutMode !== 'visual') return;
    event.preventDefault();
    event.stopPropagation();

    const fallback = getDefaultTablePosition(index);
    const originX = table.layout_x ?? fallback.x;
    const originY = table.layout_y ?? fallback.y;
    args.tableDragRef.current = { id: table.id, startX: event.clientX, startY: event.clientY, originX, originY };
    args.setMovingTableId(table.id);

    const onMove = (moveEvent: MouseEvent) => {
      const ctx = args.tableDragRef.current;
      if (!ctx) return;
      const x = Math.max(8, Math.round(ctx.originX + (moveEvent.clientX - ctx.startX)));
      const y = Math.max(8, Math.round(ctx.originY + (moveEvent.clientY - ctx.startY)));
      args.setTables((prev) => prev.map((item) => (item.id === ctx.id ? { ...item, layout_x: x, layout_y: y } : item)));
    };

    const onUp = async () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const ctx = args.tableDragRef.current;
      args.tableDragRef.current = null;
      args.setMovingTableId(null);
      if (!ctx || args.isDemoMode) return;
      const moved = args.tables.find((item) => item.id === ctx.id);
      try {
        await updateTable(ctx.id, {
          layout_x: moved?.layout_x ?? ctx.originX,
          layout_y: moved?.layout_y ?? ctx.originY,
        });
      } catch {
        args.toast('Couldn’t save that table position. Please try again.', 'error');
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  async function handleDeleteTable(id: string) {
    try {
      if (!args.isDemoMode) {
        await deleteTable(id);
      }
      args.setTables((prev) => prev.filter((table) => table.id !== id));
      args.setAssignments((prev) => prev.filter((assignment) => assignment.table_id !== id));
      args.toast('Table deleted', 'success');
    } catch {
      args.toast('Couldn’t remove that table. Please try again.', 'error');
    }
  }

  async function handleReset() {
    if (!args.seatingEvent) return;
    args.setSeatingBusyAction('reset');
    try {
      if (!args.isDemoMode) {
        await resetSeating(args.seatingEvent.id);
      }
      args.setAssignments([]);
      args.setShowResetConfirm(false);
      args.toast('Seating reset', 'success');
    } catch {
      args.toast('Couldn’t reset seating right now. Please try again.', 'error');
    } finally {
      args.setSeatingBusyAction(null);
    }
  }

  async function handleAutoCreateTables() {
    if (!args.seatingEvent || !args.counters) return;
    args.setSeatingBusyAction('auto-create');
    try {
      const created = args.isDemoMode
        ? buildDemoAutoTables({
            seatingEventId: args.seatingEvent.id,
            attendingCount: args.counters.attending,
            capacity: args.autoCapacity,
            existingTableCount: args.tables.length,
          })
        : await autoCreateTables(args.seatingEvent.id, args.counters.attending, args.autoCapacity);
      args.setTables((prev) => [...prev, ...created]);
      args.setShowAutoTablesModal(false);
      args.toast(`Created ${created.length} tables`, 'success');
    } catch {
      args.toast('Couldn’t auto-create tables right now. Please try again.', 'error');
    } finally {
      args.setSeatingBusyAction(null);
    }
  }

  async function handleAutoSeat() {
    if (!args.seatingEvent) return;
    if (args.tables.length === 0) {
      args.toast('Add tables first before auto-seating', 'error');
      return;
    }
    args.setSeatingBusyAction('auto-seat');
    try {
      const newAssignments = args.isDemoMode
        ? buildDemoAutoSeatAssignments({
            seatingEventId: args.seatingEvent.id,
            guests: args.allGuests,
            tables: args.tables,
            existingAssignments: args.assignments,
          })
        : await autoSeatGuests(args.seatingEvent.id, args.tables, args.allGuests);
      args.setAssignments((prev) => {
        const existingMap = new Map(prev.map((assignment) => [assignment.guest_id, assignment]));
        newAssignments.forEach((assignment) => existingMap.set(assignment.guest_id, assignment));
        return Array.from(existingMap.values());
      });
      if (newAssignments.length === 0) {
        args.toast('No unassigned attending guests were available to auto-seat.', 'info');
      } else {
        args.toast(`Seated ${newAssignments.length} guest${newAssignments.length !== 1 ? 's' : ''}`, 'success');
      }
    } catch {
      args.toast('Couldn’t auto-seat guests right now. Please try again.', 'error');
    } finally {
      args.setSeatingBusyAction(null);
    }
  }

  async function handleCheckDrift() {
    if (!args.seatingEvent || !args.selectedEventId || !args.siteId) return;
    if (args.isDemoMode) {
      args.toast('All assignments are valid', 'success');
      return;
    }
    try {
      const count = await invalidateDriftedAssignments(args.seatingEvent.id, args.selectedEventId, args.siteId);
      if (count > 0) {
        await args.loadSeatingData();
        args.toast(`${count} assignment(s) flagged as invalid due to RSVP changes`, 'warning');
      } else {
        args.toast('All assignments are valid', 'success');
      }
    } catch {
      args.toast('Couldn’t run the seating check right now. Please try again.', 'error');
    }
  }

  async function handleToggleCheckIn(guestId: string, checkedIn: boolean) {
    if (!args.seatingEvent) return;
    try {
      if (args.isDemoMode) {
        args.setAssignments((prev) => prev.map((assignment) => (
          assignment.guest_id === guestId ? { ...assignment, checked_in_at: checkedIn ? new Date().toISOString() : null } : assignment
        )));
      } else {
        await setGuestCheckedIn(args.seatingEvent.id, guestId, checkedIn);
        await args.loadSeatingData();
      }
      args.toast(checkedIn ? 'Guest marked arrived' : 'Arrival removed', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const authish = message.includes('invalid jwt') || message.includes('jwt') || message.includes('401') || message.includes('auth');
      if (!args.isDemoMode && authish) {
        try {
          await refreshSeatingSession();
          await setGuestCheckedIn(args.seatingEvent.id, guestId, checkedIn);
          await args.loadSeatingData();
          args.toast(checkedIn ? 'Guest marked arrived' : 'Arrival removed', 'success');
          return;
        } catch {
          // fall through
        }
      }
      args.toast('Couldn’t update check-in right now. Please try again.', 'error');
    }
  }

  async function handleBulkCheckIn(guestIds: string[], checkedIn: boolean) {
    if (!args.seatingEvent || guestIds.length === 0) return;
    try {
      if (args.isDemoMode) {
        const stamp = checkedIn ? new Date().toISOString() : null;
        const guestIdSet = new Set(guestIds);
        args.setAssignments((prev) => prev.map((assignment) => (
          guestIdSet.has(assignment.guest_id) ? { ...assignment, checked_in_at: stamp } : assignment
        )));
      } else {
        await Promise.all(guestIds.map((guestId) => setGuestCheckedIn(args.seatingEvent!.id, guestId, checkedIn)));
        await args.loadSeatingData();
      }
      args.toast(
        checkedIn
          ? `Marked ${guestIds.length} guest${guestIds.length !== 1 ? 's' : ''} arrived`
          : `Cleared arrival for ${guestIds.length} guest${guestIds.length !== 1 ? 's' : ''}`,
        'success',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const authish = message.includes('invalid jwt') || message.includes('jwt') || message.includes('401') || message.includes('auth');
      if (!args.isDemoMode && authish) {
        try {
          await refreshSeatingSession();
          await Promise.all(guestIds.map((guestId) => setGuestCheckedIn(args.seatingEvent!.id, guestId, checkedIn)));
          await args.loadSeatingData();
          args.toast(
            checkedIn
              ? `Marked ${guestIds.length} guest${guestIds.length !== 1 ? 's' : ''} arrived`
              : `Cleared arrival for ${guestIds.length} guest${guestIds.length !== 1 ? 's' : ''}`,
            'success',
          );
          return;
        } catch {
          // fall through
        }
      }
      args.toast('Couldn’t update those arrivals right now. Please try again.', 'error');
    }
  }

  return {
    assignGuestToSeatDirect,
    clearSeatAssignment,
    getDefaultTablePosition,
    handleAddTable,
    handleAutoCreateTables,
    handleAutoSeat,
    handleBulkCheckIn,
    handleCheckDrift,
    handleDeleteTable,
    handleRemoveGuest,
    handleReset,
    handleResizeTable,
    handleRotateTable,
    handleToggleCheckIn,
    handleUpdateTable,
    startMoveTable,
  };
}
