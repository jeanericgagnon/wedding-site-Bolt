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
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/55" aria-hidden="true" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-700" aria-hidden="true" />
      )}

      <div className={`relative z-10 flex flex-col ${alignClass} px-6 md:px-12 max-w-6xl mx-auto w-full py-28 md:py-36`}>
        <div className={`rounded-3xl px-2 md:px-4 ${data.textAlign === 'center' ? 'mx-auto' : ''}`}>
          {data.eyebrow && (
            <p className="text-[11px] md:text-xs uppercase tracking-[0.4em] text-white/70 mb-6 font-medium">
              {data.eyebrow}
            </p>
          )}

          {data.showDivider && (
            <div className={`flex mb-7 ${data.textAlign === 'center' ? 'justify-center' : data.textAlign === 'right' ? 'justify-end' : ''}`}>
              <div className="w-24 h-px bg-white/45" />
            </div>
          )}

          <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-light text-white tracking-[-0.035em] leading-[0.9] mb-6 text-balance drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
            {data.headline}
          </h1>

          {data.subheadline && (
            <p className="text-base md:text-xl text-white/85 font-light tracking-[0.01em] max-w-2xl leading-relaxed text-pretty">
              {data.subheadline}
            </p>
          )}

          {data.ctaLabel && (
            <div className="mt-10">
              <a
                href={data.ctaHref}
                className="inline-flex items-center gap-2.5 px-10 py-3.5 bg-white text-stone-900 text-sm font-semibold tracking-[0.16em] uppercase hover:bg-white/90 hover:-translate-y-0.5 transition-all rounded-full shadow-xl shadow-black/30"
              >
                {data.ctaLabel}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-65">
        <div className="w-px h-12 bg-white/50" />
        <p className="text-white/55 text-[11px] uppercase tracking-[0.2em]">Scroll</p>
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