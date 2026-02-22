import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, MapPin, Users, Edit2, Trash2, UserPlus, ExternalLink, AlertTriangle, Check, X, HelpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { demoEvents } from '../../lib/demoData';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';

interface ItineraryEvent {
  id: string;
  event_name: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  location_name: string;
  location_address: string;
  dress_code: string | null;
  notes: string | null;
  display_order: number;
  is_visible: boolean;
}

interface EventWithInvites extends ItineraryEvent {
  invitation_count: number;
  rsvp_count: number;
  attending_count: number;
  declined_count: number;
}

export const DashboardItinerary: React.FC = () => {
  const { isDemoMode } = useAuth();
  const [events, setEvents] = useState<EventWithInvites[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ItineraryEvent | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

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

  useEffect(() => {
    loadEvents();
  }, [isDemoMode]);

  async function loadEvents() {
    try {
      if (isDemoMode) {
        const seeded = demoEvents.map((event, idx) => ({
          id: event.id,
          event_name: event.event_name,
          description: event.description,
          event_date: event.event_date,
          start_time: event.start_time,
          end_time: null,
          location_name: event.location_name,
          location_address: '',
          dress_code: idx % 2 === 0 ? 'Cocktail Attire' : null,
          notes: idx === 0 ? 'Shuttle departs from hotel lobby at 5:30 PM.' : null,
          display_order: event.display_order,
          is_visible: true,
          invitation_count: [86, 120, 120, 52][idx] ?? 0,
          rsvp_count: [72, 107, 109, 44][idx] ?? 0,
          attending_count: [68, 98, 101, 39][idx] ?? 0,
          declined_count: [4, 9, 8, 5][idx] ?? 0,
        }));
        setEvents(seeded as EventWithInvites[]);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sites } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!sites) return;

      const { data: eventsData, error } = await supabase
        .from('itinerary_events')
        .select('*')
        .eq('wedding_site_id', sites.id)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const eventsWithCounts = await Promise.all(
        (eventsData || []).map(async (event) => {
          const { count: inviteCount } = await supabase
            .from('event_invitations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);

          const { data: rsvps } = await supabase
            .from('event_rsvps')
            .select('attending, event_invitations!inner(event_id)')
            .eq('event_invitations.event_id', event.id);

          const rsvpCount = rsvps?.length || 0;
          const attendingCount = rsvps?.filter((r) => r.attending).length || 0;
          const declinedCount = rsvps?.filter((r) => !r.attending).length || 0;

          return {
            ...event,
            invitation_count: inviteCount || 0,
            rsvp_count: rsvpCount,
            attending_count: attendingCount,
            declined_count: declinedCount,
          };
        })
      );

      setEvents(eventsWithCounts);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function openEventForm(event?: ItineraryEvent) {
    if (event) {
      setEditingEvent(event);
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
    setShowEventForm(true);
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (isDemoMode) {
        if (editingEvent) {
          setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...formData, end_time: formData.end_time || null, dress_code: formData.dress_code || null, notes: formData.notes || null } : e));
        } else {
          setEvents(prev => ([...prev, {
            id: `demo-event-${Date.now()}`,
            ...formData,
            end_time: formData.end_time || null,
            dress_code: formData.dress_code || null,
            notes: formData.notes || null,
            display_order: prev.length + 1,
            invitation_count: 60,
            rsvp_count: 0,
            attending_count: 0,
            declined_count: 0,
          }] as EventWithInvites[]));
        }
        setShowEventForm(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: site } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!site) return;

      if (editingEvent) {
        const { error } = await supabase
          .from('itinerary_events')
          .update(formData)
          .eq('id', editingEvent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('itinerary_events')
          .insert([
            {
              ...formData,
              wedding_site_id: site.id,
            },
          ]);

        if (error) throw error;
      }

      setShowEventForm(false);
      loadEvents();
    } catch {
      alert('Failed to save event. Please try again.');
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      if (isDemoMode) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        return;
      }
      const { error } = await supabase
        .from('itinerary_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      loadEvents();
    } catch {
      alert('Failed to delete event. Please try again.');
    }
  }

  function timeToMinutes(timeString: string | null): number | null {
    if (!timeString) return null;
    const [h, m] = timeString.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  function findConflicts(eventList: EventWithInvites[]): Set<string> {
    const conflictIds = new Set<string>();
    for (let i = 0; i < eventList.length; i++) {
      for (let j = i + 1; j < eventList.length; j++) {
        const a = eventList[i];
        const b = eventList[j];
        if (a.event_date !== b.event_date) continue;
        const aStart = timeToMinutes(a.start_time);
        const aEnd = timeToMinutes(a.end_time) ?? (aStart !== null ? aStart + 60 : null);
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time) ?? (bStart !== null ? bStart + 60 : null);
        if (aStart === null || bStart === null) continue;
        const aE = aEnd ?? aStart + 60;
        const bE = bEnd ?? bStart + 60;
        if (aStart < bE && aE > bStart) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
        }
      }
    }
    return conflictIds;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(timeString: string | null) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function getMapUrl(locationName: string, locationAddress: string) {
    const query = encodeURIComponent(`${locationName} ${locationAddress}`.trim());
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="itinerary">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="itinerary">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Event Itinerary</h1>
          <p className="mt-2 text-neutral-600">
            Create and manage wedding weekend events with separate guest lists and RSVPs
          </p>
        </div>
        <Button onClick={() => openEventForm()}>
          <Plus className="w-5 h-5 mr-2" />
          Add Event
        </Button>
      </div>

      {showEventForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">
            {editingEvent ? 'Edit Event' : 'Create New Event'}
          </h2>
          <form onSubmit={handleSaveEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Event Name *
                </label>
                <Input
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                  placeholder="e.g., Welcome Dinner, Rehearsal Dinner"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Date *
                </label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Start Time
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
                  Location Name
                </label>
                <Input
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="Venue name"
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
                Additional Notes
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special instructions for guests"
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
                Show on public wedding website
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit">
                {editingEvent ? 'Save Changes' : 'Create Event'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No events yet</h3>
          <p className="text-neutral-600 mb-6">
            Create your first event to start building your wedding weekend itinerary
          </p>
          <Button onClick={() => openEventForm()}>
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Event
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {(() => {
            const conflictIds = findConflicts(events);
            return events.map((event) => {
              const pending = event.invitation_count - event.rsvp_count;
              return (
              <Card key={event.id} className={`p-6 hover:shadow-lg transition-shadow ${conflictIds.has(event.id) ? 'ring-2 ring-amber-300' : ''}`}>
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
                        <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          Time overlap with another event
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-neutral-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(event.event_date)}</span>
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

                      {event.location_name && (
                        <div className="flex items-center gap-2 text-neutral-600">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1">
                            <div>{event.location_name}</div>
                            {event.location_address && (
                              <div className="text-sm text-neutral-500">{event.location_address}</div>
                            )}
                          </div>
                          {(event.location_name || event.location_address) && (
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
                          )}
                        </div>
                      )}

                      {event.description && (
                        <p className="text-neutral-600 mt-3">{event.description}</p>
                      )}
                    </div>

                    <div className="flex items-stretch gap-3 pt-3 border-t border-neutral-200">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 text-sm">
                        <Users className="w-4 h-4 text-neutral-500" />
                        <span className="font-semibold text-neutral-900">{event.invitation_count}</span>
                        <span className="text-neutral-500">invited</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-700">{event.attending_count}</span>
                        <span className="text-emerald-600">yes</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm">
                        <X className="w-4 h-4 text-red-500" />
                        <span className="font-semibold text-red-600">{event.declined_count}</span>
                        <span className="text-red-500">no</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                        <HelpCircle className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-amber-600">{pending}</span>
                        <span className="text-amber-500">pending</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
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
        <EventGuestManager
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
          onUpdate={loadEvents}
        />
      )}
    </div>
    </DashboardLayout>
  );
};

interface EventGuestManagerProps {
  eventId: string;
  onClose: () => void;
  onUpdate: () => void;
}

function EventGuestManager({ eventId, onClose, onUpdate }: EventGuestManagerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allGuests, setAllGuests] = useState<any[]>([]);
  const [invitedGuestIds, setInvitedGuestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadGuests() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: site } = await supabase
        .from('wedding_sites')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!site) return;

      const { data: guests } = await supabase
        .from('guests')
        .select('*')
        .eq('wedding_site_id', site.id)
        .order('name');

      const { data: invitations } = await supabase
        .from('event_invitations')
        .select('guest_id')
        .eq('event_id', eventId);

      setAllGuests(guests || []);
      setInvitedGuestIds(new Set(invitations?.map((i) => i.guest_id) || []));
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function toggleGuestInvitation(guestId: string) {
    try {
      if (invitedGuestIds.has(guestId)) {
        const { error } = await supabase
          .from('event_invitations')
          .delete()
          .eq('event_id', eventId)
          .eq('guest_id', guestId);

        if (error) throw error;

        setInvitedGuestIds((prev) => {
          const next = new Set(prev);
          next.delete(guestId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('event_invitations')
          .insert([{ event_id: eventId, guest_id: guestId }]);

        if (error) throw error;

        setInvitedGuestIds((prev) => new Set(prev).add(guestId));
      }

      onUpdate();
    } catch {
      alert('Failed to update invitation. Please try again.');
    }
  }

  async function inviteAll() {
    setBulkLoading(true);
    try {
      const uninvited = allGuests.filter(g => !invitedGuestIds.has(g.id));
      if (uninvited.length === 0) return;

      const { error } = await supabase
        .from('event_invitations')
        .insert(uninvited.map(g => ({ event_id: eventId, guest_id: g.id })));

      if (error) throw error;

      setInvitedGuestIds(new Set(allGuests.map(g => g.id)));
      onUpdate();
    } catch {
      alert('Failed to invite all guests. Please try again.');
    } finally {
      setBulkLoading(false);
    }
  }

  async function removeAll() {
    if (!confirm('Remove all guests from this event?')) return;
    setBulkLoading(true);
    try {
      const { error } = await supabase
        .from('event_invitations')
        .delete()
        .eq('event_id', eventId);

      if (error) throw error;

      setInvitedGuestIds(new Set());
      onUpdate();
    } catch {
      alert('Failed to remove all guests. Please try again.');
    } finally {
      setBulkLoading(false);
    }
  }

  const filteredGuests = allGuests.filter(g => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (g.name || `${g.first_name || ''} ${g.last_name || ''}`).toLowerCase();
    return name.includes(q) || (g.email || '').toLowerCase().includes(q);
  });

  const invitedCount = invitedGuestIds.size;
  const totalCount = allGuests.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-neutral-900">Manage Event Guests</h2>
            <span className="text-sm text-neutral-500">{invitedCount} of {totalCount} invited</span>
          </div>
          <p className="text-sm text-neutral-600">
            Select which guests to invite to this event
          </p>
          <div className="flex items-center gap-2 mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search guests..."
              className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={inviteAll}
              disabled={bulkLoading || invitedCount === totalCount}
              className="px-3 py-2 text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Invite All
            </button>
            <button
              onClick={removeAll}
              disabled={bulkLoading || invitedCount === 0}
              className="px-3 py-2 text-sm font-medium bg-neutral-50 text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Remove All
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : allGuests.length === 0 ? (
            <p className="text-center text-neutral-600 py-8">
              No guests found. Add guests first in the Guests page.
            </p>
          ) : filteredGuests.length === 0 ? (
            <p className="text-center text-neutral-500 py-8 text-sm">No guests match your search.</p>
          ) : (
            <div className="space-y-2">
              {filteredGuests.map((guest) => {
                const isInvited = invitedGuestIds.has(guest.id);
                return (
                  <div
                    key={guest.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                      isInvited
                        ? 'bg-primary-50 border-primary-200'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                    onClick={() => toggleGuestInvitation(guest.id)}
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{guest.name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim()}</p>
                      {guest.email && <p className="text-sm text-neutral-500">{guest.email}</p>}
                    </div>
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isInvited
                          ? 'bg-primary-600 text-white'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {isInvited ? (
                        <><Check className="w-3.5 h-3.5" /> Invited</>
                      ) : (
                        <>Invite</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-neutral-200">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </Card>
    </div>
  );
}
