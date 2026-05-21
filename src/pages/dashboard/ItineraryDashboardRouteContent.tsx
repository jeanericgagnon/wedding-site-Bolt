import React from 'react';
import {
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  Clock,
  Edit2,
  ExternalLink,
  HelpCircle,
  MapPin,
  MoveRight,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardPageHero } from '../../components/dashboard/DashboardPageHero';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { EventGuestManagerModal } from './EventGuestManagerModal';
import { formatItineraryEventDate } from './itineraryEventDate';
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

type TimelineInsight = {
  detail: string;
  eventId: string;
  kind: string;
  title: string;
};

type Props = {
  autoCreateAlbum: boolean;
  conflictIds: Set<string>;
  editingEvent: ItineraryEvent | null;
  events: EventWithInvites[];
  formData: ItineraryFormData;
  formatTime: (timeString: string | null) => string;
  getMapUrl: (locationName: string, locationAddress: string) => string;
  handleCreateSmartTemplate: () => Promise<void>;
  handleDeleteEvent: (eventId: string) => void;
  handleSaveEvent: (event: React.FormEvent) => void;
  handleShiftTimeline: (delta: number) => Promise<void>;
  handleUndoTimelineShift: () => Promise<void>;
  isSavingEvent: boolean;
  lastTimelineSnapshot: EventWithInvites[] | null;
  loadEvents: () => Promise<void>;
  openEventForm: (event?: ItineraryEvent) => void;
  saveError: string | null;
  saveNotice: string | null;
  selectedEventId: string | null;
  setAutoCreateAlbum: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingEvent: React.Dispatch<React.SetStateAction<ItineraryEvent | null>>;
  setFormData: React.Dispatch<React.SetStateAction<ItineraryFormData>>;
  setSaveError: React.Dispatch<React.SetStateAction<string | null>>;
  setSaveNotice: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedEventId: React.Dispatch<React.SetStateAction<string | null>>;
  setShiftFromEventId: React.Dispatch<React.SetStateAction<string>>;
  setShiftMinutes: React.Dispatch<React.SetStateAction<number>>;
  setShowEventForm: React.Dispatch<React.SetStateAction<boolean>>;
  setTemplateDate: React.Dispatch<React.SetStateAction<string>>;
  setTemplateStart: React.Dispatch<React.SetStateAction<string>>;
  shiftFromEventId: string;
  shiftMinutes: number;
  shiftPreviewCount: number;
  shiftPreviewLabel: string;
  showEventForm: boolean;
  sortedShiftEvents: EventWithInvites[];
  templateDate: string;
  templateStart: string;
  timelineBusy: string | null;
  timelineInsights: TimelineInsight[];
};

export function ItineraryDashboardRouteContent({
  autoCreateAlbum,
  conflictIds,
  editingEvent,
  events,
  formData,
  formatTime,
  getMapUrl,
  handleCreateSmartTemplate,
  handleDeleteEvent,
  handleSaveEvent,
  handleShiftTimeline,
  handleUndoTimelineShift,
  isSavingEvent,
  lastTimelineSnapshot,
  loadEvents,
  openEventForm,
  saveError,
  saveNotice,
  selectedEventId,
  setAutoCreateAlbum,
  setEditingEvent,
  setFormData,
  setSaveError,
  setSaveNotice,
  setSelectedEventId,
  setShiftFromEventId,
  setShiftMinutes,
  setShowEventForm,
  setTemplateDate,
  setTemplateStart,
  shiftFromEventId,
  shiftMinutes,
  shiftPreviewCount,
  shiftPreviewLabel,
  showEventForm,
  sortedShiftEvents,
  templateDate,
  templateStart,
  timelineBusy,
  timelineInsights,
}: Props) {
  const navigate = useNavigate();
  const handleFormDataChange = <K extends keyof ItineraryFormData>(field: K, value: ItineraryFormData[K]) => {
    setSaveError(null);
    setSaveNotice(null);
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const clearTimelineFeedback = () => {
    setSaveError(null);
    setSaveNotice(null);
  };

  return (
    <div className="space-y-6">
      <DashboardPageHero
        eyebrow="Schedule"
        title="A weekend guests can follow easily."
        description="Keep ceremony timing, travel details, and day-of notes clear."
        stats={[
          { label: 'Wedding date', value: events[0]?.event_date ? formatItineraryEventDate(events[0].event_date) : 'Not set', detail: 'core weekend anchor' },
          { label: 'Weekend events', value: `${events.length} planned`, detail: `${events.filter((event) => event.is_visible !== false).length} visible to guests` },
          { label: 'Timing notes', value: timelineInsights.length > 0 ? 'Needs review' : 'Live', detail: timelineInsights.length > 0 ? `${timelineInsights.length} worth checking` : 'no timing issues found' },
        ]}
        actions={
          <Button onClick={() => openEventForm()}>
            <Plus className="w-5 h-5 mr-2" />
            Edit weekend schedule
          </Button>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_320px]">
        <article className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Your weekend</p>
          <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">A rhythm guests can follow.</h2>
          <div className="mt-5 space-y-3">
            {events.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-4 rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{event.event_name}</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {event.event_date ? formatItineraryEventDate(event.event_date) : 'Date to come'}
                    {event.start_time ? ` · ${formatTime(event.start_time)}` : ''}
                    {event.location_name ? ` · ${event.location_name}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => openEventForm(event)} className="text-sm font-semibold text-primary">
                  Edit event
                </button>
              </div>
            ))}
            {events.length === 0 && (
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-sm font-semibold text-text-primary">No events yet.</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Add the key moments first so guests always know what comes next.</p>
              </div>
            )}
          </div>
        </article>

        <aside className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Top priority</p>
          <div className="mt-4 space-y-3">
            {timelineInsights.length > 0 ? (
              timelineInsights.slice(0, 2).map((insight, index) => (
                <div key={`${insight.eventId}-${index}`} className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
                  <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{insight.detail}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/30 p-4">
                <p className="text-sm font-semibold text-text-primary">Nothing urgent is waiting.</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">Timing is in a calm place right now. The detailed editor and shift tools stay ready below.</p>
              </div>
            )}
          </div>
        </aside>
      </section>

      {showEventForm && (
        <Card className="rounded-[20px] bg-white p-6 shadow-none">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/75">Event workspace</p>
              <h2 className="mt-3 font-serif text-2xl font-normal text-text-primary">
                {editingEvent ? 'Edit the details guests will follow.' : 'Add the next event guests should see.'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                This is where timing, location, notes, and visibility stay aligned before anything shows up on the public schedule.
              </p>
            </div>
            <div className="inline-flex flex-wrap gap-2 text-xs text-text-tertiary">
              <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Timing first</span>
              <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Guest-facing notes</span>
              <span className="rounded-xl border border-border-subtle bg-surface-subtle/30 px-3 py-1">Visibility control</span>
            </div>
          </div>
          <form noValidate onSubmit={handleSaveEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Event name *</label>
                <Input
                  value={formData.event_name}
                  onChange={(e) => handleFormDataChange('event_name', e.target.value)}
                  placeholder="e.g., Welcome Dinner, Rehearsal Dinner"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Date</label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => handleFormDataChange('event_date', e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Start time</label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleFormDataChange('start_time', e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">End Time</label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleFormDataChange('end_time', e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Location name</label>
                <Input
                  value={formData.location_name}
                  onChange={(e) => handleFormDataChange('location_name', e.target.value)}
                  placeholder="Venue or place name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">Dress Code</label>
                <Input
                  value={formData.dress_code}
                  onChange={(e) => handleFormDataChange('dress_code', e.target.value)}
                  placeholder="e.g., Cocktail Attire"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Location Address</label>
              <Input
                value={formData.location_address}
                onChange={(e) => handleFormDataChange('location_address', e.target.value)}
                placeholder="Full address"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleFormDataChange('description', e.target.value)}
                placeholder="Event details and description"
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Notes for guests</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleFormDataChange('notes', e.target.value)}
                placeholder="Anything guests should know before they arrive"
                rows={2}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_visible"
                checked={formData.is_visible}
                onChange={(e) => handleFormDataChange('is_visible', e.target.checked)}
                className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary/20"
              />
              <label htmlFor="is_visible" className="ml-2 block text-sm text-text-secondary">
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
                className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary/20"
              />
                <label htmlFor="auto_create_album" className="ml-2 block text-sm text-text-secondary">
                  Create a photo album for this event
                </label>
              </div>
            )}

            {saveError && (
              <div className="rounded-[20px] border border-error/25 bg-error/5 px-3 py-2 text-sm text-text-primary">
                {saveError}
              </div>
            )}

            {saveNotice && (
              <div className="rounded-[20px] border border-border-subtle bg-surface-subtle px-3 py-2 text-sm text-text-primary">
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
                  setSaveNotice(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl font-normal text-text-primary">Smart wedding-day template</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Generate a working day-of timeline, then edit each item into the final producer schedule.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Input
                type="date"
                value={templateDate}
                onChange={(e) => {
                  clearTimelineFeedback();
                  setTemplateDate(e.target.value);
                }}
              />
              <Input
                type="time"
                value={templateStart}
                onChange={(e) => {
                  clearTimelineFeedback();
                  setTemplateStart(e.target.value);
                }}
              />
              <Button type="button" onClick={() => void handleCreateSmartTemplate()} disabled={timelineBusy !== null}>
                {timelineBusy === 'Building template…' ? 'Building…' : 'Build template'}
              </Button>
            </div>
          </div>
          <div className="rounded-[20px] border border-border-subtle bg-surface-subtle/40 p-4">
            <div className="flex items-center gap-2">
              <MoveRight className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Bulk time shift</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-text-secondary">When ceremony or photos move, shift the rest of the day without rebuilding cards.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_auto_auto]">
              <select
                className="min-h-[44px] rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={shiftFromEventId}
                onChange={(e) => {
                  clearTimelineFeedback();
                  setShiftFromEventId(e.target.value);
                }}
              >
                <option value="all">All events</option>
                {sortedShiftEvents.map((event) => (
                  <option key={event.id} value={event.id}>From {event.event_name}</option>
                ))}
              </select>
              <Input
                type="number"
                min="1"
                max="240"
                value={shiftMinutes}
                onChange={(e) => {
                  clearTimelineFeedback();
                  setShiftMinutes(Number(e.target.value) || 1);
                }}
              />
              <Button type="button" variant="outline" onClick={() => void handleShiftTimeline(-Math.abs(shiftMinutes))} disabled={timelineBusy !== null}>Earlier</Button>
              <Button type="button" variant="outline" onClick={() => void handleShiftTimeline(Math.abs(shiftMinutes))} disabled={timelineBusy !== null}>Later</Button>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-text-secondary">
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
        <Card className="rounded-[20px] border border-border-subtle bg-white p-5 shadow-none">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl font-normal text-text-primary">Timeline quick check</h2>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {timelineInsights.map((insight, index) => (
              <div key={`${insight.eventId}-${insight.kind}-${index}`} className="rounded-[20px] border border-border-subtle bg-surface-subtle/40 px-3 py-3">
                <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">{insight.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {events.length === 0 ? (
        <Card className="rounded-[20px] bg-white p-12 text-center shadow-none">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-text-tertiary" />
          <h3 className="mb-2 font-serif text-2xl font-normal text-text-primary">No itinerary events yet</h3>
          <p className="mb-6 text-text-secondary">
            Add your ceremony, reception, and anything else guests should plan around.
          </p>
          <Button onClick={() => openEventForm()}>
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Event
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const pending = event.pending_count;
            return (
              <Card key={event.id} className={`rounded-[20px] border border-border-subtle bg-white p-6 shadow-none transition-colors hover:border-primary/25 ${conflictIds.has(event.id) ? 'ring-1 ring-border-subtle' : ''}`}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="font-serif text-2xl font-normal text-text-primary">
                        {event.event_name}
                      </h3>
                      {!event.is_visible && (
                        <span className="rounded-xl border border-border-subtle bg-surface-subtle px-2 py-1 text-xs font-medium text-text-secondary">
                          Hidden
                        </span>
                      )}
                      {conflictIds.has(event.id) && (
                        <span className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-subtle px-2 py-1 text-xs font-medium text-text-primary">
                          <AlertTriangle className="w-3 h-3" />
                          Time overlap with another event
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-text-secondary">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatItineraryEventDate(event.event_date)}</span>
                      </div>

                      {event.start_time && (
                        <div className="flex items-center text-text-secondary">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>
                            {formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </span>
                        </div>
                      )}

                      {(event.location_name || event.location_address) && (
                        <div className="flex items-center gap-2 text-text-secondary">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1">
                            {event.location_name && <div>{event.location_name}</div>}
                            {event.location_address && (
                              <div className="text-sm text-text-tertiary">{event.location_address}</div>
                            )}
                          </div>
                          <a
                            href={getMapUrl(event.location_name || '', event.location_address || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 rounded-xl border border-border-subtle bg-surface-subtle px-3 py-1 text-sm font-semibold text-primary transition-colors hover:border-primary/30 hover:bg-primary/5"
                          >
                            <MapPin className="w-3 h-3" />
                            Map
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {event.description && (
                        <p className="mt-3 text-text-secondary">{event.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-stretch gap-2 pt-3 border-t border-border-subtle">
                      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-subtle/40 px-2.5 py-1.5 text-sm">
                        <Users className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{event.invitation_count}</span>
                        <span className="text-text-secondary">invited</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-subtle/30 px-2.5 py-1.5 text-sm">
                        <Check className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{event.attending_count}</span>
                        <span className="text-text-secondary">yes</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-subtle/30 px-2.5 py-1.5 text-sm">
                        <X className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{event.declined_count}</span>
                        <span className="text-text-secondary">no</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-subtle/30 px-2.5 py-1.5 text-sm">
                        <HelpCircle className="w-4 h-4 text-text-tertiary" />
                        <span className="font-semibold text-text-primary">{pending}</span>
                        <span className="text-text-secondary">pending</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:ml-4 lg:justify-end">
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
                        navigate({
                          pathname: '/dashboard/photos',
                          search: `?${params.toString()}`,
                        });
                      }}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Album
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEventForm(event)}
                      aria-label={`Edit ${event.event_name}`}
                      title={`Edit ${event.event_name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                      aria-label={`Delete ${event.event_name}`}
                      title={`Delete ${event.event_name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
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
  );
}
