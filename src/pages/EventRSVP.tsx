import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Header, Footer } from '../components/layout';
import { formatEventRsvpDate } from './eventRsvpDate';
import { isFreshRsvpContinuityStorageValue, writeRsvpContinuityStoragePing } from './rsvpContinuityStorage';
import { isInternalCustomerErrorMessage } from '../lib/customerSafeError';
import { callValidateRsvpToken, hasRsvpFunctionRuntime } from './rsvpFunctionService';
import { trackGuestHubEvent } from './guestHubPublicService';
import { EventRsvpRouteView } from './EventRsvpRouteView';
import { EventRsvpLiveContent } from './EventRsvpLiveContent';

const CAN_USE_EVENT_RSVP_FUNCTION = hasRsvpFunctionRuntime();

interface Guest {
  id: string;
  name: string;
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

interface EventRsvpFormState {
  attending: boolean;
  dietary_restrictions: string;
  notes: string;
}

interface EventLookupResponse {
  guest?: Guest | null;
  invitations?: unknown[];
  eventRsvpSupport?: boolean;
  rsvpSession?: string | null;
  siteSlug?: string | null;
}

function buildDefaultEventRsvpFormState(): EventRsvpFormState {
  return {
    attending: true,
    dietary_restrictions: '',
    notes: '',
  };
}

const RSVP_CONTINUITY_EVENT = 'dayof:rsvp-updated';
const RSVP_CONTINUITY_STORAGE_KEY = 'dayof.rsvp.updatedAt';

const INVALID_EVENT_INVITATION_MESSAGE =
  "This invitation link isn't valid. Please use the link from your invitation email, or ask the couple for a new one.";

const EVENT_RSVP_INTERNAL_SENTINEL_ERROR_COPY = /\b(configuration|missing-config|relation\s+"?event_rsvps"?)\b/i;

export function safeEventRsvpGuestError(value: string | null | undefined, fallback = INVALID_EVENT_INVITATION_MESSAGE): string {
  const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned || EVENT_RSVP_INTERNAL_SENTINEL_ERROR_COPY.test(cleaned) || isInternalCustomerErrorMessage(cleaned)) return fallback;
  return cleaned;
}

function notifyRsvpContinuityUpdate() {
  const updatedAt = writeRsvpContinuityStoragePing(RSVP_CONTINUITY_STORAGE_KEY);

  window.dispatchEvent(new CustomEvent(RSVP_CONTINUITY_EVENT, { detail: { updatedAt } }));
}

function resetEventRsvpModalTransientState(
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>,
  setSubmitError: React.Dispatch<React.SetStateAction<string>>,
  setSubmitSuccess: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string>>,
) {
  setSubmitting(false);
  setSubmitError('');
  setSubmitSuccess(false);
  setError('');
}

function invalidateEventRsvpAsyncState(
  activeLoadRequestRef: React.MutableRefObject<number>,
  activeSubmitRequestRef: React.MutableRefObject<number>,
  submitInFlightRef: React.MutableRefObject<boolean>,
) {
  activeLoadRequestRef.current += 1;
  activeSubmitRequestRef.current += 1;
  submitInFlightRef.current = false;
}

function invalidateEventRsvpSubmitState(
  activeSubmitRequestRef: React.MutableRefObject<number>,
  submitInFlightRef: React.MutableRefObject<boolean>,
) {
  activeSubmitRequestRef.current += 1;
  submitInFlightRef.current = false;
}

export default function EventRSVP() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [guest, setGuest] = useState<Guest | null>(null);
  const [rsvpSessionToken, setRsvpSessionToken] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [rsvpForm, setRsvpForm] = useState<EventRsvpFormState>(() => buildDefaultEventRsvpFormState());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [hasEventRsvpSupport, setHasEventRsvpSupport] = useState<boolean | null>(null);
  const postSubmitResetTimeoutRef = useRef<number | null>(null);
  const activeLoadRequestRef = useRef(0);
  const activeSubmitRequestRef = useRef(0);
  const submitInFlightRef = useRef(false);
  const pendingContinuityRefreshRef = useRef(false);
  const ignoreNextLocalContinuityEventRef = useRef(false);
  const tokenLinkedSessionRef = useRef(false);
  const loadInFlightRef = useRef(false);
  const trackedInviteAnalyticsKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (token) {
      trackedInviteAnalyticsKeyRef.current = null;
      loadGuestAndEvents();
    } else {
      activeLoadRequestRef.current += 1;
      activeSubmitRequestRef.current += 1;
      submitInFlightRef.current = false;
      pendingContinuityRefreshRef.current = false;
      ignoreNextLocalContinuityEventRef.current = false;
      tokenLinkedSessionRef.current = false;
      loadInFlightRef.current = false;
      if (postSubmitResetTimeoutRef.current !== null) {
        window.clearTimeout(postSubmitResetTimeoutRef.current);
        postSubmitResetTimeoutRef.current = null;
      }
      setGuest(null);
      setRsvpSessionToken(null);
      setInvitations([]);
      setSelectedEvent(null);
      setRsvpForm({ attending: true, dietary_restrictions: '', notes: '' });
      setSubmitting(false);
      setSubmitError('');
      setSubmitSuccess(false);
      setHasEventRsvpSupport(null);
      setError('No invitation link found. Please use the link from your invitation email.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    return () => {
      invalidateEventRsvpAsyncState(activeLoadRequestRef, activeSubmitRequestRef, submitInFlightRef);
      if (postSubmitResetTimeoutRef.current !== null) {
        window.clearTimeout(postSubmitResetTimeoutRef.current);
        postSubmitResetTimeoutRef.current = null;
      }
    };
  }, []);

  const loadGuestAndEvents = useCallback(async ({ preserveVisibleState = false }: { preserveVisibleState?: boolean } = {}) => {
    const requestId = activeLoadRequestRef.current + 1;
    activeLoadRequestRef.current = requestId;
    loadInFlightRef.current = true;
    activeSubmitRequestRef.current += 1;
    submitInFlightRef.current = false;
    pendingContinuityRefreshRef.current = false;
    ignoreNextLocalContinuityEventRef.current = false;
    const shouldPreserveVisibleState = preserveVisibleState && !selectedEvent && guest !== null;
    if (!shouldPreserveVisibleState) {
      tokenLinkedSessionRef.current = false;
    }

    if (postSubmitResetTimeoutRef.current !== null) {
      window.clearTimeout(postSubmitResetTimeoutRef.current);
      postSubmitResetTimeoutRef.current = null;
    }
    setLoading(shouldPreserveVisibleState ? false : true);
    setError('');
    if (!shouldPreserveVisibleState) {
      setGuest(null);
      setRsvpSessionToken(null);
      setInvitations([]);
      setSelectedEvent(null);
      setRsvpForm(buildDefaultEventRsvpFormState());
    }
    resetEventRsvpModalTransientState(setSubmitting, setSubmitError, setSubmitSuccess, setError);
    if (!shouldPreserveVisibleState) {
      setHasEventRsvpSupport(null);
    }

    try {
      const edgeLookup = CAN_USE_EVENT_RSVP_FUNCTION
        ? await callValidateRsvpToken<Record<string, unknown>>({
            action: 'event_lookup',
            inviteToken: token,
          })
        : { error: 'missing-config', status: 0 };
      const { data, error: lookupError, status: lookupStatus } = edgeLookup;

      if (lookupStatus === 401 || lookupError === 'missing-config') {
        if (activeLoadRequestRef.current !== requestId) return;
        tokenLinkedSessionRef.current = shouldPreserveVisibleState;
        if (!shouldPreserveVisibleState) {
          setError(INVALID_EVENT_INVITATION_MESSAGE);
          setLoading(false);
        }
        return;
      }

      if (lookupError || !data?.guest) {
        if (activeLoadRequestRef.current !== requestId) return;
        if (shouldPreserveVisibleState) {
          tokenLinkedSessionRef.current = true;
          return;
        }
        tokenLinkedSessionRef.current = false;
        setGuest(null);
        setRsvpSessionToken(null);
        setInvitations([]);
        setSelectedEvent(null);
        setRsvpForm(buildDefaultEventRsvpFormState());
        setHasEventRsvpSupport(null);
        setError(safeEventRsvpGuestError(lookupError));
        setLoading(false);
        return;
      }

      if (activeLoadRequestRef.current !== requestId) return;
      tokenLinkedSessionRef.current = true;
      const lookupData = data as EventLookupResponse;
      const guestData = lookupData.guest as Guest;
      const invitationsData = Array.isArray(data.invitations) ? data.invitations : [];
      const trackedSiteSlug = typeof lookupData.siteSlug === 'string' ? lookupData.siteSlug.trim() : '';
      if (trackedSiteSlug) {
        const analyticsKey = `${trackedSiteSlug}:${token}`;
        if (trackedInviteAnalyticsKeyRef.current !== analyticsKey) {
          trackedInviteAnalyticsKeyRef.current = analyticsKey;
          trackGuestHubEvent(trackedSiteSlug, 'view', '/rsvp-event/invite', { inviteToken: token }).catch(() => {});
        }
      }
      setGuest(guestData);
      setRsvpSessionToken(lookupData.rsvpSession ?? null);

      const invitationsWithRsvps = invitationsData.map((invitation) => {
        const row = invitation as EventInvitation & {
          itinerary_events?: ItineraryEvent;
          event_rsvps?: Array<{ attending: boolean | null; dietary_restrictions: string | null; notes: string | null }>;
        };
        const rsvpData = Array.isArray(row.event_rsvps) ? row.event_rsvps[0] ?? null : null;

        return {
          id: row.id,
          event_id: row.event_id,
          event: (row.itinerary_events ?? row.event) as ItineraryEvent,
          rsvp: rsvpData
            ? buildInvitationRsvp({
                attending: rsvpData.attending ?? true,
                dietary_restrictions: rsvpData.dietary_restrictions || '',
                notes: rsvpData.notes || '',
              })
            : undefined,
        };
      });

      if (activeLoadRequestRef.current !== requestId) return;
      setInvitations(invitationsWithRsvps);
      setHasEventRsvpSupport(data.eventRsvpSupport === false ? false : true);
    } catch {
      if (activeLoadRequestRef.current !== requestId) return;
      tokenLinkedSessionRef.current = shouldPreserveVisibleState;
      if (!shouldPreserveVisibleState) {
        setError('Couldn’t load your event invitations. Please try again or contact the couple.');
      }
    } finally {
      if (activeLoadRequestRef.current === requestId) {
        loadInFlightRef.current = false;
        setLoading(false);
        if (
          pendingContinuityRefreshRef.current
          && token
          && tokenLinkedSessionRef.current
          && !selectedEvent
          && !submitting
          && !submitInFlightRef.current
        ) {
          pendingContinuityRefreshRef.current = false;
          void loadGuestAndEvents({ preserveVisibleState: true });
        }
      }
    }
  }, [guest, selectedEvent, token]);

  const refreshGuestAndEventsForContinuity = useCallback(() => {
    if (!token || !tokenLinkedSessionRef.current) return;
    if (loadInFlightRef.current || selectedEvent || submitting || submitInFlightRef.current) {
      pendingContinuityRefreshRef.current = true;
      return;
    }

    pendingContinuityRefreshRef.current = false;
    loadGuestAndEvents({ preserveVisibleState: true });
  }, [loadGuestAndEvents, selectedEvent, submitting, token]);

  useEffect(() => {
    if (!token) return undefined;

    const handleRsvpContinuityUpdate = () => {
      if (ignoreNextLocalContinuityEventRef.current) {
        ignoreNextLocalContinuityEventRef.current = false;
        return;
      }
      refreshGuestAndEventsForContinuity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== RSVP_CONTINUITY_STORAGE_KEY || !isFreshRsvpContinuityStorageValue(event.newValue)) return;
      refreshGuestAndEventsForContinuity();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      refreshGuestAndEventsForContinuity();
    };

    window.addEventListener('focus', refreshGuestAndEventsForContinuity);
    window.addEventListener(RSVP_CONTINUITY_EVENT, handleRsvpContinuityUpdate);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshGuestAndEventsForContinuity);
      window.removeEventListener(RSVP_CONTINUITY_EVENT, handleRsvpContinuityUpdate);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshGuestAndEventsForContinuity, token]);

  useEffect(() => {
    if (!pendingContinuityRefreshRef.current) return;
    if (!token || !tokenLinkedSessionRef.current || loadInFlightRef.current || selectedEvent || submitting || submitInFlightRef.current) return;

    pendingContinuityRefreshRef.current = false;
    loadGuestAndEvents({ preserveVisibleState: true });
  }, [loadGuestAndEvents, selectedEvent, submitting, token]);

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
    invalidateEventRsvpAsyncState(activeLoadRequestRef, activeSubmitRequestRef, submitInFlightRef);
    if (postSubmitResetTimeoutRef.current !== null) {
      window.clearTimeout(postSubmitResetTimeoutRef.current);
      postSubmitResetTimeoutRef.current = null;
    }
    setLoading(false);
    setSelectedEvent(invitation.id);
    resetEventRsvpModalTransientState(setSubmitting, setSubmitError, setSubmitSuccess, setError);
    if (invitation.rsvp) {
      setRsvpForm(buildInvitationRsvpFormState(invitation.rsvp));
    } else {
      setRsvpForm(buildDefaultEventRsvpFormState());
    }
  }

  function buildInvitationRsvp(form: EventRsvpFormState) {
    const dietaryRestrictions = form.dietary_restrictions.trim();
    const notes = form.notes.trim();

    return {
      attending: form.attending,
      dietary_restrictions: form.attending ? (dietaryRestrictions || null) : null,
      notes: form.attending ? (notes || null) : null,
    };
  }

  function buildInvitationRsvpFormState(rsvp: EventInvitation['rsvp'] | null | undefined): EventRsvpFormState {
    if (!rsvp) return buildDefaultEventRsvpFormState();

    const normalized = buildInvitationRsvp({
      attending: rsvp.attending,
      dietary_restrictions: rsvp.dietary_restrictions || '',
      notes: rsvp.notes || '',
    });

    return {
      attending: normalized.attending,
      dietary_restrictions: normalized.dietary_restrictions || '',
      notes: normalized.notes || '',
    };
  }

  function normalizeEventRsvpFormState(form: EventRsvpFormState): EventRsvpFormState {
    return buildInvitationRsvpFormState(buildInvitationRsvp(form));
  }

  function applyInvitationRsvp(invitationId: string, form: EventRsvpFormState) {
    const nextRsvp = buildInvitationRsvp(normalizeEventRsvpFormState(form));
    setInvitations((current) => current.map((invitation) => (
      invitation.id === invitationId
        ? {
            ...invitation,
            rsvp: nextRsvp,
          }
        : invitation
    )));
  }

  function updateRsvpForm(updater: (current: EventRsvpFormState) => EventRsvpFormState) {
    setError('');
    setSubmitError('');
    setSubmitSuccess(false);
    if (postSubmitResetTimeoutRef.current !== null) {
      window.clearTimeout(postSubmitResetTimeoutRef.current);
      postSubmitResetTimeoutRef.current = null;
    }
    invalidateEventRsvpSubmitState(activeSubmitRequestRef, submitInFlightRef);
    setSubmitting(false);
    setRsvpForm((current) => normalizeEventRsvpFormState(updater(current)));
  }

  function closeRsvpForm() {
    invalidateEventRsvpAsyncState(activeLoadRequestRef, activeSubmitRequestRef, submitInFlightRef);
    if (postSubmitResetTimeoutRef.current !== null) {
      window.clearTimeout(postSubmitResetTimeoutRef.current);
      postSubmitResetTimeoutRef.current = null;
    }
    resetEventRsvpModalTransientState(setSubmitting, setSubmitError, setSubmitSuccess, setError);
    setLoading(false);
    setRsvpForm(buildDefaultEventRsvpFormState());
    setSelectedEvent(null);
  }

  async function handleSubmitRsvp(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent || submitting || submitInFlightRef.current) return;
    const requestId = activeSubmitRequestRef.current + 1;
    activeSubmitRequestRef.current = requestId;
    submitInFlightRef.current = true;
    let submittedSuccessfully = false;
    const normalizedForm = normalizeEventRsvpFormState(rsvpForm);

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const invitation = invitations.find((i) => i.id === selectedEvent);
      if (!invitation) return;

      if (hasEventRsvpSupport === false) {
        if (activeSubmitRequestRef.current !== requestId) return;
        setSubmitError('Event-specific RSVP is temporarily unavailable for this site.');
        return;
      }

      if (!guest?.id) {
        if (activeSubmitRequestRef.current === requestId) {
          setSubmitError(INVALID_EVENT_INVITATION_MESSAGE);
        }
        return;
      }

      if (!rsvpSessionToken) {
        if (activeSubmitRequestRef.current === requestId) {
          setSubmitError(INVALID_EVENT_INVITATION_MESSAGE);
        }
        return;
      }

      const edgeSubmit = CAN_USE_EVENT_RSVP_FUNCTION
        ? await callValidateRsvpToken<Record<string, unknown>>({
            action: 'event_submit',
            guestId: guest.id,
            rsvpSession: rsvpSessionToken,
            eventInvitationId: selectedEvent,
            attending: normalizedForm.attending,
            dietaryRestrictions: normalizedForm.dietary_restrictions || null,
            notes: normalizedForm.notes || null,
          })
        : { error: 'missing-config', status: 0 };
      const { error, status } = edgeSubmit;

      if (status === 401 || error === 'missing-config') {
        if (activeSubmitRequestRef.current === requestId) {
          setSubmitError(INVALID_EVENT_INVITATION_MESSAGE);
        }
        return;
      }

      if (error) {
        if (activeSubmitRequestRef.current === requestId) {
          setSubmitError(safeEventRsvpGuestError(error, 'Couldn’t save your RSVP. Please try again.'));
        }
        return;
      }

      if (activeSubmitRequestRef.current !== requestId) return;
      setHasEventRsvpSupport(true);
      setRsvpForm(normalizedForm);
      applyInvitationRsvp(selectedEvent, normalizedForm);
      ignoreNextLocalContinuityEventRef.current = true;
      notifyRsvpContinuityUpdate();
      setSubmitSuccess(true);
      submittedSuccessfully = true;
      if (postSubmitResetTimeoutRef.current !== null) {
        window.clearTimeout(postSubmitResetTimeoutRef.current);
      }
      postSubmitResetTimeoutRef.current = window.setTimeout(() => {
        if (activeSubmitRequestRef.current !== requestId) return;
        closeRsvpForm();
        postSubmitResetTimeoutRef.current = null;
      }, 2000);
    } catch {
      if (activeSubmitRequestRef.current !== requestId) return;
      setSubmitError('Couldn’t save your RSVP. Please try again.');
    } finally {
      if (activeSubmitRequestRef.current === requestId) {
        if (!submittedSuccessfully) {
          submitInFlightRef.current = false;
        }
        setSubmitting(false);
      }
    }
  }

  const loadingView = (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
      <Footer />
    </div>
  );

  const errorView = (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-lg border border-border-subtle bg-surface-secondary">
          <AlertCircle className="w-8 h-8 text-text-tertiary" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-3">Link Not Recognized</h1>
        <p className="text-neutral-600 max-w-md mx-auto">{error}</p>
      </div>
      <Footer />
    </div>
  );

  const liveContent = (
    <EventRsvpLiveContent
      guestName={guest?.name}
      invitations={invitations}
      onOpenRsvpForm={openRsvpForm}
      formatTime={formatTime}
      getMapUrl={getMapUrl}
    />
  );

  return (
    <>
      <EventRsvpRouteView
        loading={loading}
        error={error}
        loadingView={loadingView}
        errorView={errorView}
        liveContent={liveContent}
      />

      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            {submitSuccess ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-border-subtle bg-surface-secondary">
                  <Check className="w-9 h-9 text-primary" />
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
                      return inv ? formatEventRsvpDate(inv.event.event_date) : '';
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
                        onClick={() => updateRsvpForm((current) => ({ ...current, attending: true }))}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                          rsvpForm.attending
                            ? 'bg-primary text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        Yes, I'll be there
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRsvpForm((current) => ({ ...current, attending: false }))}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                          !rsvpForm.attending
                            ? 'bg-neutral-700 text-white border border-neutral-700'
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
                            updateRsvpForm((current) => ({ ...current, dietary_restrictions: e.target.value }))
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
                          onChange={(e) => updateRsvpForm((current) => ({ ...current, notes: e.target.value }))}
                          placeholder="Any special requests or messages for the couple"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {submitError && (
                    <div className="flex items-start gap-2 p-3 bg-surface-secondary border border-border-subtle rounded-lg text-sm text-text-secondary">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {submitError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (!submitting) {
                          closeRsvpForm();
                        }
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
    </>
  );
}
