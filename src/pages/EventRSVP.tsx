import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, Check, X, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Header, Footer } from '../components/layout';

interface Guest {
  id: string;
  name: string;
  email: string;
}

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
}

interface EventInvitation {
  id: string;
  event_id: string;
  event: ItineraryEvent;
  rsvp?: {
    attending: boolean;
    dietary_restrictions: string | null;
    notes: string | null;
  };
}

export default function EventRSVP() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [guest, setGuest] = useState<Guest | null>(null);
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [rsvpForm, setRsvpForm] = useState({
    attending: true,
    dietary_restrictions: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      loadGuestAndEvents();
    } else {
      setError('No invitation link found. Please use the link from your invitation email.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadGuestAndEvents() {
    try {
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select('id, name, email')
        .eq('invite_token', token)
        .maybeSingle();

      if (guestError) throw guestError;
      if (!guestData) {
        setError("This invitation link isn't valid. Please use the link from your invitation email, or ask the couple for a new one.");
        setLoading(false);
        return;
      }

      setGuest(guestData);

      const { data: invitationsData, error: invitationsError } = await supabase
        .from('event_invitations')
        .select(`
          id,
          event_id,
          itinerary_events (
            id,
            event_name,
            description,
            event_date,
            start_time,
            end_time,
            location_name,
            location_address,
            dress_code,
            notes
          )
        `)
        .eq('guest_id', guestData.id);

      if (invitationsError) throw invitationsError;

      const invitationsWithRsvps = await Promise.all(
        (invitationsData || []).map(async (invitation) => {
          const { data: rsvpData } = await supabase
            .from('event_rsvps')
            .select('attending, dietary_restrictions, notes')
            .eq('event_invitation_id', invitation.id)
            .maybeSingle();

          return {
            id: invitation.id,
            event_id: invitation.event_id,
            event: invitation.itinerary_events as unknown as ItineraryEvent,
            rsvp: rsvpData || undefined,
          };
        })
      );

      setInvitations(invitationsWithRsvps);
    } catch {
      setError('Failed to load your event invitations. Please try again or contact the couple.');
    } finally {
      setLoading(false);
    }
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

  function openRsvpForm(invitation: EventInvitation) {
    setSelectedEvent(invitation.id);
    setSubmitError('');
    setSubmitSuccess(false);
    if (invitation.rsvp) {
      setRsvpForm({
        attending: invitation.rsvp.attending,
        dietary_restrictions: invitation.rsvp.dietary_restrictions || '',
        notes: invitation.rsvp.notes || '',
      });
    } else {
      setRsvpForm({
        attending: true,
        dietary_restrictions: '',
        notes: '',
      });
    }
  }

  async function handleSubmitRsvp(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent || submitting) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const invitation = invitations.find((i) => i.id === selectedEvent);
      if (!invitation) return;

      if (invitation.rsvp) {
        const { error } = await supabase
          .from('event_rsvps')
          .update({
            attending: rsvpForm.attending,
            dietary_restrictions: rsvpForm.dietary_restrictions || null,
            notes: rsvpForm.notes || null,
            responded_at: new Date().toISOString(),
          })
          .eq('event_invitation_id', selectedEvent);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_rsvps')
          .insert([
            {
              event_invitation_id: selectedEvent,
              attending: rsvpForm.attending,
              dietary_restrictions: rsvpForm.dietary_restrictions || null,
              notes: rsvpForm.notes || null,
            },
          ]);

        if (error) throw error;
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSelectedEvent(null);
        setSubmitSuccess(false);
        loadGuestAndEvents();
      }, 2000);
    } catch {
      setSubmitError('Failed to save your RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">Link Not Recognized</h1>
          <p className="text-neutral-600 max-w-md mx-auto">{error}</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 mb-3">
            Hello, {guest?.name}!
          </h1>
          <p className="text-lg text-neutral-600">
            {invitations.length === 1
              ? "You're invited to the event below. Please let us know if you can make it."
              : `You're invited to ${invitations.length} events. Please RSVP for each one.`}
          </p>
        </div>

        {invitations.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600">
              No additional events found for your invitation.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h2 className="text-2xl font-semibold text-neutral-900">
                        {invitation.event.event_name}
                      </h2>
                      {invitation.rsvp && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                            invitation.rsvp.attending
                              ? 'bg-green-100 text-green-700'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {invitation.rsvp.attending
                            ? <><Check className="w-3.5 h-3.5" /> Attending</>
                            : <><X className="w-3.5 h-3.5" /> Not attending</>
                          }
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-neutral-600">
                        <Calendar className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>{formatDate(invitation.event.event_date)}</span>
                      </div>

                      {invitation.event.start_time && (
                        <div className="flex items-center text-neutral-600">
                          <Clock className="w-5 h-5 mr-2 flex-shrink-0" />
                          <span>
                            {formatTime(invitation.event.start_time)}
                            {invitation.event.end_time &&
                              ` – ${formatTime(invitation.event.end_time)}`}
                          </span>
                        </div>
                      )}

                      {invitation.event.location_name && (
                        <div className="flex items-center gap-3 text-neutral-600">
                          <MapPin className="w-5 h-5 flex-shrink-0" />
                          <div className="flex-1">
                            <div>{invitation.event.location_name}</div>
                            {invitation.event.location_address && (
                              <div className="text-sm text-neutral-500">
                                {invitation.event.location_address}
                              </div>
                            )}
                          </div>
                          <a
                            href={getMapUrl(invitation.event.location_name || '', invitation.event.location_address || '')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <MapPin className="w-4 h-4" />
                            View Map
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {invitation.event.description && (
                  <p className="text-neutral-600 mb-4">{invitation.event.description}</p>
                )}

                {invitation.event.dress_code && (
                  <div className="mb-4 text-sm">
                    <span className="font-medium text-neutral-700">Dress Code:</span>{' '}
                    <span className="text-neutral-600">{invitation.event.dress_code}</span>
                  </div>
                )}

                {invitation.event.notes && (
                  <div className="mb-4 p-3 bg-neutral-50 rounded-lg text-sm text-neutral-600">
                    {invitation.event.notes}
                  </div>
                )}

                <Button
                  onClick={() => openRsvpForm(invitation)}
                  className="w-full mt-2"
                  variant={invitation.rsvp ? 'outline' : 'primary'}
                >
                  {invitation.rsvp ? 'Update my RSVP' : 'RSVP for this event'}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            {submitSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-9 h-9 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                  {rsvpForm.attending ? "You're in!" : "Response saved"}
                </h3>
                <p className="text-neutral-500 text-sm">
                  {rsvpForm.attending
                    ? `Looking forward to seeing you at ${invitations.find(i => i.id === selectedEvent)?.event.event_name}!`
                    : "Thank you for letting us know."}
                </p>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-neutral-200">
                  <h3 className="text-xl font-semibold text-neutral-900">
                    {invitations.find((i) => i.id === selectedEvent)?.event.event_name}
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    {(() => {
                      const inv = invitations.find(i => i.id === selectedEvent);
                      return inv ? formatDate(inv.event.event_date) : '';
                    })()}
                  </p>
                </div>

                <form onSubmit={handleSubmitRsvp} className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-3">
                      Will you attend?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRsvpForm({ ...rsvpForm, attending: true })}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                          rsvpForm.attending
                            ? 'bg-green-600 text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        Yes, I'll be there
                      </button>
                      <button
                        type="button"
                        onClick={() => setRsvpForm({ ...rsvpForm, attending: false })}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                          !rsvpForm.attending
                            ? 'bg-neutral-700 text-white shadow-sm'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        <X className="w-4 h-4" />
                        Can't make it
                      </button>
                    </div>
                  </div>

                  {rsvpForm.attending && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Dietary restrictions <span className="text-neutral-400 font-normal">(optional)</span>
                        </label>
                        <Input
                          value={rsvpForm.dietary_restrictions}
                          onChange={(e) =>
                            setRsvpForm({ ...rsvpForm, dietary_restrictions: e.target.value })
                          }
                          placeholder="e.g., Vegetarian, Gluten-free, Nut allergy"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Additional notes <span className="text-neutral-400 font-normal">(optional)</span>
                        </label>
                        <Textarea
                          value={rsvpForm.notes}
                          onChange={(e) => setRsvpForm({ ...rsvpForm, notes: e.target.value })}
                          placeholder="Any special requests or messages for the couple"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {submitError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {submitError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!submitting) setSelectedEvent(null);
                      }}
                      className="flex-1"
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1"
                    >
                      {submitting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                        : invitations.find(i => i.id === selectedEvent)?.rsvp
                          ? 'Update RSVP'
                          : 'Submit RSVP'
                      }
                    </Button>
                  </div>
                </form>
              </>
            )}
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}
