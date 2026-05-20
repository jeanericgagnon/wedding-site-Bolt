import React, { useEffect, useId, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { readBuilderValue } from '../../lib/weddingProfile';
import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';
import { buildPublicAccessArtifacts } from '../../lib/publicAccessArtifacts';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function formatDeadline(iso: string | undefined): string | null {
  if (!iso) return null;
  const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function getSiteId(slug: string, searchParams: URLSearchParams): Promise<string | null> {
  if (!slug) return null;
  const { inviteToken, passwordSession } = buildPublicAccessArtifacts(slug, searchParams);
  const { data, error } = await supabase.functions.invoke('public-site-access', {
    body: {
      action: 'resolve',
      slug,
      inviteToken,
      passwordSession,
    },
  });

  if (error || data?.status !== 'open' || typeof data?.site?.id !== 'string') return null;
  return data.site.id;
}

interface FormState {
  guestName: string;
  attending: 'attending' | 'declined';
  guestCount: number;
  dietaryNotes: string;
}

function RsvpForm({ onSuccess, dark, siteSlug, searchParams }: { onSuccess: (attending: boolean) => void; dark?: boolean; siteSlug: string; searchParams: URLSearchParams }) {
  const formId = useId();
  const [form, setForm] = useState<FormState>({
    guestName: '',
    attending: 'attending',
    guestCount: 1,
    dietaryNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBase = dark
    ? 'w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/40'
    : 'w-full px-4 py-2 rounded-xl border border-border bg-surface text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/40';
  const labelBase = dark ? 'block text-sm font-medium text-white/80 mb-1' : 'block text-sm font-medium text-text-primary mb-1';

  const updateForm = (patch: Partial<FormState>) => {
    setError(null);
    setForm((current) => ({ ...current, ...patch }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const siteId = await getSiteId(siteSlug, searchParams);
      if (!siteId) {
        setError('Unable to find this wedding website right now. Please try again.');
        setSubmitting(false);
        return;
      }
      const { inviteToken, passwordSession } = buildPublicAccessArtifacts(siteSlug, searchParams);
      const { error: submitError } = await supabase.functions.invoke('public-site-rsvp-submit', {
        body: {
          slug: siteSlug,
          inviteToken,
          passwordSession,
          guestName: form.guestName,
          rsvpStatus: form.attending,
          guestCount: form.attending === 'attending' ? form.guestCount : 1,
          dietaryNotes: form.dietaryNotes || null,
        },
      });
      if (submitError) {
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
        <label htmlFor={`${formId}-guest-name`} className={labelBase}>Your name</label>
        <input
          id={`${formId}-guest-name`}
          type="text"
          required
          value={form.guestName}
          onChange={e => updateForm({ guestName: e.target.value })}
          placeholder="Your name"
          className={inputBase}
        />
      </div>
      <div>
        <label htmlFor={`${formId}-attending`} className={labelBase}>Will you be joining us?</label>
        <select
          id={`${formId}-attending`}
          value={form.attending}
          onChange={e => updateForm({ attending: e.target.value as 'attending' | 'declined' })}
          className={inputBase}
        >
          <option value="attending">Yes, I’ll be there</option>
          <option value="declined">Sorry, I can’t make it</option>
        </select>
      </div>
      {form.attending === 'attending' && (
        <div>
          <label htmlFor={`${formId}-guest-count`} className={labelBase}>Number of guests</label>
          <input
            id={`${formId}-guest-count`}
            type="number"
            min={1}
            max={10}
            value={form.guestCount}
            onChange={e => updateForm({ guestCount: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
            className={inputBase}
          />
        </div>
      )}
      <div>
        <label htmlFor={`${formId}-dietary-notes`} className={labelBase}>Dietary notes <span className={dark ? 'text-white/40' : 'text-text-secondary'}>(optional)</span></label>
        <textarea
          id={`${formId}-dietary-notes`}
          value={form.dietaryNotes}
          onChange={e => updateForm({ dietaryNotes: e.target.value })}
          placeholder="Any dietary restrictions or allergies we should know about?"
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
            ? 'w-full py-3.5 rounded-xl bg-white text-primary font-semibold text-base hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed'
            : 'w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-hover transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed'
        }
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            Sending…
          </span>
          ) : 'Send RSVP'}
      </button>
    </form>
  );
}

export const RsvpSection: React.FC<Props> = ({ data, instance }) => {
  const location = useLocation();
  const { rsvp } = data;
  const { settings } = instance;
  const siteSlug = useMemo(() => location.pathname.split('/site/')[1] ?? '', [location.pathname]);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const deadline = formatDeadline(rsvp.deadlineISO);
  const sectionTitle = readBuilderValue(settings.title as string | { value: string } | undefined, 'RSVP').trim() || 'RSVP';
  const [submitted, setSubmitted] = useState(false);
  const [attending, setAttending] = useState(false);

  useEffect(() => {
    setSubmitted(false);
    setAttending(false);
  }, [siteSlug, searchParams.toString(), sectionTitle, deadline]);

  function handleSuccess(isAttending: boolean) {
    setAttending(isAttending);
    setSubmitted(true);
  }

  return (
    <section className="py-16 md:py-20 px-4 bg-surface-subtle">
      <div className="max-w-lg mx-auto text-center">
        {settings.showTitle !== false && (
          <>
            <p className="text-sm text-primary/80 mb-3 font-light">Kindly reply</p>
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-4 leading-tight">{sectionTitle}</h2>
          </>
        )}
        {deadline && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/8 border border-primary/20 rounded-full text-sm font-medium text-primary mb-8">
            <Calendar className="w-4 h-4" />
            Kindly respond by {deadline}
          </div>
        )}
        {!deadline && <div className="mb-8" />}
        {submitted ? (
          <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-text-primary mb-2">
              {attending ? "We can’t wait to celebrate with you" : "Thank you for letting us know"}
            </p>
            <p className="text-text-secondary text-sm">Your reply has been saved.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-sm">
            <RsvpForm onSuccess={handleSuccess} siteSlug={siteSlug} searchParams={searchParams} />
          </div>
        )}
      </div>
    </section>
  );
};

export const RsvpInline: React.FC<Props> = ({ data, instance }) => {
  const location = useLocation();
  const { rsvp, couple } = data;
  const { settings } = instance;
  const siteSlug = useMemo(() => location.pathname.split('/site/')[1] ?? '', [location.pathname]);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const deadline = formatDeadline(rsvp.deadlineISO);
  const sectionTitle = readBuilderValue(settings.title as string | { value: string } | undefined, 'RSVP').trim() || 'RSVP';
  const displayName = couple.displayName || buildCoupleDisplayName(couple.partner1Name, couple.partner2Name) || 'the couple';
  const [submitted, setSubmitted] = useState(false);
  const [attending, setAttending] = useState(false);

  useEffect(() => {
    setSubmitted(false);
    setAttending(false);
  }, [siteSlug, searchParams.toString(), sectionTitle, deadline, displayName]);

  function handleSuccess(isAttending: boolean) {
    setAttending(isAttending);
    setSubmitted(true);
  }

  return (
    <section className="py-16 md:py-20 px-4 bg-primary">
      <div className="max-w-2xl mx-auto text-center">
        {settings.showTitle !== false && (
          <>
            <p className="text-sm text-white/65 mb-4 font-light">You’re invited</p>
            <h2 className="text-3xl md:text-5xl font-light text-white mb-3 leading-tight">{sectionTitle}</h2>
            <p className="text-white/80 mb-8">Join {displayName} in celebrating their wedding</p>
          </>
        )}
        {deadline && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-8">
            <Calendar className="w-4 h-4" />
            Kindly respond by {deadline}
          </div>
        )}
        {submitted ? (
          <div className="bg-white/10 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-white text-xl font-semibold mb-2">
              {attending ? "We'll see you there!" : "Sorry you can't make it"}
            </p>
            <p className="text-white/60 text-sm">Your RSVP has been recorded. Thank you!</p>
          </div>
        ) : (
          <div className="bg-white/10 rounded-2xl p-6 md:p-8">
            <RsvpForm onSuccess={handleSuccess} dark siteSlug={siteSlug} searchParams={searchParams} />
          </div>
        )}
      </div>
    </section>
  );
};
