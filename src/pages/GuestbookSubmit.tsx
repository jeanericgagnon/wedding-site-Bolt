import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HeartHandshake, PenLine, Send } from 'lucide-react';
import { customerSafeErrorMessage } from '../lib/customerSafeError';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const friendlyGuestbookError = (err: unknown) => {
  return customerSafeErrorMessage(err, 'Couldn’t send your note right now. Please try again in a moment.', {
    allow: [/^Write a note before sending\.$/i],
  });
};

export const buildGuestbookAccessPayload = (slug: string) => {
  const searchParams = new URLSearchParams(window.location.search);
  return {
    inviteToken: searchParams.get('token') ?? sessionStorage.getItem(`dayof_invite_token_${slug}`),
    passwordSession: sessionStorage.getItem(`dayof_pw_session_${slug}`),
  };
};

export const GuestbookSubmit: React.FC = () => {
  const { siteRef } = useParams();
  const siteSlug = useMemo(() => (siteRef ?? '').trim().toLowerCase(), [siteRef]);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputClassName = 'w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-200/70';
  const labelClassName = 'mb-2 block text-sm font-medium text-stone-800';

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Guestbook notes are not ready yet. Please check back soon.');
      return;
    }
    if (!message.trim()) {
      setError('Write a note before sending.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/guestbook-submit`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteSlug, guestName, guestEmail, message, website, ...buildGuestbookAccessPayload(siteSlug) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Couldn’t send your note right now. Please try again in a moment.');
      setStatus('Your note is in. Thank you.');
      setMessage('');
      setGuestEmail('');
    } catch (err) {
      setError(friendlyGuestbookError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fbf7f1] px-4 py-6 text-stone-950 sm:py-10">
      <main className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="relative min-h-[250px] bg-stone-900">
            <img
              src="/preview-photos/024-root-landscape.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/45 to-stone-950/10" />
            <div className="relative flex min-h-[250px] flex-col justify-end p-6 text-white sm:p-8">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/18 backdrop-blur">
                <HeartHandshake className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold text-white/70">Guestbook</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">Leave a note</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/90">
                Send the couple a written memory or well-wish without creating an account.
              </p>
            </div>
          </div>
          <div className="p-5 text-sm leading-6 text-stone-600 sm:p-6">
            A quick note from the people who were there becomes part of the wedding record. Keep it sweet, specific, and in your own voice.
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5 sm:p-7">
        <form className="space-y-4" onSubmit={onSubmit} aria-busy={submitting}>
          <input className="hidden" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <div>
            <label htmlFor="guestbook-name" className={labelClassName}>Your name (optional)</label>
            <input id="guestbook-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} className={inputClassName} placeholder="Jane Doe" />
          </div>
          <div>
            <label htmlFor="guestbook-email" className={labelClassName}>Email (optional)</label>
            <input id="guestbook-email" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className={inputClassName} placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="guestbook-message" className={labelClassName}>Note</label>
            <div className="relative">
              <PenLine className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-stone-400" aria-hidden="true" />
              <textarea
                id="guestbook-message"
                required
                maxLength={2000}
                aria-describedby="guestbook-message-count"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${inputClassName} min-h-40 pr-11`}
                placeholder="A few words for the couple"
              />
            </div>
            <p id="guestbook-message-count" className="mt-1 text-xs text-stone-500" aria-live="polite">{message.length}/2000 characters</p>
          </div>
          {error && <p role="alert" className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{error}</p>}
          {status && <p role="status" className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">{status}</p>}
          <button type="submit" disabled={submitting} className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-3 text-base font-semibold text-white hover:bg-stone-800 disabled:opacity-60">
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? 'Sending…' : 'Send note'}
          </button>
        </form>

        {siteSlug && (
          <Link to={`/event/${encodeURIComponent(siteSlug)}`} className="mt-4 block text-center text-sm font-medium text-stone-700 hover:text-stone-950">
            Back to wedding hub
          </Link>
        )}
        </section>
      </main>
    </div>
  );
};

export default GuestbookSubmit;
