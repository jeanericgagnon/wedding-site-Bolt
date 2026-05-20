import React, { useState } from 'react';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog, type ConfirmDialogProps } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { useItineraryTimelineActions } from './useItineraryTimelineActions';
import { type ItineraryDashboardEvent } from './itineraryService';
import { ItineraryDashboardRouteView } from './ItineraryDashboardRouteView';
import { useItineraryDashboardData } from './useItineraryDashboardData';
import { buildItineraryDashboardDerivedState } from './buildItineraryDashboardDerivedState';
import { useItineraryDashboardUiState } from './useItineraryDashboardUiState';
import { ItineraryDashboardRouteContent } from './ItineraryDashboardRouteContent';

type EventWithInvites = ItineraryDashboardEvent;
type ItineraryEvent = Omit<ItineraryDashboardEvent, 'invitation_count' | 'rsvp_count' | 'attending_count' | 'declined_count' | 'pending_count'>;

export const DashboardItinerary: React.FC = () => {
  const { isDemoMode } = useAuth();
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const requestConfirmation = (options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) =>
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
    });
  const { events, hasActiveSite, loadEvents, loading, setEvents } = useItineraryDashboardData({ isDemoMode, toast });
  const {
    autoCreateAlbum,
    editingEvent,
    formData,
    isSavingEvent,
    lastTimelineSnapshot,
    openEventForm,
    saveError,
    saveNotice,
    selectedEventId,
    setAutoCreateAlbum,
    setEditingEvent,
    setFormData,
    setIsSavingEvent,
    setLastTimelineSnapshot,
    setSaveError,
    setSaveNotice,
    setSelectedEventId,
    setShiftFromEventId,
    setShiftMinutes,
    setShowEventForm,
    setTemplateDate,
    setTemplateStart,
    setTimelineBusy,
    shiftFromEventId,
    shiftMinutes,
    showEventForm,
    templateDate,
    templateStart,
    timelineBusy,
  } = useItineraryDashboardUiState({ hasActiveSite, isDemoMode });

  const {
    handleCreateSmartTemplate,
    handleDeleteEvent,
    handleSaveEvent,
    handleShiftTimeline,
    handleUndoTimelineShift,
  } = useItineraryTimelineActions({
    autoCreateAlbum,
    editingEvent,
    events,
    formData,
    isDemoMode,
    lastTimelineSnapshot,
    loadEvents,
    requestConfirmation,
    setEvents,
    setIsSavingEvent,
    setLastTimelineSnapshot,
    setSaveError,
    setSaveNotice,
    setShowEventForm,
    setTimelineBusy,
    shiftFromEventId,
    shiftMinutes,
    templateDate,
    templateStart,
    toast,
  });

  const {
    conflictIds,
    formatTime,
    getMapUrl,
    shiftPreviewCount,
    shiftPreviewLabel,
    sortedShiftEvents,
    timelineInsights,
  } = buildItineraryDashboardDerivedState({
    events,
    shiftFromEventId,
  });

  return (
    <ItineraryDashboardRouteView loading={loading}>
      <ItineraryDashboardRouteContent
        autoCreateAlbum={autoCreateAlbum}
        conflictIds={conflictIds}
        editingEvent={editingEvent}
        events={events}
        formData={formData}
        formatTime={formatTime}
        getMapUrl={getMapUrl}
        handleCreateSmartTemplate={handleCreateSmartTemplate}
        handleDeleteEvent={handleDeleteEvent}
        handleSaveEvent={handleSaveEvent}
        handleShiftTimeline={handleShiftTimeline}
        handleUndoTimelineShift={handleUndoTimelineShift}
        isSavingEvent={isSavingEvent}
        lastTimelineSnapshot={lastTimelineSnapshot}
        loadEvents={loadEvents}
        openEventForm={openEventForm}
        saveError={saveError}
        saveNotice={saveNotice}
        selectedEventId={selectedEventId}
        setAutoCreateAlbum={setAutoCreateAlbum}
        setEditingEvent={setEditingEvent}
        setFormData={setFormData}
        setSaveError={setSaveError}
        setSaveNotice={setSaveNotice}
        setSelectedEventId={setSelectedEventId}
        setShiftFromEventId={setShiftFromEventId}
        setShiftMinutes={setShiftMinutes}
        setShowEventForm={setShowEventForm}
        setTemplateDate={setTemplateDate}
        setTemplateStart={setTemplateStart}
        shiftFromEventId={shiftFromEventId}
        shiftMinutes={shiftMinutes}
        shiftPreviewCount={shiftPreviewCount}
        shiftPreviewLabel={shiftPreviewLabel}
        showEventForm={showEventForm}
        sortedShiftEvents={sortedShiftEvents}
        templateDate={templateDate}
        templateStart={templateStart}
        timelineBusy={timelineBusy}
        timelineInsights={timelineInsights}
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
    </ItineraryDashboardRouteView>
  );
};
