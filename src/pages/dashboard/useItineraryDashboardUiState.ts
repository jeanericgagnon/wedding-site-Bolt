import { useCallback, useEffect, useState } from 'react';
import { type ItineraryDashboardEvent } from './itineraryService';

type EventWithInvites = ItineraryDashboardEvent;
type ItineraryEvent = Omit<ItineraryDashboardEvent, 'invitation_count' | 'rsvp_count' | 'attending_count' | 'declined_count' | 'pending_count'>;

type ItineraryFormData = {
  description: string;
  dress_code: string;
  end_time: string;
  event_date: string;
  event_name: string;
  is_visible: boolean;
  location_address: string;
  location_name: string;
  notes: string;
  start_time: string;
};

function createEmptyItineraryFormData(): ItineraryFormData {
  return {
    event_name: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location_name: '',
    location_address: '',
    dress_code: '',
    notes: '',
    is_visible: true,
  };
}

type Args = {
  hasActiveSite: boolean;
  isDemoMode: boolean;
};

export function useItineraryDashboardUiState({ hasActiveSite, isDemoMode }: Args) {
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [autoCreateAlbum, setAutoCreateAlbum] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [templateDate, setTemplateDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [templateStart, setTemplateStart] = useState('11:00');
  const [shiftMinutes, setShiftMinutes] = useState(15);
  const [shiftFromEventId, setShiftFromEventId] = useState<string>('all');
  const [timelineBusy, setTimelineBusy] = useState<string | null>(null);
  const [lastTimelineSnapshot, setLastTimelineSnapshot] = useState<EventWithInvites[] | null>(null);
  const [formData, setFormData] = useState<ItineraryFormData>(createEmptyItineraryFormData);

  const resetItineraryDashboardUiState = useCallback(() => {
    setShowEventForm(false);
    setEditingEvent(null);
    setAutoCreateAlbum(true);
    setSelectedEventId(null);
    setSaveError(null);
    setSaveNotice(null);
    setIsSavingEvent(false);
    setTemplateDate(new Date().toISOString().slice(0, 10));
    setTemplateStart('11:00');
    setShiftMinutes(15);
    setShiftFromEventId('all');
    setTimelineBusy(null);
    setLastTimelineSnapshot(null);
    setFormData(createEmptyItineraryFormData());
  }, []);

  useEffect(() => {
    if (!hasActiveSite && !isDemoMode) {
      resetItineraryDashboardUiState();
    }
  }, [hasActiveSite, isDemoMode, resetItineraryDashboardUiState]);

  function openEventForm(event?: ItineraryEvent) {
    if (event) {
      setEditingEvent(event);
      setAutoCreateAlbum(false);
      setFormData({
        event_name: event.event_name,
        description: event.description || '',
        event_date: event.event_date,
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        location_name: event.location_name || '',
        location_address: event.location_address || '',
        dress_code: event.dress_code || '',
        notes: event.notes || '',
        is_visible: event.is_visible,
      });
    } else {
      setEditingEvent(null);
      setAutoCreateAlbum(true);
      setFormData(createEmptyItineraryFormData());
    }
    setSaveError(null);
    setSaveNotice(null);
    setShowEventForm(true);
  }

  return {
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
  };
}
