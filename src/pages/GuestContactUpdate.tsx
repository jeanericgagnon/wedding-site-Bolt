import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { demoGuests, demoWeddingSite } from '../lib/demoData';

type Match = {
  id: string;
  name: string;
  household_id?: string | null;
  household_size?: number;
};

type PublicFnSuccess = {
  matches?: Match[];
  error?: string;
};

type DemoGuestLike = {
  id: string;
  name: string;
  household_id?: string | null;
  household_size?: number;
};

async function callPublicFn(name: string, body: unknown) {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) throw new Error('Missing Supabase URL');
  const res = await fetch(`${base}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as PublicFnSuccess;
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  if (json.error) throw new Error(json.error);
  return json;
}

export const GuestContactUpdate: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const siteRef = token; // now interpreted as site id/slug
  const isDemoSiteRef = siteRef === demoWeddingSite.id || siteRef.toLowerCase() === 'demo';

  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [selectedHouseholdSize, setSelectedHouseholdSize] = useState<number>(1);
  const [applyHousehold, setApplyHousehold] = useState(false);

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

  const canSubmit = useMemo(() => !!selectedGuestId && (
    !!email.trim() ||
    !!phone.trim() ||
    !!rsvpStatus ||
    !!mailingAddressLine1.trim() ||
    !!mailingCity.trim() ||
    !!mailingPostalCode.trim() ||
    !!mailingCountry.trim()
  ), [selectedGuestId, email, phone, rsvpStatus, mailingAddressLine1, mailingCity, mailingPostalCode, mailingCountry]);

  async function handleSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setResult(null);
    setMatches([]);
    setSelectedGuestId('');
    setSelectedHouseholdSize(1);
    try {
      const data = await callPublicFn('guest-contact-lookup', { site_ref: siteRef, query: query.trim() });
      const rows = data.matches ?? [];
      setMatches(rows);
      if (rows.length > 0) {
        setSelectedGuestId(rows[0].id);
        setSelectedHouseholdSize(rows[0].household_size ?? 1);
      } else {
        setResult({ ok: false, message: 'No guest record matched that search. Try your full name as it appears on the invitation.' });
      }
    } catch (err) {
      if (isDemoSiteRef) {
        const q = query.trim().toLowerCase();
        const rows = demoGuests
          .filter((g) => (g.name || '').toLowerCase().includes(q))
          .slice(0, 10)
          .map((g) => {
            const guest = g as DemoGuestLike;
            return {
              id: guest.id,
              name: guest.name,
              household_id: guest.household_id ?? null,
              household_size: guest.household_size ?? 1,
            };
          });
        setMatches(rows);
        if (rows.length > 0) {
          setSelectedGuestId(rows[0].id);
          setSelectedHouseholdSize(rows[0].household_size ?? 1);
        } else {
          setResult({ ok: false, message: 'No demo guest matched that search. Try a full name from the sample guest list.' });
        }
      } else {
        setResult({ ok: false, message: err instanceof Error ? err.message : 'Couldn’t complete that search. Please try again.' });
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    try {
      if (!isDemoSiteRef) {
        await callPublicFn('guest-contact-submit', {
          site_ref: siteRef,
          guest_id: selectedGuestId,
          apply_household: applyHousehold,
          email: email.trim() || null,
          phone: phone.trim() || null,
          rsvp_status: rsvpStatus || null,
          sms_consent: smsConsent,
          mailing_address_line1: mailingAddressLine1.trim() || null,
          mailing_address_line2: mailingAddressLine2.trim() || null,
          mailing_city: mailingCity.trim() || null,
          mailing_state: mailingState.trim() || null,
          mailing_postal_code: mailingPostalCode.trim() || null,
          mailing_country: mailingCountry.trim() || null,
        });
      }
      setResult({ ok: true, message: 'Thanks! Your information has been updated.' });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Could not send your update right now.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-surface border border-border rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-semibold text-text-primary">Update contact & RSVP</h1>
        <p className="text-sm text-text-secondary">Search your name, choose your record, then update details for yourself or your party.</p>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your full name"
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface-subtle"
          />
          <button onClick={handleSearch} disabled={searching || query.trim().length < 2} className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50">
            {searching ? 'Searching…' : 'Find'}
          </button>
        </div>

        {matches.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">Select your name</label>
            <select
              value={selectedGuestId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedGuestId(id);
                const hit = matches.find((m) => m.id === id);
                setSelectedHouseholdSize(hit?.household_size ?? 1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface-subtle"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{(m.household_size ?? 1) > 1 ? ` (party of ${m.household_size})` : ''}</option>
              ))}
            </select>
            {(selectedHouseholdSize ?? 1) > 1 && (
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={applyHousehold} onChange={(e) => setApplyHousehold(e.target.checked)} />
                Apply these updates to my whole party ({selectedHouseholdSize} guests)
              </label>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Email (optional)</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-subtle" placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="w-full px-3 py-2 border border-border rounded-lg bg-surface-subtle" placeholder="(555) 123-4567" />
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface-subtle/40 p-3 space-y-2">
            <p className="text-sm font-medium text-text-primary">Mailing address (optional)</p>
            <input value={mailingAddressLine1} onChange={(e) => setMailingAddressLine1(e.target.value)} type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface" placeholder="Address line 1" />
            <input value={mailingAddressLine2} onChange={(e) => setMailingAddressLine2(e.target.value)} type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface" placeholder="Address line 2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={mailingCity} onChange={(e) => setMailingCity(e.target.value)} type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface" placeholder="City" />
              <input value={mailingState} onChange={(e) => setMailingState(e.target.value)} type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface" placeholder="State / Province" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={mailingPostalCode} onChange={(e) => setMailingPostalCode(e.target.value)} type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface" placeholder="ZIP / Postal code" />
              <input value={mailingCountry} onChange={(e) => setMailingCountry(e.target.value)} type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-surface" placeholder="Country" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">RSVP (optional)</label>
            <select
              value={rsvpStatus}
              onChange={(e) => setRsvpStatus(e.target.value as '' | 'pending' | 'confirmed' | 'declined')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface-subtle"
            >
              <option value="">No change</option>
              <option value="confirmed">Attending</option>
              <option value="declined">Can’t attend</option>
              <option value="pending">Not sure yet</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} />
            I agree to receive wedding updates by SMS (if phone provided).
          </label>

          <button type="submit" disabled={!canSubmit || loading} className="w-full px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50">
            {loading ? 'Saving…' : 'Save update'}
          </button>
        </form>

        {result && (
          <p className={`text-sm ${result.ok ? 'text-success' : 'text-error'}`}>{result.message}</p>
        )}
      </div>
    </div>
  );
};

export default GuestContactUpdate;
