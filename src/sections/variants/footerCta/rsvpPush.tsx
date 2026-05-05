import React from 'react';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { getSafePublicActionHref, getSafePublicImageUrl, getSafePublicInstagramHashtagUrl } from '../../publicLinks';

export const footerCtaRsvpPushSchema = z.object({
  background: z.enum(['dark', 'light', 'rose']).default('dark'),
  eyebrow: z.string().default(''),
  headline: z.string().default('We hope to see you there'),
  subtext: z.string().default(''),
  ctaLabel: z.string().default('Send RSVP'),
  ctaHref: z.string().default('#rsvp'),
  buttonLabel: z.string().default(''),
  rsvpUrl: z.string().default(''),
  showDivider: z.boolean().default(true),
  footerNote: z.string().default(''),
  copyrightText: z.string().default(''),
  poweredByLabel: z.string().default(''),
  layoutStyle: z.enum(['bold', 'minimal', 'monogram', 'hashtag', 'photo', 'countdown']).default('bold'),
  monogram: z.string().default('K & E'),
  hashtag: z.string().default('#KaraAndEric'),
  photoUrl: z.string().default(''),
});

export type FooterCtaRsvpPushData = z.infer<typeof footerCtaRsvpPushSchema>;

export const defaultFooterCtaRsvpPushData: FooterCtaRsvpPushData = {
  background: 'dark',
  eyebrow: '',
  headline: 'We hope to see you there',
  subtext: 'June 14, 2025 · The Grand Pavilion, New York',
  ctaLabel: 'Send RSVP',
  ctaHref: '#rsvp',
  buttonLabel: '',
  rsvpUrl: '',
  showDivider: true,
  footerNote: 'Please RSVP by May 15th, 2025',
  copyrightText: 'Kara & Eric · January 2027',
  poweredByLabel: '',
  layoutStyle: 'bold',
  monogram: 'K & E',
  hashtag: '#KaraAndEric',
  photoUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1800&q=85',
};

const FooterCtaRsvpPush: React.FC<SectionComponentProps<FooterCtaRsvpPushData>> = ({ data }) => {
  const ctaLabel = data.ctaLabel || data.buttonLabel;
  const ctaHref = getSafePublicActionHref(data.ctaHref) || getSafePublicActionHref(data.rsvpUrl) || '#rsvp';
  const bgClass = {
    dark: 'bg-stone-900',
    light: 'bg-stone-50',
    rose: 'bg-rose-900',
  }[data.background];

  const textClass = data.background === 'light' ? 'text-stone-900' : 'text-white';
  const mutedClass = data.background === 'light' ? 'text-stone-500' : 'text-white/50';
  const dividerClass = data.background === 'light' ? 'bg-stone-200' : 'bg-white/10';
  const safeHashtagUrl = getSafePublicInstagramHashtagUrl(data.hashtag);
  const safePhotoUrl = getSafePublicImageUrl(data.photoUrl);

  const ctaBtnClass = data.background === 'light'
    ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg shadow-stone-900/10'
    : 'bg-white text-stone-900 hover:bg-white/90 shadow-xl shadow-black/25';

  if (data.layoutStyle === 'minimal') {
    return (
      <section className="py-20 md:py-24 bg-white" id="footer">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-light text-stone-950">{data.headline}</h2>
          {data.subtext && <p className="mt-4 text-stone-500">{data.subtext}</p>}
          {ctaLabel && (
            <a href={ctaHref} className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-stone-200 px-8 text-sm font-semibold text-stone-900 hover:bg-stone-50">
              {ctaLabel}
              <ArrowRight size={14} />
            </a>
          )}
          {data.footerNote && <p className="mt-6 text-xs text-stone-400">{data.footerNote}</p>}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'monogram') {
    return (
      <section className="py-24 md:py-32 bg-stone-50" id="footer">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full border border-stone-200 bg-white text-3xl font-light italic text-stone-950 shadow-sm">
            {data.monogram}
          </div>
          <h2 className="text-4xl md:text-6xl font-light text-stone-950">{data.headline}</h2>
          {data.subtext && <p className="mt-4 text-stone-500">{data.subtext}</p>}
          {ctaLabel && (
            <a href={ctaHref} className="mt-8 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-stone-950 px-9 text-sm font-semibold text-white hover:bg-stone-800">
              {ctaLabel}
              <ArrowRight size={14} />
            </a>
          )}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'hashtag') {
    return (
      <section className="py-24 md:py-32 bg-white" id="footer">
        <div className="max-w-5xl mx-auto px-6 text-center">
          {data.eyebrow && <p className="text-sm text-stone-500 mb-4">{data.eyebrow}</p>}
          <p className="text-[clamp(3rem,9vw,8rem)] leading-none font-light text-stone-950">{data.hashtag}</p>
          {data.subtext && <p className="mt-6 text-stone-500">{data.subtext}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {ctaLabel && <a href={ctaHref} className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-stone-950 px-8 text-sm font-semibold text-white">{ctaLabel}</a>}
            {safeHashtagUrl && <a href={safeHashtagUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-stone-200 px-8 text-sm font-semibold text-stone-900">See hashtag</a>}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'photo') {
    return (
      <section className="relative min-h-[560px] flex items-end overflow-hidden bg-stone-950" id="footer">
        {safePhotoUrl && <img src={safePhotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
        <div className="relative max-w-5xl mx-auto w-full px-6 py-16 text-center text-white">
          {data.eyebrow && <p className="text-sm text-white/65 mb-4">{data.eyebrow}</p>}
          <h2 className="text-4xl md:text-7xl font-light">{data.headline}</h2>
          {data.subtext && <p className="mt-5 text-white/70">{data.subtext}</p>}
          {ctaLabel && <a href={ctaHref} className="mt-8 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-white px-9 text-sm font-semibold text-stone-950">{ctaLabel}<ArrowRight size={14} /></a>}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'countdown') {
    return (
      <section className="py-24 md:py-32 bg-stone-950 text-white" id="footer">
        <div className="max-w-5xl mx-auto px-6 text-center">
          {data.eyebrow && <p className="text-sm text-white/55 mb-4">{data.eyebrow}</p>}
          <h2 className="text-4xl md:text-6xl font-light">{data.headline}</h2>
          {data.footerNote && <p className="mt-5 text-white/60">{data.footerNote}</p>}
          <div className="mt-9 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            {['RSVP', 'Pack', 'Celebrate'].map((label, index) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-5">
                <p className="text-3xl font-light">{String(index + 1).padStart(2, '0')}</p>
                <p className="mt-2 text-xs text-white/50">{label}</p>
              </div>
            ))}
          </div>
          {ctaLabel && <a href={ctaHref} className="mt-9 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-white px-9 text-sm font-semibold text-stone-950">{ctaLabel}<ArrowRight size={14} /></a>}
        </div>
      </section>
    );
  }

  return (
    <section className={`py-32 md:py-40 ${bgClass}`} id="footer">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {data.eyebrow && (
          <p className={`text-sm font-light mb-5 md:mb-6 ${mutedClass}`}>
            {data.eyebrow}
          </p>
        )}

        <h2 className={`text-4xl md:text-7xl font-light leading-[1.03] mb-5 text-balance ${textClass}`}>
          {data.headline}
        </h2>

        {data.subtext && (
          <p className={`text-base md:text-lg font-light mb-10 md:mb-11 max-w-2xl mx-auto leading-relaxed ${mutedClass}`}>{data.subtext}</p>
        )}

        {ctaLabel && (
          <a
            href={ctaHref}
            className={`inline-flex items-center justify-center gap-2.5 min-h-[50px] px-9 md:px-10 py-4 text-sm font-semibold rounded-full transition-all hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60 ${ctaBtnClass}`}
          >
            {ctaLabel}
            <ArrowRight size={14} />
          </a>
        )}

        {data.footerNote && (
          <p className={`text-xs mt-6 ${mutedClass}`}>{data.footerNote}</p>
        )}

        {data.showDivider && (
          <div className={`w-24 h-px mx-auto my-12 ${dividerClass}`} />
        )}

        <div className="space-y-1.5">
          {data.copyrightText && (
            <p className={`text-xs ${mutedClass}`}>{data.copyrightText}</p>
          )}
          {data.poweredByLabel && (
            <p className={`text-xs ${mutedClass}`}>{data.poweredByLabel}</p>
          )}
        </div>
      </div>
    </section>
  );
};

export const footerCtaRsvpPushDefinition: SectionDefinition<FooterCtaRsvpPushData> = {
  type: 'footerCta',
  variant: 'rsvpPush',
  schema: footerCtaRsvpPushSchema,
  defaultData: defaultFooterCtaRsvpPushData,
  Component: FooterCtaRsvpPush,
};

function footerCtaVariant(variant: string, layoutStyle: FooterCtaRsvpPushData['layoutStyle'], overrides: Partial<FooterCtaRsvpPushData> = {}): SectionDefinition<FooterCtaRsvpPushData> {
  return {
    type: 'footerCta',
    variant,
    schema: footerCtaRsvpPushSchema,
    defaultData: { ...defaultFooterCtaRsvpPushData, layoutStyle, ...overrides },
    Component: FooterCtaRsvpPush,
  };
}

export const footerCtaMinimalDefinition = footerCtaVariant('minimal', 'minimal', { background: 'light' });
export const footerCtaMonogramDefinition = footerCtaVariant('monogram', 'monogram', { background: 'light' });
export const footerCtaHashtagDefinition = footerCtaVariant('hashtag', 'hashtag', { background: 'light' });
export const footerCtaPhotoDefinition = footerCtaVariant('photo', 'photo');
export const footerCtaCountdownDefinition = footerCtaVariant('countdown', 'countdown', { background: 'dark' });
export const footerCtaDefaultDefinition = footerCtaVariant('default', 'bold');
