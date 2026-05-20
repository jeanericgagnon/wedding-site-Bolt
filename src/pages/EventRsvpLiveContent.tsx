import { Calendar, Check, Clock, ExternalLink, MapPin, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header, Footer } from '../components/layout';
import { formatEventRsvpDate } from './eventRsvpDate';

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

interface EventRsvpLiveContentProps {
  guestName: string | null | undefined;
  invitations: EventInvitation[];
  onOpenRsvpForm: (invitation: EventInvitation) => void;
  formatTime: (timeString: string | null) => string;
  getMapUrl: (locationName: string, locationAddress: string) => string;
}

export function EventRsvpLiveContent({
  guestName,
  invitations,
  onOpenRsvpForm,
  formatTime,
  getMapUrl,
}: EventRsvpLiveContentProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 mb-3">
            Hello, {guestName}!
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
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-sm font-medium ${
                            invitation.rsvp.attending
                              ? 'bg-surface-secondary text-text-primary border border-border-subtle'
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
                        <span>{formatEventRsvpDate(invitation.event.event_date)}</span>
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
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl transition-colors whitespace-nowrap"
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
                  <div className="mb-4 p-3 bg-neutral-50 rounded-xl text-sm text-neutral-600">
                    {invitation.event.notes}
                  </div>
                )}

                <Button
                  onClick={() => onOpenRsvpForm(invitation)}
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
      <Footer />
    </div>
  );
}
