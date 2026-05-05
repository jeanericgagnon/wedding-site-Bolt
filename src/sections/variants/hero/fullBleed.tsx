import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps, parseSectionData } from '../../types';
import { getSafePublicActionHref, getSafePublicImageUrl } from '../../publicLinks';

export const heroFullBleedSchema = z.object({
  headline: z.string().default(''),
  subheadline: z.string().default(''),
  eyebrow: z.string().default(''),
  backgroundImage: z.string().default(''),
  secondaryImage: z.string().default(''),
  overlayOpacity: z.number().min(0).max(100).default(45),
  textAlign: z.enum(['left', 'center', 'right']).default('center'),
  layoutStyle: z.enum(['fullBleed', 'minimal', 'split', 'invitation', 'botanical', 'countdown', 'video']).default('fullBleed'),
  ctaLabel: z.string().default(''),
  ctaHref: z.string().default('#rsvp'),
  showDivider: z.boolean().default(true),
});

export type HeroFullBleedData = z.infer<typeof heroFullBleedSchema>;

export const defaultHeroFullBleedData: HeroFullBleedData = {
  headline: 'Kara & Eric',
  subheadline: 'June 14, 2025 · The Grand Pavilion, New York',
  eyebrow: 'We are getting married',
  backgroundImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2200&q=85',
  secondaryImage: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=1200&q=85',
  overlayOpacity: 45,
  textAlign: 'center',
  layoutStyle: 'fullBleed',
  ctaLabel: 'Send RSVP',
  ctaHref: '#rsvp',
  showDivider: true,
};

function getDaysUntilWedding(subheadline: string) {
  const match = subheadline.match(/([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!match) return null;
  const date = new Date(`${match[1]} ${match[2]}, ${match[3]} 12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  return days >= 0 ? days : null;
}

const HeroFullBleed: React.FC<SectionComponentProps<HeroFullBleedData>> = ({ data }) => {
  const opacity = data.overlayOpacity / 100;
  const alignClass = data.textAlign === 'left' ? 'text-left items-start' : data.textAlign === 'right' ? 'text-right items-end' : 'text-center items-center';
  const backgroundImage = getSafePublicImageUrl(data.backgroundImage);
  const ctaHref = getSafePublicActionHref(data.ctaHref, '#');

  if (data.layoutStyle === 'minimal') {
    return (
      <section className="relative min-h-[82vh] flex items-center overflow-hidden bg-[#fbfaf7]" id="hero">
        <div className="absolute inset-x-8 top-8 h-px bg-stone-200" />
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-28 text-center">
          {data.eyebrow && <p className="text-sm text-stone-500 mb-8">{data.eyebrow}</p>}
          <h1 className="text-6xl md:text-9xl font-light text-stone-950 leading-[0.92] text-balance">{data.headline}</h1>
          {data.subheadline && <p className="mt-8 text-lg md:text-2xl text-stone-500 font-light leading-relaxed">{data.subheadline}</p>}
          {data.ctaLabel && <a href={ctaHref} className="mt-10 inline-flex rounded-full border border-stone-300 px-8 py-3 text-sm font-medium text-stone-700 hover:bg-stone-950 hover:text-white transition-colors">{data.ctaLabel}</a>}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'split') {
    return (
      <section className="min-h-screen grid md:grid-cols-[0.95fr_1.05fr] bg-stone-950" id="hero">
        <div className="relative min-h-[56vh] md:min-h-screen overflow-hidden">
          {backgroundImage && <img src={backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <div className="flex items-center px-7 md:px-16 py-24 md:py-32 text-white">
          <div className="max-w-xl">
            {data.eyebrow && <p className="text-sm text-white/60 mb-7">{data.eyebrow}</p>}
            <h1 className="text-5xl md:text-8xl font-light leading-[0.96] text-balance">{data.headline}</h1>
            {data.subheadline && <p className="mt-7 text-lg text-white/70 leading-relaxed">{data.subheadline}</p>}
            {data.ctaLabel && <a href={ctaHref} className="mt-9 inline-flex rounded-full bg-white px-8 py-3 text-sm font-medium text-stone-950 hover:bg-white/85 transition-colors">{data.ctaLabel}</a>}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'invitation' || data.layoutStyle === 'botanical') {
    const isBotanical = data.layoutStyle === 'botanical';
    return (
      <section className={`relative min-h-screen flex items-center justify-center overflow-hidden px-5 py-20 ${isBotanical ? 'bg-[#eef3eb]' : 'bg-[#f8f2e9]'}`} id="hero">
        {backgroundImage && <img src={backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
        <div className="relative w-full max-w-3xl border border-stone-300/80 bg-white/82 backdrop-blur-sm px-7 py-14 md:px-16 md:py-20 text-center shadow-[0_35px_100px_-45px_rgba(0,0,0,0.45)]">
          {isBotanical && <div className="absolute inset-4 border border-emerald-800/15 rounded-[2rem]" />}
          <div className="relative">
            {data.eyebrow && <p className="text-sm text-stone-500 mb-8">{data.eyebrow}</p>}
            <h1 className="text-5xl md:text-8xl font-light text-stone-950 leading-[0.98]">{data.headline}</h1>
            {data.showDivider && <div className="mx-auto my-8 h-px w-28 bg-stone-300" />}
            {data.subheadline && <p className="mx-auto max-w-xl text-stone-600 text-lg leading-relaxed">{data.subheadline}</p>}
            {data.ctaLabel && <a href={ctaHref} className="mt-10 inline-flex rounded-full bg-stone-950 px-8 py-3 text-sm font-medium text-white hover:bg-stone-800">{data.ctaLabel}</a>}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'countdown') {
    const days = getDaysUntilWedding(data.subheadline);
    return (
      <section className="relative min-h-screen overflow-hidden bg-stone-950 text-white" id="hero">
        {backgroundImage && <img src={backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/45 to-transparent" />
        <div className="relative max-w-6xl mx-auto min-h-screen px-6 md:px-12 py-24 flex flex-col justify-end">
          {data.eyebrow && <p className="text-sm text-white/70 mb-5">{data.eyebrow}</p>}
          <h1 className="text-6xl md:text-9xl font-light leading-[0.94] max-w-4xl">{data.headline}</h1>
          <div className="mt-8 flex flex-col md:flex-row md:items-end gap-8 md:gap-14">
            {data.subheadline && <p className="max-w-2xl text-lg text-white/75 leading-relaxed">{data.subheadline}</p>}
            {days !== null && <div className="rounded-3xl border border-white/20 bg-white/10 px-7 py-5 backdrop-blur-md"><p className="text-5xl font-light">{days}</p><p className="text-xs text-white/60">days to go</p></div>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden isolate" id="hero">
      {backgroundImage ? (
        <>
          <img
            src={backgroundImage}
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

      <div className={`relative z-10 flex flex-col ${alignClass} px-6 md:px-12 max-w-6xl mx-auto w-full py-28 md:py-40`}>
        <div className={`rounded-3xl px-2 md:px-4 ${data.textAlign === 'center' ? 'mx-auto' : ''} max-w-4xl`}>
          {data.eyebrow && (
            <p className="text-sm md:text-base text-white/78 mb-5 font-light">
              {data.eyebrow}
            </p>
          )}

          {data.showDivider && (
            <div className={`flex mb-8 ${data.textAlign === 'center' ? 'justify-center' : data.textAlign === 'right' ? 'justify-end' : ''}`}>
              <div className="w-24 h-px bg-white/45" />
            </div>
          )}

          <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-light text-white leading-[0.94] mb-6 md:mb-7 text-balance drop-shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
            {data.headline}
          </h1>

          {data.subheadline && (
            <p className="text-base md:text-xl text-white/88 font-light max-w-2xl md:max-w-[46rem] leading-relaxed md:leading-[1.7] text-pretty">
              {data.subheadline}
            </p>
          )}

          {data.ctaLabel && (
            <div className="mt-9 md:mt-10">
              <a
                href={ctaHref}
                className="inline-flex items-center justify-center gap-2.5 min-h-[48px] px-9 md:px-10 py-3.5 bg-white text-stone-900 text-sm font-semibold hover:bg-white/90 hover:-translate-y-0.5 transition-all rounded-full shadow-xl shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/20"
              >
                {data.ctaLabel}
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-65">
        <div className="w-px h-12 bg-white/50" />
        <p className="text-white/60 text-xs">Scroll</p>
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

const makeHeroDefinition = (variant: string, overrides: Partial<HeroFullBleedData>): SectionDefinition<HeroFullBleedData> => ({
  type: 'hero',
  variant,
  schema: heroFullBleedSchema,
  defaultData: { ...defaultHeroFullBleedData, ...overrides },
  Component: HeroFullBleed,
});

export const heroMinimalDefinition = makeHeroDefinition('minimal', {
  layoutStyle: 'minimal',
  overlayOpacity: 0,
  backgroundImage: '',
  ctaLabel: 'RSVP',
});

export const heroSplitDefinition = makeHeroDefinition('split', {
  layoutStyle: 'split',
  textAlign: 'left',
  backgroundImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=85',
});

export const heroInvitationDefinition = makeHeroDefinition('invitation', {
  layoutStyle: 'invitation',
  backgroundImage: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1800&q=85',
  overlayOpacity: 0,
});

export const heroBotanicalDefinition = makeHeroDefinition('botanical', {
  layoutStyle: 'botanical',
  backgroundImage: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1800&q=85',
});

export const heroCountdownDefinition = makeHeroDefinition('countdown', {
  layoutStyle: 'countdown',
  textAlign: 'left',
  backgroundImage: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=2200&q=85',
});

export const heroVideoDefinition = makeHeroDefinition('video', {
  layoutStyle: 'fullBleed',
  backgroundImage: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=2200&q=85',
  overlayOpacity: 55,
});
