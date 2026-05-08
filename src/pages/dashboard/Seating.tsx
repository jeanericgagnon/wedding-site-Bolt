import React from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Users } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { unassignGuest } from './seating/seatingService';
import { UNASSIGNED_DROPPABLE } from './seating/seatingDashboardUtils';
import { buildSeatingDashboardDerivedState } from './seating/buildSeatingDashboardDerivedState';
import { SeatingDashboardRouteContent } from './seating/SeatingDashboardRouteContent';
import { useSeatingDashboardActions } from './seating/useSeatingDashboardActions';
import { useSeatingDashboardArtifacts } from './seating/useSeatingDashboardArtifacts';
import { useSeatingDashboardData } from './seating/useSeatingDashboardData';
import { useSeatingDashboardInteractionState } from './seating/useSeatingDashboardInteractionState';

export const DashboardSeating: React.FC = () => {
  const { isDemoMode } = useAuth();
  const { toast } = useToast();
  const {
    allGuests,
    assignments,
    counters,
    invalidCount,
    itineraryEvents,
    loading,
    loadingSeating,
    loadSeatingData,
    seatingEvent,
    selectedEventId,
    setAssignments,
    setSelectedEventId,
    setTables,
    setVersions,
    siteId,
    tables,
    versions,
  } = useSeatingDashboardData({ isDemoMode, toast });

  const {
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
  } = useSeatingDashboardInteractionState({
    allGuests,
    assignments,
  });

  const {
    arrivedCount,
    arrivedGuestIds,
    assignedGuestIdSet,
    cateringHandoffReview,
    cateringPacket,
    checkInCandidates,
    mealHeadcountByTable,
    packetReadyTone,
    selectedItineraryEvent,
    unassignedGuests,
  } = buildSeatingDashboardDerivedState({
    allGuests,
    assignments,
    checkInFilter,
    checkInQuery,
    counters,
    itineraryEvents,
    selectedEventId,
    tables,
  });

  const {
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
  } = useSeatingDashboardActions({
    allGuests,
    assignments,
    autoCapacity,
    counters,
    isDemoMode,
    loadSeatingData,
    seatingEvent,
    selectedEventId,
    setAddingTable,
    setAssignments,
    setMovingTableId,
    setSeatPicker,
    setSeatingBusyAction,
    setShowAutoTablesModal,
    setShowResetConfirm,
    setTables,
    siteId,
    tableDragRef,
    tables,
    toast,
  });

  const {
    handleExportCSV,
    handleExportCateringCSV,
    handleExportImage,
    handleExportPDF,
    handleExportPlaceCards,
    handleExportTableSummaryCSV,
    handlePrint,
    handleRestoreVersion,
    handleSaveVersion,
  } = useSeatingDashboardArtifacts({
    allGuests,
    arrivedCount,
    assignments,
    cateringPacket,
    counters,
    isDemoMode,
    itineraryEvents,
    requestConfirmation,
    selectedEventId,
    seatingEvent,
    setAssignments,
    setTables,
    setVersions,
    siteId,
    tables,
    toast,
    versions,
  });

  function handleDragStart(event: DragStartEvent) {
    const guest = allGuests.find((item) => item.id === event.active.id);
    if (guest) setActiveGuest(guest);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveGuest(null);
    const { active, over } = event;
    if (!over || !seatingEvent) return;

    const guestId = active.id as string;
    const dropId = over.id as string;

    if (dropId === UNASSIGNED_DROPPABLE) {
      try {
        if (!isDemoMode) {
          await unassignGuest(seatingEvent.id, guestId);
        }
        setAssignments((prev) => prev.filter((assignment) => assignment.guest_id !== guestId));
      } catch {
        toast('Couldn’t unassign that guest. Please try again.', 'error');
      }
      return;
    }

    let targetTableId: string | null = null;
    let targetSeatIndex: number | undefined;

    if (dropId.startsWith('seat:')) {
      const [, tableId, seatRaw] = dropId.split(':');
      targetTableId = tableId;
      targetSeatIndex = Number(seatRaw);
    } else {
      targetTableId = dropId;
    }

    if (targetTableId) {
      await assignGuestToSeatDirect(guestId, targetTableId, targetSeatIndex);
    }
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="seating">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (itineraryEvents.length === 0) {
    return (
      <DashboardLayout currentPage="seating">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-text-primary mb-2">No Events Yet</h2>
            <p className="text-text-secondary mb-4">Create itinerary events first to start managing seating.</p>
            <Button onClick={() => { window.location.href = '/dashboard/itinerary'; }}>
              Go to Itinerary
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="seating">
      <SeatingDashboardRouteContent
        activeGuest={activeGuest}
        activeSeatGuest={activeSeatGuest}
        addingTable={addingTable}
        allGuests={allGuests}
        assignments={assignments}
        arrivedCount={arrivedCount}
        arrivedGuestIds={arrivedGuestIds}
        assignedGuestIdSet={assignedGuestIdSet}
        autoCapacity={autoCapacity}
        assignGuestToSeatDirect={assignGuestToSeatDirect}
        canvasFullscreen={canvasFullscreen}
        canvasZoom={canvasZoom}
        cateringHandoffReview={cateringHandoffReview}
        cateringPacket={cateringPacket}
        checkInCandidates={checkInCandidates}
        checkInFilter={checkInFilter}
        checkInMode={checkInMode}
        checkInQuery={checkInQuery}
        clearSeatAssignment={clearSeatAssignment}
        closeSeatPicker={closeSeatPicker}
        counters={counters}
        editingTable={editingTable}
        getDefaultTablePosition={getDefaultTablePosition}
        handleAddTable={handleAddTable}
        handleAutoCreateTables={handleAutoCreateTables}
        handleAutoSeat={handleAutoSeat}
        handleBulkCheckIn={handleBulkCheckIn}
        handleCanvasWheelZoom={handleCanvasWheelZoom}
        handleCheckDrift={handleCheckDrift}
        handleDeleteTable={handleDeleteTable}
        handleDragEnd={handleDragEnd}
        handleDragStart={handleDragStart}
        handleExportCSV={handleExportCSV}
        handleExportCateringCSV={handleExportCateringCSV}
        handleExportImage={handleExportImage}
        handleExportPDF={handleExportPDF}
        handleExportTableSummaryCSV={handleExportTableSummaryCSV}
        handleRemoveGuest={handleRemoveGuest}
        handleReset={handleReset}
        handleResizeTable={handleResizeTable}
        handleRestoreVersion={handleRestoreVersion}
        handleRotateTable={handleRotateTable}
        handleSaveVersion={handleSaveVersion}
        handleToggleCheckIn={handleToggleCheckIn}
        handleUpdateTable={handleUpdateTable}
        invalidCount={invalidCount}
        itineraryEvents={itineraryEvents}
        layoutMode={layoutMode}
        loadingSeating={loadingSeating}
        mealHeadcountByTable={mealHeadcountByTable}
        movingTableId={movingTableId}
        openSeatPicker={openSeatPicker}
        packetReadyTone={packetReadyTone}
        seatPicker={seatPicker}
        seatPickerOptions={seatPickerOptions}
        seatPickerQuery={seatPickerQuery}
        seatingBusyAction={seatingBusyAction}
        seatingEvent={seatingEvent}
        selectedEventId={selectedEventId}
        selectedItineraryEvent={selectedItineraryEvent}
        selectedTableId={selectedTableId}
        sensors={sensors}
        setAddingTable={setAddingTable}
        setAutoCapacity={setAutoCapacity}
        setCanvasFullscreen={setCanvasFullscreen}
        setCanvasZoom={setCanvasZoom}
        setCheckInFilter={setCheckInFilter}
        setCheckInMode={setCheckInMode}
        setCheckInQuery={setCheckInQuery}
        setEditingTable={setEditingTable}
        setLayoutMode={setLayoutMode}
        setSelectedEventId={setSelectedEventId}
        setSelectedTableId={setSelectedTableId}
        setSeatPickerQuery={setSeatPickerQuery}
        setShowAutoTablesModal={setShowAutoTablesModal}
        setShowResetConfirm={setShowResetConfirm}
        showAutoTablesModal={showAutoTablesModal}
        showResetConfirm={showResetConfirm}
        startMoveTable={startMoveTable}
        tables={tables}
        unassignedGuests={unassignedGuests}
        versions={versions}
      />
      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          tone={confirmDialog.tone}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </DashboardLayout>
  );
};
