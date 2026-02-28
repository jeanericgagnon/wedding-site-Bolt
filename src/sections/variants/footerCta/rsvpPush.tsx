import React from 'react';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

export const footerCtaRsvpPushSchema = z.object({
  background: z.enum(['dark', 'light', 'rose']).default('dark'),
  eyebrow: z.string().default(''),
  headline: z.string().default('We hope to see you there'),
  subtext: z.string().default(''),
  ctaLabel: z.string().default('RSVP Now'),
  ctaHref: z.string().default('#rsvp'),
  showDivider: z.boolean().default(true),
  footerNote: z.string().default(''),
  copyrightText: z.string().default(''),
  poweredByLabel: z.string().default(''),
});

export type FooterCtaRsvpPushData = z.infer<typeof footerCtaRsvpPushSchema>;

export const defaultFooterCtaRsvpPushData: FooterCtaRsvpPushData = {
  background: 'dark',
  eyebrow: '',
  headline: 'We hope to see you there',
  subtext: 'June 14, 2025 · The Grand Pavilion, New York',
  ctaLabel: 'RSVP Now',
  ctaHref: '#rsvp',
  showDivider: true,
  footerNote: 'Please RSVP by May 15th, 2025',
  copyrightText: 'Sarah & James · June 2025',
  poweredByLabel: '',
};

const FooterCtaRsvpPush: React.FC<SectionComponentProps<FooterCtaRsvpPushData>> = ({ data }) => {
  const bgClass = {
    dark: 'bg-stone-900',
    light: 'bg-stone-50',
    rose: 'bg-rose-900',
  }[data.background];

  const textClass = data.background === 'light' ? 'text-stone-900' : 'text-white';
  const mutedClass = data.background === 'light' ? 'text-stone-500' : 'text-white/50';
  const dividerClass = data.background === 'light' ? 'bg-stone-200' : 'bg-white/10';

  const ctaBtnClass = data.background === 'light'
    ? 'bg-stone-900 text-white hover:bg-stone-800'
    : 'bg-white text-stone-900 hover:bg-white/90';

  return (
    <section className={`py-28 md:py-36 ${bgClass}`} id="footer">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {data.eyebrow && (
          <p className={`text-xs uppercase tracking-[0.25em] font-medium mb-6 ${mutedClass}`}>
            {data.eyebrow}
          </p>
        )}

        <h2 className={`text-4xl md:text-7xl font-light leading-[1.02] tracking-tight mb-5 ${textClass}`}>
          {data.headline}
        </h2>

        {data.subtext && (
          <p className={`text-base md:text-lg font-light mb-11 ${mutedClass}`}>{data.subtext}</p>
        )}

        {data.ctaLabel && (
          <a
            href={data.ctaHref}
            className={`inline-flex items-center gap-2 px-9 py-4 text-sm font-semibold tracking-[0.18em] uppercase rounded-full transition-all hover:-translate-y-0.5 ${ctaBtnClass}`}
          >
            {data.ctaLabel}
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
