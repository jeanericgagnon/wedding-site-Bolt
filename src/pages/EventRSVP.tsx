import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, Check, X, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Header, Footer } from '../components/layout';
import { buildCanonicalInviteTokenSearch, readInviteTokenFromParams } from '../lib/inviteTokenParams';
import { formatEventRsvpDate } from './eventRsvpDate';
import {
  mapEventRsvpLoadError,
  mapEventRsvpSubmitError,
  RSVP_LINK_NOT_RECOGNIZED_ERROR,
  RSVP_LINK_REQUIRED_ERROR,
} from './guestRsvpCopy';

const RSVP_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-rsvp-token`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CAN_USE_EVENT_RSVP_FUNCTION = import.meta.env.MODE !== 'test' && Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(ANON_KEY);

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

interface EventRsvpFormState {
  attending: boolean;
  dietary_restrictions: string;
  notes: string;
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

function isMissingEventRsvpSupportError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('does not exist')
    || normalized.includes('relation "event_rsvps"')
    || normalized.includes('404');
}

function notifyRsvpContinuityUpdate() {
  const updatedAt = new Date().toISOString();

  try {
    window.localStorage.setItem(RSVP_CONTINUITY_STORAGE_KEY, updatedAt);
  } catch {
    // Ignore storage failures and still notify the current tab.
  }

  window.dispatchEvent(new CustomEvent(RSVP_CONTINUITY_EVENT, { detail: { updatedAt } }));
}

async function eventRsvpCall(body: object): Promise<{ data?: Record<string, unknown>; error?: string; status?: number }> {
  if (!CAN_USE_EVENT_RSVP_FUNCTION) {
    return { error: 'missing-config', status: 0 };
  }

  const response = await fetch(RSVP_FN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: (json as { error?: string })?.error ?? `Error ${response.status}`, status: response.status };
  }

  if ((json as { error?: string })?.error) {
    return { error: (json as { error?: string }).error };
  }

  return { data: json as Record<string, unknown> };
}

function shouldFallbackToDirectEventQueries(error?: string, status?: number) {
  return error === 'missing-config' || status === 401;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = readInviteTokenFromParams(searchParams);
  const canonicalInviteSearch = buildCanonicalInviteTokenSearch(searchParams);

  const [guest, setGuest] = useState<Guest | null>(null);
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

  useEffect(() => {
    const currentSearch = searchParams.toString();
    const normalizedSearch = canonicalInviteSearch.startsWith('?')
      ? canonicalInviteSearch.slice(1)
      : canonicalInviteSearch;

    if (normalizedSearch !== currentSearch) {
      navigate(`/events${canonicalInviteSearch}`, { replace: true });
    }
  }, [canonicalInviteSearch, navigate, searchParams]);

  useEffect(() => {
    if (token) {
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
      setInvitations([]);
      setSelectedEvent(null);
      setRsvpForm({ attending: true, dietary_restrictions: '', notes: '' });
      setSubmitting(false);
      setSubmitError('');
      setSubmitSuccess(false);
      setHasEventRsvpSupport(null);
      setError(RSVP_LINK_REQUIRED_ERROR);
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
        ? await eventRsvpCall({
            action: 'event_lookup',
            inviteToken: token,
          })
        : { error: 'missing-config', status: 0 };
      const { data, error: lookupError, status: lookupStatus } = edgeLookup;

      if (shouldFallbackToDirectEventQueries(lookupError, lookupStatus)) {
        const { data: guestData, error: guestError } = await supabase
          .from('guests')
          .select('id, name, email')
          .eq('invite_token', token)
          .maybeSingle();

        if (guestError) throw guestError;
        if (!guestData) {
          if (activeLoadRequestRef.current !== requestId) return;
          if (shouldPreserveVisibleState) {
            tokenLinkedSessionRef.current = true;
            setLoading(false);
            return;
          }

          tokenLinkedSessionRef.current = false;
          setGuest(null);
          setInvitations([]);
          setSelectedEvent(null);
          setRsvpForm(buildDefaultEventRsvpFormState());
          setHasEventRsvpSupport(null);
          setError(RSVP_LINK_NOT_RECOGNIZED_ERROR);
          setLoading(false);
          return;
        }

        if (activeLoadRequestRef.current !== requestId) return;
        tokenLinkedSessionRef.current = true;
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

        let eventRsvpSupportKnown: boolean | null = null;
        let eventRsvpSupportAvailable = true;
        const invitationsWithRsvps = await Promise.all(
          (invitationsData || []).map(async (invitation) => {
            let rsvpData: { attending: boolean | null; dietary_restrictions: string | null; notes: string | null } | null = null;
            if (eventRsvpSupportAvailable) {
              const { data, error } = await supabase
                .from('event_rsvps')
                .select('attending, dietary_restrictions, notes')
                .eq('event_invitation_id', invitation.id)
                .maybeSingle();

              if (error) {
                const msg = error.message || '';
                if (isMissingEventRsvpSupportError(msg)) {
                  if (activeLoadRequestRef.current !== requestId) return {
                    id: invitation.id,
                    event_id: invitation.event_id,
                    event: invitation.itinerary_events as unknown as ItineraryEvent,
                    rsvp: undefined,
                  };
                  eventRsvpSupportAvailable = false;
                  eventRsvpSupportKnown = false;
                } else {
                  throw error;
                }
              } else {
                if (activeLoadRequestRef.current !== requestId) return {
                  id: invitation.id,
                  event_id: invitation.event_id,
                  event: invitation.itinerary_events as unknown as ItineraryEvent,
                  rsvp: undefined,
                };
                eventRsvpSupportKnown = true;
                rsvpData = (data as { attending: boolean | null; dietary_restrictions: string | null; notes: string | null } | null) ?? null;
              }
            }

            return {
              id: invitation.id,
              event_id: invitation.event_id,
              event: invitation.itinerary_events as unknown as ItineraryEvent,
              rsvp: rsvpData
                ? buildInvitationRsvp({
                    attending: rsvpData.attending ?? true,
                    dietary_restrictions: rsvpData.dietary_restrictions || '',
                    notes: rsvpData.notes || '',
                  })
                : undefined,
            };
          })
        );

        if (activeLoadRequestRef.current !== requestId) return;
        setInvitations(invitationsWithRsvps);
        setHasEventRsvpSupport(eventRsvpSupportKnown);
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
        setInvitations([]);
        setSelectedEvent(null);
        setRsvpForm(buildDefaultEventRsvpFormState());
        setHasEventRsvpSupport(null);
        setError(lookupError ? mapEventRsvpLoadError(lookupError) : RSVP_LINK_NOT_RECOGNIZED_ERROR);
        setLoading(false);
        return;
      }

      if (activeLoadRequestRef.current !== requestId) return;
      tokenLinkedSessionRef.current = true;
      const guestData = data.guest as Guest;
      const invitationsData = Array.isArray(data.invitations) ? data.invitations : [];
      setGuest(guestData);

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
      setHasEventRsvpSupport(true);
    } catch {
      if (activeLoadRequestRef.current !== requestId) return;
      tokenLinkedSessionRef.current = shouldPreserveVisibleState;
      if (!shouldPreserveVisibleState) {
      setError(mapEventRsvpLoadError('load-failed'));
      }
    } finally {
      loadInFlightRef.current = false;
      if (activeLoadRequestRef.current === requestId) {
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
  }, [guest, selectedEvent, submitting, token]);

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
      if (event.key !== RSVP_CONTINUITY_STORAGE_KEY || !event.newValue) return;
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
          setSubmitError(RSVP_LINK_NOT_RECOGNIZED_ERROR);
        }
        return;
      }

      const edgeSubmit = CAN_USE_EVENT_RSVP_FUNCTION
        ? await eventRsvpCall({
            action: 'event_submit',
            guestId: guest.id,
            inviteToken: token,
            eventInvitationId: selectedEvent,
            attending: normalizedForm.attending,
          })
        : { error: 'missing-config', status: 0 };
      const { error, status } = edgeSubmit;

      if (shouldFallbackToDirectEventQueries(error, status)) {
        if (invitation.rsvp) {
          const { error } = await supabase
            .from('event_rsvps')
            .update({
              ...buildInvitationRsvp(normalizedForm),
              responded_at: new Date().toISOString(),
            })
            .eq('event_invitation_id', selectedEvent);

          if (error) {
            const msg = error.message || '';
            if (isMissingEventRsvpSupportError(msg)) {
              if (activeSubmitRequestRef.current === requestId) {
                setHasEventRsvpSupport(false);
                setSubmitError('Event-specific RSVP is temporarily unavailable for this site.');
              }
              return;
            }
            throw error;
          }
        } else {
          const { error } = await supabase
            .from('event_rsvps')
            .insert([
              {
                event_invitation_id: selectedEvent,
                ...buildInvitationRsvp(normalizedForm),
                responded_at: new Date().toISOString(),
              },
            ]);

          if (error) {
            const msg = error.message || '';
            if (isMissingEventRsvpSupportError(msg)) {
              if (activeSubmitRequestRef.current === requestId) {
                setHasEventRsvpSupport(false);
                setSubmitError('Event-specific RSVP is temporarily unavailable for this site.');
              }
              return;
            }
            throw error;
          }
        }
      } else if (error) {
        if (activeSubmitRequestRef.current === requestId) {
          setSubmitError(mapEventRsvpSubmitError(error));
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
      setSubmitError(mapEventRsvpSubmitError('submit-failed'));
    } finally {
      setSubmitting(false);
      if (activeSubmitRequestRef.current === requestId && !submittedSuccessfully) {
        submitInFlightRef.current = false;
      }
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
                        onClick={() => updateRsvpForm((current) => ({ ...current, attending: false }))}
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

      <Footer />
    </div>
  );
}
