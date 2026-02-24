import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type Match = {
  id: string;
  name: string;
  household_id?: string | null;
  household_size?: number;
};


async function callPublicFn(name: string, body: unknown) {
  const base = ((import.meta as any).env?.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!base) throw new Error('Missing Supabase URL');
  const res = await fetch(`${base}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any).error || `Request failed (${res.status})`);
  if ((json as any)?.error) throw new Error((json as any).error);
  return json as any;
}

export const GuestContactUpdate: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const siteRef = token; // now interpreted as site id/slug

  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [selectedHouseholdSize, setSelectedHouseholdSize] = useState<number>(1);
  const [applyHousehold, setApplyHousehold] = useState(false);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState<'pending' | 'confirmed' | 'declined' | ''>('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const canSubmit = useMemo(() => !!selectedGuestId && (!!email.trim() || !!phone.trim() || !!rsvpStatus), [selectedGuestId, email, phone, rsvpStatus]);

  async function handleSearch() {
    if (query.trim().length < 2) return;
    setSearching(true);
    setResult(null);
    try {
      const data = await callPublicFn('guest-contact-lookup', { site_ref: siteRef, query: query.trim() });
      const rows = ((data as any)?.matches ?? []) as Match[];
      setMatches(rows);
      if (rows.length > 0) {
        setSelectedGuestId(rows[0].id);
        setSelectedHouseholdSize(rows[0].household_size ?? 1);
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Search failed' });
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
      const data = await callPublicFn('guest-contact-submit', {
        site_ref: siteRef,
        guest_id: selectedGuestId,
        apply_household: applyHousehold,
        email: email.trim() || null,
        phone: phone.trim() || null,
        rsvp_status: rsvpStatus || null,
        sms_consent: smsConsent,
      });
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult({ ok: true, message: 'Thanks! Your information has been updated.' });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Unable to submit update.' });
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
            placeholder="Search your first or last name"
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

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">RSVP (optional)</label>
            <select value={rsvpStatus} onChange={(e) => setRsvpStatus(e.target.value as any)} className="w-full px-3 py-2 border border-border rounded-lg bg-surface-subtle">
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
            {loading ? 'Saving…' : 'Submit update'}
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