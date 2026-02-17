import React, { useState } from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function formatDeadline(iso: string | undefined): string | null {
  if (!iso) return null;
  const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function getSiteId(): Promise<string | null> {
  const slug = window.location.pathname.split('/site/')[1];
  if (!slug) return null;
  const { data } = await supabase.from('wedding_sites').select('id').eq('site_slug', slug).maybeSingle();
  return data?.id ?? null;
}

interface FormState {
  guestName: string;
  attending: 'attending' | 'declined';
  guestCount: number;
  dietaryNotes: string;
}

function RsvpForm({ onSuccess, dark }: { onSuccess: (attending: boolean) => void; dark?: boolean }) {
  const [form, setForm] = useState<FormState>({
    guestName: '',
    attending: 'attending',
    guestCount: 1,
    dietaryNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBase = dark
    ? 'w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40'
    : 'w-full px-4 py-2 rounded-lg border border-border bg-surface text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/40';
  const labelBase = dark ? 'block text-sm font-medium text-white/80 mb-1' : 'block text-sm font-medium text-text-primary mb-1';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const siteId = await getSiteId();
      if (!siteId) {
        setError('Unable to find wedding site. Please try again.');
        setSubmitting(false);
        return;
      }
      const { error: insertError } = await supabase.from('site_rsvps').insert({
        wedding_site_id: siteId,
        guest_name: form.guestName,
        rsvp_status: form.attending,
        guest_count: form.attending === 'attending' ? form.guestCount : 1,
        dietary_notes: form.dietaryNotes || null,
      });
      if (insertError) {
        setError('Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      onSuccess(form.attending === 'attending');
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className={labelBase}>Full Name</label>
        <input
          type="text"
          required
          value={form.guestName}
          onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
          placeholder="Your name"
          className={inputBase}
        />
      </div>
      <div>
        <label className={labelBase}>Will you be attending?</label>
        <select
          value={form.attending}
          onChange={e => setForm(f => ({ ...f, attending: e.target.value as 'attending' | 'declined' }))}
          className={inputBase}
        >
          <option value="attending">Yes, I will be there!</option>
          <option value="declined">Sorry, I can't make it</option>
        </select>
      </div>
      {form.attending === 'attending' && (
        <div>
          <label className={labelBase}>Number of Guests</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.guestCount}
            onChange={e => setForm(f => ({ ...f, guestCount: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) }))}
            className={inputBase}
          />
        </div>
      )}
      <div>
        <label className={labelBase}>Dietary Notes <span className={dark ? 'text-white/40' : 'text-text-secondary'}>(optional)</span></label>
        <textarea
          value={form.dietaryNotes}
          onChange={e => setForm(f => ({ ...f, dietaryNotes: e.target.value }))}
          placeholder="Any dietary restrictions or allergies?"
          rows={3}
          className={inputBase}
        />
      </div>
      {error && <p className={dark ? 'text-red-300 text-sm' : 'text-red-600 text-sm'}>{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className={
          dark
            ? 'w-full py-3 rounded-lg bg-white text-primary font-semibold hover:bg-white/90 transition-colors disabled:opacity-50'
            : 'w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50'
        }
      >
        {submitting ? 'Sending...' : 'Submit RSVP'}
      </button>
    </form>
  );
}

export const RsvpSection: React.FC<Props> = ({ data, instance }) => {
  const { rsvp } = data;
  const { settings } = instance;
  const deadline = formatDeadline(rsvp.deadlineISO);
  const [submitted, setSubmitted] = useState(false);
  const [attending, setAttending] = useState(false);

  function handleSuccess(isAttending: boolean) {
    setAttending(isAttending);
    setSubmitted(true);
  }

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-2xl mx-auto text-center">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary mb-8">{settings.title || 'RSVP'}</h2>
        )}
        {deadline && (
          <p className="text-text-secondary mb-8 flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5" />
            Please RSVP by {deadline}
          </p>
        )}
        {submitted ? (
          <div className="rounded-2xl border border-border bg-surface p-8">
            <p className="text-xl font-semibold text-text-primary mb-2">
              {attending ? "We'll see you there!" : "Sorry you can't make it"}
            </p>
            <p className="text-text-secondary text-sm">Your RSVP has been recorded. Thank you!</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-8">
            <RsvpForm onSuccess={handleSuccess} />
          </div>
        )}
      </div>
    </section>
  );
};

export const RsvpInline: React.FC<Props> = ({ data, instance }) => {
  const { rsvp, couple } = data;
  const { settings } = instance;
  const deadline = formatDeadline(rsvp.deadlineISO);
  const displayName = couple.displayName || couple.partner1Name + ' & ' + couple.partner2Name;
  const [submitted, setSubmitted] = useState(false);
  const [attending, setAttending] = useState(false);

  function handleSuccess(isAttending: boolean) {
    setAttending(isAttending);
    setSubmitted(true);
  }

  return (
    <section className="py-20 px-4 bg-primary">
      <div className="max-w-2xl mx-auto text-center">
        {settings.showTitle && (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-4 font-medium">You are invited</p>
            <h2 className="text-4xl md:text-5xl font-light text-white mb-3">{settings.title || 'RSVP'}</h2>
            <p className="text-white/80 mb-8">Join {displayName} to celebrate their special day</p>
          </>
        )}
        {deadline && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-8">
            <Calendar className="w-4 h-4" />
            Kindly respond by {deadline}
          </div>
        )}
        {submitted ? (
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <p className="text-white text-xl font-semibold mb-2">
              {attending ? "We'll see you there!" : "Sorry you can't make it"}
            </p>
            <p className="text-white/60 text-sm">Your RSVP has been recorded. Thank you!</p>
          </div>
        ) : (
          <div className="bg-white/10 rounded-2xl p-8">
            <RsvpForm onSuccess={handleSuccess} dark />
          </div>
        )}
      </div>
    </section>
  );
};
