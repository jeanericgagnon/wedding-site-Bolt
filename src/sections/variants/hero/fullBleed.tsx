import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps, parseSectionData } from '../../types';

export const heroFullBleedSchema = z.object({
  headline: z.string().default(''),
  subheadline: z.string().default(''),
  eyebrow: z.string().default(''),
  backgroundImage: z.string().default(''),
  overlayOpacity: z.number().min(0).max(100).default(45),
  textAlign: z.enum(['left', 'center', 'right']).default('center'),
  ctaLabel: z.string().default(''),
  ctaHref: z.string().default('#rsvp'),
  showDivider: z.boolean().default(true),
});

export type HeroFullBleedData = z.infer<typeof heroFullBleedSchema>;

export const defaultHeroFullBleedData: HeroFullBleedData = {
  headline: 'Sarah & James',
  subheadline: 'June 14, 2025 · The Grand Pavilion, New York',
  eyebrow: 'We are getting married',
  backgroundImage: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1920',
  overlayOpacity: 45,
  textAlign: 'center',
  ctaLabel: 'RSVP Now',
  ctaHref: '#rsvp',
  showDivider: true,
};

const HeroFullBleed: React.FC<SectionComponentProps<HeroFullBleedData>> = ({ data }) => {
  const opacity = data.overlayOpacity / 100;
  const alignClass = data.textAlign === 'left' ? 'text-left items-start' : data.textAlign === 'right' ? 'text-right items-end' : 'text-center items-center';

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden isolate" id="hero">
      {data.backgroundImage ? (
        <>
          <img
            src={data.backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity }}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700" aria-hidden="true" />
      )}

      <div className={`relative z-10 flex flex-col ${alignClass} px-6 md:px-12 max-w-5xl mx-auto w-full py-28 md:py-32`}>
        {data.eyebrow && (
          <p className="text-[11px] md:text-xs uppercase tracking-[0.38em] text-white/65 mb-7 font-medium">
            {data.eyebrow}
          </p>
        )}

        {data.showDivider && (
          <div className={`flex mb-8 ${data.textAlign === 'center' ? 'justify-center' : data.textAlign === 'right' ? 'justify-end' : ''}`}>
            <div className="w-20 h-px bg-white/45" />
          </div>
        )}

        <h1 className="text-5xl md:text-8xl lg:text-9xl font-light text-white tracking-[-0.03em] leading-[0.92] mb-7 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
          {data.headline}
        </h1>

        {data.subheadline && (
          <p className="text-base md:text-xl text-white/80 font-light tracking-[0.02em] mt-1 max-w-2xl leading-relaxed">
            {data.subheadline}
          </p>
        )}

        {data.ctaLabel && (
          <div className="mt-10">
            <a
              href={data.ctaHref}
              className="inline-flex items-center gap-2 px-9 py-3.5 bg-white text-stone-900 text-sm font-semibold tracking-[0.18em] uppercase hover:bg-white/90 hover:-translate-y-0.5 transition-all rounded-full shadow-lg shadow-black/20"
            >
              {data.ctaLabel}
            </a>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-60">
        <div className="w-px h-12 bg-white/50" />
        <p className="text-white/50 text-xs uppercase tracking-widest">Scroll</p>
      </div>
    </section>
  );
};

export const heroFullBleedDefinition: SectionDefinition<HeroFullBleedData> = {
  type: 'hero',
  variant: 'fullBleed',
  schema: heroFullBleedSchema,
  defaultData: defaultHeroFullBleedData,
  Component: HeroFullBleed,
};
