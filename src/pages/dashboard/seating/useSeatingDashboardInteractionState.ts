import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type React from 'react';
import type { ConfirmDialogProps } from '../../../components/ui/ConfirmDialog';
import type { EligibleGuest, SeatingAssignment, SeatingTable } from './seatingService';
import { getSeatPickerOptions, type SeatingCheckInFilter } from './seatingDashboardUtils';

type BusyAction = 'auto-create' | 'auto-seat' | 'reset' | null;

export function useSeatingDashboardInteractionState(args: {
  allGuests: EligibleGuest[];
  assignments: SeatingAssignment[];
  isDemoMode: boolean;
  siteId: string | null;
}) {
  const previousSiteIdRef = useRef<string | null>(null);
  const [addingTable, setAddingTable] = useState(false);
  const [editingTable, setEditingTable] = useState<SeatingTable | null>(null);
  const [activeGuest, setActiveGuest] = useState<EligibleGuest | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAutoTablesModal, setShowAutoTablesModal] = useState(false);
  const [autoCapacity, setAutoCapacity] = useState(8);
  const [seatingBusyAction, setSeatingBusyAction] = useState<BusyAction>(null);
  const [checkInMode, setCheckInMode] = useState(false);
  const [checkInQuery, setCheckInQuery] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<SeatingCheckInFilter>('not_arrived');
  const [layoutMode, setLayoutMode] = useState<'visual' | 'list'>('visual');
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [seatPicker, setSeatPicker] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [seatPickerQuery, setSeatPickerQuery] = useState('');
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const tableDragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const resetSeatingDashboardInteractionState = useCallback(() => {
    setAddingTable(false);
    setEditingTable(null);
    setActiveGuest(null);
    setShowResetConfirm(false);
    setShowAutoTablesModal(false);
    setAutoCapacity(8);
    setSeatingBusyAction(null);
    setCheckInMode(false);
    setCheckInQuery('');
    setCheckInFilter('not_arrived');
    setLayoutMode('visual');
    setMovingTableId(null);
    setSelectedTableId(null);
    setSeatPicker(null);
    setSeatPickerQuery('');
    setCanvasZoom(1);
    setCanvasFullscreen(false);
    setConfirmDialog(null);
    tableDragRef.current = null;
  }, []);

  const activeSeatAssignment = seatPicker
    ? args.assignments.find((assignment) => assignment.table_id === seatPicker.tableId && assignment.seat_index === seatPicker.seatIndex) ?? null
    : null;
  const activeSeatGuest = activeSeatAssignment
    ? args.allGuests.find((guest) => guest.id === activeSeatAssignment.guest_id) ?? null
    : null;
  const seatPickerOptions = seatPicker
    ? getSeatPickerOptions({
        guests: args.allGuests,
        assignments: args.assignments,
        tableId: seatPicker.tableId,
        seatIndex: seatPicker.seatIndex,
        query: seatPickerQuery,
      })
    : [];

  const requestConfirmation = useCallback((options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) =>
    new Promise<boolean>((resolve) => {
      setConfirmDialog({
        ...options,
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
      });
    }), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleCanvasWheelZoom = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (layoutMode !== 'visual') return;
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const delta = event.deltaY;
    const step = delta > 0 ? -0.05 : 0.05;
    setCanvasZoom((zoom) => Math.max(0.6, Math.min(1.8, Number((zoom + step).toFixed(2)))));
  }, [layoutMode]);

  const closeSeatPicker = useCallback(() => {
    setSeatPicker(null);
    setSeatPickerQuery('');
  }, []);

  const openSeatPicker = useCallback((tableId: string, seatIndex: number) => {
    setSeatPicker({ tableId, seatIndex });
    setSeatPickerQuery('');
  }, []);

  useEffect(() => {
    if (previousSiteIdRef.current && args.siteId && previousSiteIdRef.current !== args.siteId) {
      resetSeatingDashboardInteractionState();
    }
    previousSiteIdRef.current = args.siteId;
  }, [args.siteId, resetSeatingDashboardInteractionState]);

  useEffect(() => {
    if (!args.siteId && !args.isDemoMode) {
      resetSeatingDashboardInteractionState();
    }
  }, [args.isDemoMode, args.siteId, resetSeatingDashboardInteractionState]);

  return {
    activeGuest,
    activeSeatGuest,
    addingTable,
    autoCapacity,
    canvasFullscreen,
    canvasZoom,
    checkInFilter,
    checkInMode,
    checkInQuery,
    closeSeatPicker,
    confirmDialog,
    editingTable,
    handleCanvasWheelZoom,
    layoutMode,
    movingTableId,
    openSeatPicker,
    requestConfirmation,
    resetSeatingDashboardInteractionState,
    seatPicker,
    seatPickerOptions,
    seatPickerQuery,
    seatingBusyAction,
    selectedTableId,
    sensors,
    setActiveGuest,
    setAddingTable,
    setAutoCapacity,
    setCanvasFullscreen,
    setCanvasZoom,
    setCheckInFilter,
    setCheckInMode,
    setCheckInQuery,
    setConfirmDialog,
    setEditingTable,
    setLayoutMode,
    setMovingTableId,
    setSeatPicker,
    setSeatPickerQuery,
    setSeatingBusyAction,
    setSelectedTableId,
    setShowAutoTablesModal,
    setShowResetConfirm,
    showAutoTablesModal,
    showResetConfirm,
    tableDragRef,
  };
}
