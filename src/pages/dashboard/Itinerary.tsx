import React, { useState } from 'react';
import { Plus, Calendar, Clock, MapPin, Users, Edit2, Trash2, UserPlus, ExternalLink, AlertTriangle, Check, X, HelpCircle, Camera, Wand2, MoveRight } from 'lucide-react';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog, type ConfirmDialogProps } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { formatItineraryEventDate } from './itineraryEventDate';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';
import { useItineraryTimelineActions } from './useItineraryTimelineActions';
import { type ItineraryDashboardEvent } from './itineraryService';
import { EventGuestManagerModal } from './EventGuestManagerModal';
import { ItineraryDashboardRouteView } from './ItineraryDashboardRouteView';
import { useItineraryDashboardData } from './useItineraryDashboardData';
import { buildItineraryDashboardDerivedState } from './buildItineraryDashboardDerivedState';

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

  const [formData, setFormData] = useState({
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
  });

  const { events, loadEvents, loading, setEvents } = useItineraryDashboardData({ isDemoMode, toast });

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
      setFormData({
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
      });
    }
    setSaveError(null);
    setSaveNotice(null);
    setShowEventForm(true);
  }

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
      <div className="space-y-6">
      <DashboardPageHero
        eyebrow="Schedule"
        title="Shape the rhythm of the wedding weekend."
        description="Add the moments guests need, keep private notes close, and adjust timing without losing the flow of the day."
        stats={[
          { label: 'Events', value: events.length, detail: `${events.filter((event) => event.is_visible !== false).length} visible to guests` },
          { label: 'Timing notes', value: timelineInsights.length, detail: timelineInsights.length > 0 ? 'worth checking' : 'no timing issues found' },
          { label: 'Shift preview', value: shiftPreviewCount, detail: 'events can move together' },
        ]}
        actions={
          <Button onClick={() => openEventForm()}>
            <Plus className="w-5 h-5 mr-2" />
            Add to schedule
          </Button>
        }
      />

      {showEventForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            {editingEvent ? 'Edit itinerary event' : 'Add itinerary event'}
          </h2>
          <form noValidate onSubmit={handleSaveEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Event name *
                </label>
                <Input
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                  placeholder="e.g., Welcome Dinner, Rehearsal Dinner"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Start time
                </label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  End Time
                </label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Location name
                </label>
                <Input
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="Venue or place name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Dress Code
                </label>
                <Input
                  value={formData.dress_code}
                  onChange={(e) => setFormData({ ...formData, dress_code: e.target.value })}
                  placeholder="e.g., Cocktail Attire"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Location Address
              </label>
              <Input
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Full address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Event details and description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Notes for guests
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Anything guests should know before they arrive"
                rows={2}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_visible"
                checked={formData.is_visible}
                onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
              />
              <label htmlFor="is_visible" className="ml-2 block text-sm text-neutral-700">
                Show this on your public site
              </label>
            </div>

            {!editingEvent && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_create_album"
                  checked={autoCreateAlbum}
                  onChange={(e) => setAutoCreateAlbum(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label htmlFor="auto_create_album" className="ml-2 block text-sm text-neutral-700">
                  Create a photo album for this event
                </label>
              </div>
            )}

            {saveError && (
              <div className="rounded-lg border border-error/25 bg-error/5 px-3 py-2 text-sm text-text-primary">
                {saveError}
              </div>
            )}

            {saveNotice && (
              <div className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-sm text-text-primary">
                {saveNotice}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSavingEvent}>
                {isSavingEvent ? 'Saving…' : (editingEvent ? 'Save changes' : 'Add event')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                  setSaveError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-5 border border-border bg-surface">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-neutral-900">Smart wedding-day template</h2>
            </div>
            <p className="mt-1 text-sm text-neutral-600">Generate a working day-of timeline, then edit each item into the final producer schedule.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Input type="date" value={templateDate} onChange={(e) => setTemplateDate(e.target.value)} />
              <Input type="time" value={templateStart} onChange={(e) => setTemplateStart(e.target.value)} />
              <Button type="button" onClick={() => void handleCreateSmartTemplate()} disabled={timelineBusy !== null}>
                {timelineBusy === 'Building template…' ? 'Building…' : 'Build template'}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
            <div className="flex items-center gap-2">
              <MoveRight className="h-5 w-5 text-neutral-800" />
              <h3 className="text-sm font-semibold text-neutral-900">Bulk time shift</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-neutral-600">When ceremony or photos move, shift the rest of the day without rebuilding cards.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_auto_auto]">
              <select className="rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm" value={shiftFromEventId} onChange={(e) => setShiftFromEventId(e.target.value)}>
                <option value="all">All events</option>
                {sortedShiftEvents.map((event) => (
                  <option key={event.id} value={event.id}>From {event.event_name}</option>
                ))}
              </select>
              <Input type="number" min="1" max="240" value={shiftMinutes} onChange={(e) => setShiftMinutes(Number(e.target.value) || 1)} />
              <Button type="button" variant="outline" onClick={() => void handleShiftTimeline(-Math.abs(shiftMinutes))} disabled={timelineBusy !== null}>Earlier</Button>
              <Button type="button" variant="outline" onClick={() => void handleShiftTimeline(Math.abs(shiftMinutes))} disabled={timelineBusy !== null}>Later</Button>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-neutral-600">
                Preview: move {shiftPreviewLabel} by {Math.abs(shiftMinutes || 1)} minute{Math.abs(shiftMinutes || 1) === 1 ? '' : 's'}.
              </p>
              {lastTimelineSnapshot && (
                <Button type="button" size="sm" variant="outline" onClick={() => void handleUndoTimelineShift()} disabled={timelineBusy !== null}>
                  Undo last shift
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {timelineInsights.length > 0 && (
        <Card className="p-5 border border-border bg-white">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-neutral-900">Timeline quick check</h2>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {timelineInsights.map((insight, index) => (
              <div key={`${insight.eventId}-${insight.kind}-${index}`} className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-3 py-3">
                <p className="text-sm font-semibold text-neutral-900">{insight.title}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{insight.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No itinerary events yet</h3>
          <p className="text-neutral-600 mb-6">
            Add your ceremony, reception, and anything else guests should plan around.
          </p>
          <Button onClick={() => openEventForm()}>
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Event
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {(() => {
            return events.map((event) => {
              const pending = event.pending_count;
              return (
              <Card key={event.id} className={`p-6 border border-border-subtle bg-white transition-colors hover:border-primary/25 ${conflictIds.has(event.id) ? 'ring-1 ring-border-subtle' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-xl font-semibold text-neutral-900">
                        {event.event_name}
                      </h3>
                      {!event.is_visible && (
                        <span className="px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 rounded">
                          Hidden
                        </span>
                      )}
                      {conflictIds.has(event.id) && (
                        <span className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-subtle px-2 py-1 text-xs font-medium text-text-primary">
                          <AlertTriangle className="w-3 h-3" />
                          Time overlap with another event
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-neutral-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatItineraryEventDate(event.event_date)}</span>
                      </div>

                      {event.start_time && (
                        <div className="flex items-center text-neutral-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>
                            {formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </span>
                        </div>
                      )}

                      {(event.location_name || event.location_address) && (
                        <div className="flex items-center gap-2 text-neutral-600">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1">
                            {event.location_name && <div>{event.location_name}</div>}
                            {event.location_address && (
                              <div className="text-sm text-neutral-500">{event.location_address}</div>
                            )}
                          </div>
                          <a
                            href={getMapUrl(event.location_name || '', event.location_address || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors"
                          >
                            <MapPin className="w-3 h-3" />
                            Map
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {event.description && (
                        <p className="text-neutral-600 mt-3">{event.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-stretch gap-2 pt-3 border-t border-border-subtle">
                      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle/40 px-2.5 py-1.5 text-sm">
                        <Users className="w-4 h-4 text-neutral-500" />
                        <span className="font-semibold text-neutral-900">{event.invitation_count}</span>
                        <span className="text-neutral-500">invited</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle/30 px-2.5 py-1.5 text-sm">
                        <Check className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{event.attending_count}</span>
                        <span className="text-text-secondary">yes</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle/30 px-2.5 py-1.5 text-sm">
                        <X className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{event.declined_count}</span>
                        <span className="text-text-secondary">no</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-subtle/30 px-2.5 py-1.5 text-sm">
                        <HelpCircle className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{pending}</span>
                        <span className="text-text-secondary">pending</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-2 sm:ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedEventId(event.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Manage Guests
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const params = new URLSearchParams({ eventId: event.id, eventName: event.event_name });
                        window.location.href = `/dashboard/photos?${params.toString()}`;
                      }}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Album
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEventForm(event)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
            });
          })()}
        </div>
      )}

      {selectedEventId && (
        <EventGuestManagerModal
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
          onUpdate={loadEvents}
        />
      )}
    </div>
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
