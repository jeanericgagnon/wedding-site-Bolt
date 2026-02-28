import React, { useState } from 'react';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { supabase } from '../../../lib/supabase';

const RsvpEventSchema = z.object({
  id: z.string(),
  label: z.string().default(''),
  description: z.string().default(''),
  date: z.string().default(''),
  location: z.string().default(''),
});

export const rsvpMultiEventSchema = z.object({
  eyebrow: z.string().default('Kindly reply by'),
  headline: z.string().default('RSVP'),
  deadline: z.string().default(''),
  events: z.array(RsvpEventSchema).default([]),
  confirmationMessage: z.string().default('Thank you! We look forward to celebrating with you.'),
  declineMessage: z.string().default('We\'re sorry you can\'t make it. You\'ll be missed!'),
  guestNote: z.string().default(''),
  mode: z.enum(['form', 'embed']).default('form'),
  embedUrl: z.string().default(''),
  embedHeight: z.number().min(360).max(1400).default(760),
});

export type RsvpMultiEventData = z.infer<typeof rsvpMultiEventSchema>;

export const defaultRsvpMultiEventData: RsvpMultiEventData = {
  eyebrow: 'Kindly reply by',
  headline: 'RSVP',
  deadline: 'May 15, 2025',
  confirmationMessage: 'Thank you! We can\'t wait to celebrate with you.',
  declineMessage: 'We\'re sorry you can\'t make it. You\'ll be missed!',
  guestNote: 'If you have any dietary restrictions or accessibility needs, please let us know.',
  mode: 'form',
  embedUrl: '',
  embedHeight: 760,
  events: [
    {
      id: '1',
      label: 'Ceremony & Reception',
      description: '',
      date: 'Saturday, June 14, 2025',
      location: 'The Grand Pavilion',
    },
  ],
};

type RsvpStatus = 'idle' | 'submitting' | 'success' | 'error';

const RsvpMultiEvent: React.FC<SectionComponentProps<RsvpMultiEventData>> = ({ data, siteSlug }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [attending, setAttending] = useState<'yes' | 'no' | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [dietary, setDietary] = useState('');
  const [status, setStatus] = useState<RsvpStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || attending === null) return;

    setStatus('submitting');
    setErrorMsg('');

    try {
      let siteId: string | null = null;

      if (siteSlug) {
        const { data: siteData } = await supabase
          .from('wedding_sites')
          .select('id')
          .eq('site_slug', siteSlug)
          .maybeSingle();
        siteId = siteData?.id ?? null;
      }

      const rsvpData = {
        site_id: siteId,
        guest_name: name,
        guest_email: email || null,
        attending: attending === 'yes',
        guest_count: attending === 'yes' ? guestCount : 0,
        dietary_notes: dietary || null,
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('site_rsvps').insert(rsvpData);
      if (error) throw error;

      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again or contact us directly.');
    }
  };

  const useEmbed = data.mode === 'embed' && !!data.embedUrl?.trim();

  if (status === 'success') {
    const message = attending === 'yes' ? data.confirmationMessage : data.declineMessage;
    return (
      <section className="py-28 md:py-36 bg-gradient-to-b from-white to-stone-50/40" id="rsvp">
        <div className="max-w-lg mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={28} className="text-green-500" />
          </div>
          <h2 className="text-3xl font-light text-stone-900 mb-4">We got your RSVP!</h2>
          <p className="text-stone-500 font-light leading-relaxed">{message}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-28 md:py-36 bg-gradient-to-b from-white to-stone-50/40" id="rsvp">
      <div className="max-w-2xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          {data.deadline && data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow} <span className="text-stone-600">{data.deadline}</span>
            </p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 tracking-tight">{data.headline}</h2>
        </div>

        {data.events.length > 1 && (
          <div className="mb-8 space-y-2">
            {data.events.map(event => (
              <div key={event.id} className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-stone-800">{event.label}</p>
                  {event.date && <p className="text-xs text-stone-400 mt-0.5">{event.date}</p>}
                  {event.location && <p className="text-xs text-stone-400">{event.location}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {useEmbed ? (
          <div className="space-y-4">
            <iframe
              src={data.embedUrl}
              title="RSVP form"
              className="w-full rounded-xl border border-stone-200 bg-white"
              style={{ height: `${data.embedHeight}px` }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <p className="text-xs text-stone-400">Embedded RSVP is enabled for this section.</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-stone-100 rounded-[1.75rem] p-6 md:p-8 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Your full name"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all bg-stone-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all bg-stone-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              Will you be attending? <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['yes', 'no'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAttending(option)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    attending === option
                      ? option === 'yes'
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-stone-400 bg-stone-50 text-stone-700'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {option === 'yes' ? 'Joyfully accepts' : 'Regretfully declines'}
                </button>
              ))}
            </div>
          </div>

          {attending === 'yes' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Number of Guests
                </label>
                <select
                  value={guestCount}
                  onChange={e => setGuestCount(Number(e.target.value))}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all bg-stone-50 focus:bg-white appearance-none"
                >
                  {[1, 2, 3, 4].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Dietary Restrictions
                </label>
                <textarea
                  value={dietary}
                  onChange={e => setDietary(e.target.value)}
                  placeholder="Vegetarian, vegan, gluten-free, allergies..."
                  rows={3}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all resize-none bg-stone-50 focus:bg-white"
                />
              </div>
            </>
          )}

          {data.guestNote && (
            <p className="text-xs text-stone-400 leading-relaxed">{data.guestNote}</p>
          )}

          {status === 'error' && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === 'submitting' || !name || attending === null}
            className="w-full py-4 bg-stone-900 text-white text-sm font-medium uppercase tracking-widest rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {status === 'submitting' && <Loader2 size={16} className="animate-spin" />}
            {status === 'submitting' ? 'Submitting…' : 'Send RSVP'}
          </button>
        </form>
        )}
      </div>
    </section>
  );
};

export const rsvpMultiEventDefinition: SectionDefinition<RsvpMultiEventData> = {
  type: 'rsvp',
  variant: 'multiEvent',
  schema: rsvpMultiEventSchema,
  defaultData: defaultRsvpMultiEventData,
  Component: RsvpMultiEvent,
};
