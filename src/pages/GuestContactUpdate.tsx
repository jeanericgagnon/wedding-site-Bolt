import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';
import { resolveCurrentSearchParams } from '../lib/currentSearchParams';
import { demoGuests, demoWeddingSite } from '../lib/demoData';
import { customerSafeErrorMessage } from '../lib/customerSafeError';
import {
  buildPublicAccessArtifacts,
  buildGuestIdentityArtifacts,
  captureGuestInviteTokenFromSearch,
  capturePublicInviteTokenFromSearch,
} from '../lib/publicAccessArtifacts';
import { trackGuestHubEvent } from './guestHubPublicService';
import { callGuestContactFunction } from './guestPublicSubmissionService';
import { GuestContactLookupPanel } from './GuestContactLookupPanel';

type Match = {
  contact_session: string;
  name: string;
  household_size?: number;
  verification_strength?: 'email_verifier' | 'invite_token';
};

export const friendlyGuestContactError = (err: unknown, fallback: string) => {
  return customerSafeErrorMessage(err, fallback, {
    allow: [
      /^Add an email or phone first\.$/i,
    ],
  });
};

export const safeGuestContactFunctionError = (value: unknown, fallback: string) => {
  return friendlyGuestContactError(typeof value === 'string' ? value : '', fallback);
};

export const buildGuestContactAccessPayload = (siteRef: string, searchParams?: URLSearchParams) => {
  return buildPublicAccessArtifacts(siteRef, resolveCurrentSearchParams(searchParams));
};

export const buildGuestContactIdentityPayload = (siteRef: string, searchParams?: URLSearchParams) => {
  return buildGuestIdentityArtifacts(siteRef, resolveCurrentSearchParams(searchParams));
};

function hasFullNameQuery(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized.length >= 5 && normalized.split(' ').filter(Boolean).length >= 2;
}

function hasGuestContactVerifier(value: string) {
  return value.trim().toLowerCase().length >= 3;
}

function hasGuestInviteToken(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length >= 8;
}

export const GuestContactUpdate: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const siteRef = token; // now interpreted as site id/slug
  const isDemoSiteRef = siteRef === demoWeddingSite.id || siteRef.toLowerCase() === 'demo';

  const [query, setQuery] = useState('');
  const [verifier, setVerifier] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedContactSession, setSelectedContactSession] = useState<string>('');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'pending' | 'confirmed' | 'declined' | ''>('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [mailingAddressLine1, setMailingAddressLine1] = useState('');
  const [mailingAddressLine2, setMailingAddressLine2] = useState('');
  const [mailingCity, setMailingCity] = useState('');
  const [mailingState, setMailingState] = useState('');
  const [mailingPostalCode, setMailingPostalCode] = useState('');
  const [mailingCountry, setMailingCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const activeLookupRequestRef = useRef(0);
  const activeSubmitRequestRef = useRef(0);

  const canSubmitContact = useMemo(() => !!selectedContactSession && (
    !!email.trim() ||
    !!phone.trim() ||
    !!mailingAddressLine1.trim() ||
    !!mailingCity.trim() ||
    !!mailingPostalCode.trim() ||
    !!mailingCountry.trim()
  ), [selectedContactSession, email, phone, mailingAddressLine1, mailingCity, mailingPostalCode, mailingCountry]);

  const canSubmitRsvp = useMemo(
    () => !!selectedContactSession && !!rsvpStatus,
    [selectedContactSession, rsvpStatus]
  );

  useEffect(() => {
    activeLookupRequestRef.current += 1;
    activeSubmitRequestRef.current += 1;
    setQuery('');
    setVerifier('');
    setMatches([]);
    setSelectedContactSession('');
    setEmail('');
    setPhone('');
    setRsvpStatus('');
    setSmsConsent(false);
    setMailingAddressLine1('');
    setMailingAddressLine2('');
    setMailingCity('');
    setMailingState('');
    setMailingPostalCode('');
    setMailingCountry('');
    setLoading(false);
    setSearching(false);
    setResult(null);
    if (siteRef) {
      capturePublicInviteTokenFromSearch(siteRef, searchParams);
      captureGuestInviteTokenFromSearch(siteRef, searchParams);
    }
  }, [searchParams, siteRef]);

  useEffect(() => {
    if (!siteRef) return;
    trackGuestHubEvent(siteRef, 'view', '/guest-contact/invite', {
      ...buildGuestContactAccessPayload(siteRef, searchParams),
      ...buildGuestContactIdentityPayload(siteRef, searchParams),
    }).catch(() => {});
  }, [searchParams, siteRef]);

  async function handleSearch() {
    const requestId = activeLookupRequestRef.current + 1;
    activeLookupRequestRef.current = requestId;
    const guestIdentity = buildGuestContactIdentityPayload(siteRef, searchParams);
    const hasTokenVerifier = hasGuestInviteToken(guestIdentity.guestInviteToken);
    if (!hasFullNameQuery(query) || (!hasTokenVerifier && !hasGuestContactVerifier(verifier))) {
      setResult({ ok: false, message: hasTokenVerifier
        ? 'Enter your full name exactly as it appears on the invitation.'
        : 'Enter your full name and the first few characters of your email address.' });
      return;
    }
    setSearching(true);
    setResult(null);
    setMatches([]);
    setSelectedContactSession('');
    try {
      const data = await callGuestContactFunction<{ matches?: Match[] }>('guest-contact-lookup', {
        site_ref: siteRef,
        query: query.trim(),
        verifier: verifier.trim(),
        ...buildGuestContactAccessPayload(siteRef, searchParams),
        ...guestIdentity,
      });
      if (activeLookupRequestRef.current !== requestId) return;
      const rows = ((data as any)?.matches ?? []) as Match[];
      setMatches(rows);
      if (rows.length > 0) {
        setSelectedContactSession(rows[0].contact_session);
      } else {
        setResult({ ok: false, message: 'No guest record matched that search. Try your full name as it appears on the invitation.' });
      }
    } catch (err) {
      if (activeLookupRequestRef.current !== requestId) return;
      if (isDemoSiteRef) {
        const q = query.trim().toLowerCase();
        const rows = demoGuests
          .filter((g) => (g.name || '').toLowerCase().includes(q))
          .slice(0, 10)
          .map((g) => ({
            contact_session: g.id,
            name: g.name,
            household_size: ((g as any).household_size as number | undefined) ?? 1,
          }));
        setMatches(rows);
        if (rows.length > 0) {
          setSelectedContactSession(rows[0].contact_session);
        } else {
          setResult({ ok: false, message: 'No demo guest matched that search. Try a full name from the sample guest list.' });
        }
      } else {
        setResult({ ok: false, message: friendlyGuestContactError(err, 'Couldn’t complete that search. Please try again.') });
      }
    } finally {
      if (activeLookupRequestRef.current === requestId) setSearching(false);
    }
  }

  async function handleSubmit(mode: 'contact' | 'rsvp') {
    const canSubmit = mode === 'contact' ? canSubmitContact : canSubmitRsvp;
    if (!canSubmit) return;
    const requestId = activeSubmitRequestRef.current + 1;
    activeSubmitRequestRef.current = requestId;
    setLoading(true);
    setResult(null);
    try {
      if (!isDemoSiteRef) {
        await callGuestContactFunction('guest-contact-submit', {
          site_ref: siteRef,
          contact_session: selectedContactSession,
          apply_household: false,
          email: mode === 'contact' ? (email.trim() || null) : null,
          phone: mode === 'contact' ? (phone.trim() || null) : null,
          rsvp_status: mode === 'rsvp' ? (rsvpStatus || null) : null,
          sms_consent: mode === 'contact' ? smsConsent : false,
          mailing_address_line1: mode === 'contact' ? (mailingAddressLine1.trim() || null) : null,
          mailing_address_line2: mode === 'contact' ? (mailingAddressLine2.trim() || null) : null,
          mailing_city: mode === 'contact' ? (mailingCity.trim() || null) : null,
          mailing_state: mode === 'contact' ? (mailingState.trim() || null) : null,
          mailing_postal_code: mode === 'contact' ? (mailingPostalCode.trim() || null) : null,
          mailing_country: mode === 'contact' ? (mailingCountry.trim() || null) : null,
        });
      }
      if (activeSubmitRequestRef.current !== requestId) return;
      setResult({ ok: true, message: mode === 'rsvp' ? 'Thanks! Your RSVP update is saved.' : 'Thanks! Your contact information has been updated.' });
    } catch (err) {
      if (activeSubmitRequestRef.current !== requestId) return;
      setResult({ ok: false, message: friendlyGuestContactError(err, 'Couldn’t send your update right now.') });
    } finally {
      if (activeSubmitRequestRef.current === requestId) setLoading(false);
    }
  }

  const clearResult = () => setResult(null);
  const resetLookupSelection = () => {
    setMatches([]);
    setSelectedContactSession('');
  };
  const resetContactDraft = () => {
    setEmail('');
    setPhone('');
    setRsvpStatus('');
    setSmsConsent(false);
    setMailingAddressLine1('');
    setMailingAddressLine2('');
    setMailingCity('');
    setMailingState('');
    setMailingPostalCode('');
    setMailingCountry('');
  };

  return (
    <div className="min-h-screen bg-background">
      <OwnerPreviewBanner />
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-surface border border-border rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold text-text-primary">Update contact info or RSVP</h1>
        <p className="text-sm text-text-secondary">Search your name, choose your record, then update contact details or RSVP separately.</p>

        <GuestContactLookupPanel
          query={query}
          verifier={verifier}
          searching={searching}
          matches={matches}
          selectedContactSession={selectedContactSession}
          onQueryChange={(value) => { clearResult(); resetLookupSelection(); resetContactDraft(); setQuery(value); }}
          onVerifierChange={(value) => { clearResult(); resetLookupSelection(); resetContactDraft(); setVerifier(value); }}
          onSearch={handleSearch}
          onSelectContactSession={(contactSession) => {
            clearResult();
            resetContactDraft();
            setSelectedContactSession(contactSession);
          }}
          canSearch={hasFullNameQuery(query) && (hasGuestContactVerifier(verifier) || hasGuestInviteToken(buildGuestContactIdentityPayload(siteRef, searchParams).guestInviteToken))}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit('contact');
          }}
          className="space-y-4"
          aria-busy={loading}
        >
          <div>
            <label htmlFor="guest-contact-email" className="block text-sm font-medium text-text-primary mb-1">Email (optional)</label>
            <input id="guest-contact-email" value={email} onChange={(e) => { clearResult(); setEmail(e.target.value); }} type="email" className="w-full px-3 py-2 border border-border rounded-xl bg-surface-subtle" placeholder="you@example.com" />
          </div>

          <div>
            <label htmlFor="guest-contact-phone" className="block text-sm font-medium text-text-primary mb-1">Phone (optional)</label>
            <input id="guest-contact-phone" value={phone} onChange={(e) => { clearResult(); setPhone(e.target.value); }} type="tel" className="w-full px-3 py-2 border border-border rounded-xl bg-surface-subtle" placeholder="(555) 123-4567" />
          </div>

          <fieldset className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3 space-y-2">
            <legend className="text-sm font-medium text-text-primary">Mailing address (optional)</legend>
            <label className="sr-only" htmlFor="guest-contact-address-line-1">Address line 1</label>
            <input id="guest-contact-address-line-1" value={mailingAddressLine1} onChange={(e) => { clearResult(); setMailingAddressLine1(e.target.value); }} type="text" className="w-full px-3 py-2 border border-border rounded-xl bg-surface" placeholder="Address line 1" />
            <label className="sr-only" htmlFor="guest-contact-address-line-2">Address line 2</label>
            <input id="guest-contact-address-line-2" value={mailingAddressLine2} onChange={(e) => { clearResult(); setMailingAddressLine2(e.target.value); }} type="text" className="w-full px-3 py-2 border border-border rounded-xl bg-surface" placeholder="Address line 2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="sr-only" htmlFor="guest-contact-city">City</label>
                <input id="guest-contact-city" value={mailingCity} onChange={(e) => { clearResult(); setMailingCity(e.target.value); }} type="text" className="w-full px-3 py-2 border border-border rounded-xl bg-surface" placeholder="City" />
              </div>
              <div>
                <label className="sr-only" htmlFor="guest-contact-state">State / Province</label>
                <input id="guest-contact-state" value={mailingState} onChange={(e) => { clearResult(); setMailingState(e.target.value); }} type="text" className="w-full px-3 py-2 border border-border rounded-xl bg-surface" placeholder="State / Province" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="sr-only" htmlFor="guest-contact-postal-code">ZIP / Postal code</label>
                <input id="guest-contact-postal-code" value={mailingPostalCode} onChange={(e) => { clearResult(); setMailingPostalCode(e.target.value); }} type="text" className="w-full px-3 py-2 border border-border rounded-xl bg-surface" placeholder="ZIP / Postal code" />
              </div>
              <div>
                <label className="sr-only" htmlFor="guest-contact-country">Country</label>
                <input id="guest-contact-country" value={mailingCountry} onChange={(e) => { clearResult(); setMailingCountry(e.target.value); }} type="text" className="w-full px-3 py-2 border border-border rounded-xl bg-surface" placeholder="Country" />
              </div>
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={smsConsent} onChange={(e) => { clearResult(); setSmsConsent(e.target.checked); }} />
            I agree to receive wedding updates by SMS (if phone provided).
          </label>

          <button type="submit" disabled={!canSubmitContact || loading} className="w-full px-4 py-2 rounded-xl bg-primary text-white disabled:opacity-50">
            {loading ? 'Saving…' : 'Save contact info'}
          </button>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit('rsvp');
          }}
          className="space-y-4 rounded-xl border border-border-subtle bg-surface-subtle/30 p-4"
          aria-busy={loading}
        >
          <div>
            <label htmlFor="guest-contact-rsvp" className="block text-sm font-medium text-text-primary mb-1">RSVP update</label>
            <select id="guest-contact-rsvp" value={rsvpStatus} onChange={(e) => { clearResult(); setRsvpStatus(e.target.value as any); }} className="w-full px-3 py-2 border border-border rounded-xl bg-surface">
              <option value="">Select a response</option>
              <option value="confirmed">Attending</option>
              <option value="declined">Can’t attend</option>
              <option value="pending">Not sure yet</option>
            </select>
          </div>
          <button type="submit" disabled={!canSubmitRsvp || loading} className="w-full px-4 py-2 rounded-xl border border-primary bg-white text-primary disabled:opacity-50">
            {loading ? 'Saving…' : 'Save RSVP'}
          </button>
        </form>

        {result && (
          <p role={result.ok ? 'status' : 'alert'} className="rounded-xl border border-border-subtle bg-surface-secondary px-3 py-2 text-sm text-text-secondary">{result.message}</p>
        )}
        </div>
      </div>
    </div>
  );
};

export default GuestContactUpdate;
