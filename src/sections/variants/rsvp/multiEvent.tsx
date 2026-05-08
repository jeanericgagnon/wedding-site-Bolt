import React, { useState } from 'react';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { supabase } from '../../../lib/supabase';
import { getSafePublicImageUrl, getSafePublicWebUrl } from '../../publicLinks';
import { buildPublicAccessArtifacts } from '../../../lib/publicAccessArtifacts';

const RsvpEventSchema = z.object({
  id: z.string(),
  label: z.string().default(''),
  description: z.string().default(''),
  date: z.string().default(''),
  location: z.string().default(''),
});

export const rsvpMultiEventSchema = z.object({
  eyebrow: z.string().default('Kindly reply by'),
  title: z.string().default(''),
  headline: z.string().default('RSVP'),
  deadlineText: z.string().default(''),
  deadline: z.string().default(''),
  events: z.array(RsvpEventSchema).default([]),
  confirmationMessage: z.string().default('Thank you! We look forward to celebrating with you.'),
  declineMessage: z.string().default('We\'re sorry you can\'t make it. You\'ll be missed!'),
  guestNote: z.string().default(''),
  mode: z.enum(['form', 'embed']).default('form'),
  embedUrl: z.string().default(''),
  embedHeight: z.number().min(360).max(1400).default(760),
  layoutStyle: z.enum(['multiEvent', 'inline', 'card', 'illustrated', 'formal']).default('multiEvent'),
  imageUrl: z.string().default(''),
});

export type RsvpMultiEventData = z.infer<typeof rsvpMultiEventSchema>;

export const defaultRsvpMultiEventData: RsvpMultiEventData = {
  eyebrow: 'Kindly reply by',
  title: '',
  headline: 'RSVP',
  deadlineText: '',
  deadline: 'May 15, 2025',
  confirmationMessage: 'Thank you! We can\'t wait to celebrate with you.',
  declineMessage: 'We\'re sorry you can\'t make it. You\'ll be missed!',
  guestNote: 'If you have any dietary restrictions or accessibility needs, please let us know.',
  mode: 'form',
  embedUrl: '',
  embedHeight: 760,
  layoutStyle: 'multiEvent',
  imageUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1800&q=85',
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
  const headline = data.headline || data.title || 'RSVP';
  const deadline = data.deadline || data.deadlineText;
  const illustratedImageUrl = getSafePublicImageUrl(data.imageUrl);
  const safeEmbedUrl = getSafePublicWebUrl(data.embedUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || attending === null) return;

    setStatus('submitting');
    setErrorMsg('');

    try {
      const slug = siteSlug ?? '';
      const { inviteToken, passwordSession } = slug
        ? buildPublicAccessArtifacts(slug, new URLSearchParams(window.location.search))
        : { inviteToken: null, passwordSession: null };
      const { error } = await supabase.functions.invoke('public-site-rsvp-submit', {
        body: {
          slug,
          inviteToken,
          passwordSession,
          guestName: name,
          guestEmail: email || null,
          rsvpStatus: attending === 'yes' ? 'attending' : 'declined',
          guestCount: attending === 'yes' ? guestCount : 1,
          dietaryNotes: dietary || null,
        },
      });
      if (error) throw error;

      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again or contact us directly.');
    }
  };

  const useEmbed = data.mode === 'embed' && !!safeEmbedUrl;

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
    <section className={`relative overflow-hidden ${
      data.layoutStyle === 'illustrated'
        ? 'py-28 md:py-36 bg-stone-950'
        : data.layoutStyle === 'inline'
          ? 'py-16 md:py-20 bg-white'
          : data.layoutStyle === 'formal'
            ? 'py-28 md:py-36 bg-stone-50'
            : 'py-32 md:py-40 bg-gradient-to-b from-white to-stone-50/35'
    }`} id="rsvp">
      {data.layoutStyle === 'illustrated' && illustratedImageUrl && (
        <>
          <img src={illustratedImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/65 to-stone-950/35" />
        </>
      )}
      <div className={`relative mx-auto px-6 md:px-12 ${
        data.layoutStyle === 'inline'
          ? 'max-w-6xl grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 items-start'
          : data.layoutStyle === 'card'
            ? 'max-w-5xl grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 items-start'
            : 'max-w-2xl'
      }`}>
        <div className={`${
          data.layoutStyle === 'inline' || data.layoutStyle === 'card'
            ? 'text-left lg:sticky lg:top-8'
            : 'text-center mb-11 md:mb-12'
        } ${data.layoutStyle === 'formal' ? 'rounded-[2rem] border border-stone-200 bg-white p-7 md:p-9 shadow-sm mb-8' : ''}`}>
          {deadline && data.eyebrow && (
            <p className={`text-sm font-light mb-4 ${data.layoutStyle === 'illustrated' ? 'text-white/70' : 'text-stone-500'}`}>
              {data.eyebrow} <span className={data.layoutStyle === 'illustrated' ? 'text-white/80' : 'text-stone-600'}>{deadline}</span>
            </p>
          )}
          <h2 className={`text-4xl md:text-6xl font-light leading-[1.04] ${data.layoutStyle === 'illustrated' ? 'text-white' : 'text-stone-900'}`}>{data.layoutStyle === 'formal' ? 'The favour of your reply is requested' : headline}</h2>
          {data.layoutStyle === 'card' && (
            <div className="mt-8 space-y-3">
              {['Find your invitation', 'Choose each event', 'Share meal notes'].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-950 text-xs text-white">{index + 1}</span>
                  <span className="text-sm text-stone-600">{step}</span>
                </div>
              ))}
            </div>
          )}
          {data.layoutStyle === 'inline' && data.guestNote && (
            <p className="mt-5 text-stone-500 leading-relaxed">{data.guestNote}</p>
          )}
        </div>

        <div>
        {data.events.length > 1 && (
          <div className="mb-8 space-y-2">
            {data.events.map(event => (
              <div key={event.id} className="flex items-start gap-3 p-4 bg-stone-50 rounded-xl border border-stone-100 shadow-[0_4px_20px_-20px_rgba(28,25,23,0.5)]">
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
              src={safeEmbedUrl}
              title="RSVP form"
              className="w-full rounded-xl border border-stone-200 bg-white"
              style={{ height: `${data.embedHeight}px` }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <p className="text-xs text-stone-400">If the RSVP form does not appear, please refresh this page or reach out to the couple directly.</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className={`space-y-7 md:space-y-8 bg-white border ${
          data.layoutStyle === 'formal'
            ? 'border-stone-200 rounded-none p-7 md:p-10 shadow-sm outline outline-1 outline-offset-[-10px] outline-stone-200'
            : data.layoutStyle === 'illustrated'
              ? 'border-white/20 rounded-[1.85rem] p-6 md:p-9 shadow-2xl shadow-black/30'
              : 'border-stone-100 rounded-[1.85rem] p-6 md:p-9 shadow-sm md:shadow-xl md:shadow-stone-900/5'
        }`}>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">
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
            <label className="block text-sm font-medium text-stone-600 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all bg-stone-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-3">
              Will you be attending? <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['yes', 'no'] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAttending(option)}
                  className={`min-h-[46px] py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
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
                <label className="block text-sm font-medium text-stone-600 mb-2">
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
                <label className="block text-sm font-medium text-stone-600 mb-2">
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
            className="w-full min-h-[50px] py-4 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/20 focus-visible:ring-offset-2"
          >
            {status === 'submitting' && <Loader2 size={16} className="animate-spin" />}
            {status === 'submitting' ? 'Submitting…' : 'Send RSVP'}
          </button>
        </form>
        )}
        </div>
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

function rsvpVariant(variant: string, layoutStyle: RsvpMultiEventData['layoutStyle'], overrides: Partial<RsvpMultiEventData> = {}): SectionDefinition<RsvpMultiEventData> {
  return {
    type: 'rsvp',
    variant,
    schema: rsvpMultiEventSchema,
    defaultData: { ...defaultRsvpMultiEventData, layoutStyle, ...overrides },
    Component: RsvpMultiEvent,
  };
}

export const rsvpInlineDefinition = rsvpVariant('inline', 'inline');
export const rsvpCardDefinition = rsvpVariant('card', 'card');
export const rsvpIllustratedDefinition = rsvpVariant('illustrated', 'illustrated');
export const rsvpFormalDefinition = rsvpVariant('formal', 'formal', { guestNote: 'Kindly respond for each invited guest.' });
export const rsvpDefaultDefinition = rsvpVariant('default', 'multiEvent');
