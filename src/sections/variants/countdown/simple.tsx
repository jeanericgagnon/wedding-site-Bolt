import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { getSafePublicImageUrl } from '../../publicLinks';

export const countdownSimpleSchema = z.object({
  eyebrow: z.string().default('Counting down to'),
  headline: z.string().default(''),
  targetDate: z.string().default(''),
  message: z.string().default(''),
  messageAfter: z.string().default('Today is the day!'),
  showSeconds: z.boolean().default(true),
  background: z.enum(['white', 'dark', 'soft']).default('soft'),
  layoutStyle: z.enum(['simple', 'banner', 'rings', 'minimal', 'dark', 'photo', 'progress', 'floating']).default('simple'),
  imageUrl: z.string().default(''),
});

export type CountdownSimpleData = z.infer<typeof countdownSimpleSchema>;

export const defaultCountdownSimpleData: CountdownSimpleData = {
  eyebrow: 'Counting down to',
  headline: 'Kara & Eric',
  targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  message: '',
  messageAfter: 'Today is the day!',
  showSeconds: true,
  background: 'soft',
  layoutStyle: 'simple',
  imageUrl: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1800&q=85',
};

function useCountdown(targetDate: string) {
  const getTime = () => {
    const target = new Date(targetDate + 'T00:00:00').getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    return {
      done: false,
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [time, setTime] = useState(getTime);
  useEffect(() => {
    setTime(getTime());
    const id = setInterval(() => setTime(getTime()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return time;
}

const CountdownSimple: React.FC<SectionComponentProps<CountdownSimpleData>> = ({ data }) => {
  const time = useCountdown(data.targetDate);
  const doneMessage = data.messageAfter || data.message || 'Today is the day!';
  const imageUrl = getSafePublicImageUrl(data.imageUrl);

  const bgClass = {
    white: 'bg-white',
    dark: 'bg-stone-900',
    soft: 'bg-stone-50',
  }[data.background];

  const textClass = data.background === 'dark' ? 'text-white' : 'text-stone-900';
  const mutedClass = data.background === 'dark' ? 'text-white/50' : 'text-stone-400';
  const dividerClass = data.background === 'dark' ? 'bg-white/10' : 'bg-stone-200';

  const units = [
    { value: time.days, label: 'Days' },
    { value: time.hours, label: 'Hours' },
    { value: time.minutes, label: 'Minutes' },
    ...(data.showSeconds ? [{ value: time.seconds, label: 'Seconds' }] : []),
  ];

  const totalDays = (() => {
    const target = new Date(`${data.targetDate}T00:00:00`).getTime();
    if (!Number.isFinite(target)) return 0;
    const defaultStart = target - 365 * 24 * 60 * 60 * 1000;
    const elapsed = Math.max(0, Date.now() - defaultStart);
    const total = Math.max(1, target - defaultStart);
    return Math.min(100, Math.round((elapsed / total) * 100));
  })();

  if (data.layoutStyle === 'banner') {
    return (
      <section className="py-10 bg-stone-950 text-white" id="countdown">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              {data.eyebrow && <p className="text-sm text-white/55 mb-2">{data.eyebrow}</p>}
              <h2 className="text-2xl md:text-3xl font-light">{data.headline}</h2>
            </div>
            {time.done ? (
              <p className="text-2xl font-light">{doneMessage}</p>
            ) : (
              <div className="grid grid-cols-4 gap-3 md:gap-4">
                {units.map((unit) => (
                  <div key={unit.label} className="min-w-[66px] rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-center">
                    <p className="text-2xl md:text-3xl font-light tabular-nums">{String(unit.value).padStart(2, '0')}</p>
                    <p className="mt-1 text-[11px] text-white/55">{unit.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'rings') {
    return (
      <section className="py-28 md:py-36 bg-white" id="countdown">
        <div className="max-w-5xl mx-auto px-6 text-center">
          {data.eyebrow && <p className="text-sm text-stone-500 font-medium mb-4">{data.eyebrow}</p>}
          {data.headline && <h2 className="text-4xl md:text-6xl font-light text-stone-900 mb-14">{data.headline}</h2>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {units.map((unit, index) => (
              <div key={unit.label} className="relative aspect-square rounded-full border border-stone-200 bg-stone-50 flex flex-col items-center justify-center shadow-sm">
                <div
                  className="absolute inset-2 rounded-full"
                  style={{ background: `conic-gradient(#0f172a ${Math.max(8, Math.min(100, unit.label === 'Days' ? totalDays : (unit.value / (unit.label === 'Hours' ? 24 : 60)) * 100))}%, rgba(15,23,42,0.08) 0)` }}
                />
                <div className="relative w-[calc(100%-1.4rem)] h-[calc(100%-1.4rem)] rounded-full bg-white flex flex-col items-center justify-center">
                  <p className="text-4xl md:text-5xl font-light tabular-nums text-stone-950">{String(unit.value).padStart(2, '0')}</p>
                  <p className="text-xs text-stone-500 mt-2">{unit.label}</p>
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border border-stone-200 text-[10px] text-stone-400 flex items-center justify-center">{index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'minimal') {
    return (
      <section className="py-24 md:py-32 bg-white" id="countdown">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[clamp(7rem,18vw,15rem)] leading-none font-light text-stone-950 tabular-nums">{time.days}</p>
          <p className="mt-4 text-sm text-stone-500">{time.done ? doneMessage : 'days until we celebrate'}</p>
          {data.headline && <h2 className="mt-8 text-3xl md:text-5xl font-light text-stone-900">{data.headline}</h2>}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'dark') {
    return (
      <section className="relative overflow-hidden py-28 md:py-36 bg-stone-950 text-white" id="countdown">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(244,63,94,0.24),transparent_45%)]" />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          {data.eyebrow && <p className="text-sm text-white/55 font-medium mb-4">{data.eyebrow}</p>}
          {data.headline && <h2 className="text-4xl md:text-6xl font-light mb-14">{data.headline}</h2>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {units.map((unit) => (
              <div key={unit.label} className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 md:p-8 shadow-2xl shadow-black/25">
                <p className="text-5xl md:text-7xl font-light tabular-nums">{String(unit.value).padStart(2, '0')}</p>
                <p className="mt-3 text-xs text-white/55">{unit.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'photo') {
    return (
      <section className="relative min-h-[520px] py-24 flex items-center overflow-hidden bg-stone-900" id="countdown">
        {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-65" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
        <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
          <div className="rounded-[2rem] border border-white/20 bg-white/12 backdrop-blur-md p-7 md:p-10 shadow-2xl">
            {data.eyebrow && <p className="text-sm text-white/70 font-medium mb-4">{data.eyebrow}</p>}
            {data.headline && <h2 className="text-4xl md:text-6xl font-light mb-10">{data.headline}</h2>}
            <div className="grid grid-cols-4 gap-2 md:gap-4">
              {units.map((unit) => (
                <div key={unit.label}>
                  <p className="text-3xl md:text-6xl font-light tabular-nums">{String(unit.value).padStart(2, '0')}</p>
                  <p className="mt-2 text-[10px] md:text-xs text-white/60">{unit.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'progress') {
    return (
      <section className="py-24 md:py-32 bg-stone-50" id="countdown">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-7 md:p-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
              <div>
                {data.eyebrow && <p className="text-sm text-stone-500 font-medium mb-3">{data.eyebrow}</p>}
                {data.headline && <h2 className="text-3xl md:text-5xl font-light text-stone-900">{data.headline}</h2>}
              </div>
              <p className="text-5xl md:text-6xl font-light tabular-nums text-stone-950">{time.days}<span className="ml-2 text-base text-stone-400">days</span></p>
            </div>
            <div className="h-3 rounded-full bg-stone-100 overflow-hidden">
              <div className="h-full rounded-full bg-stone-950 transition-all duration-700" style={{ width: `${totalDays}%` }} />
            </div>
            <div className="mt-4 flex justify-between text-xs text-stone-500">
              <span>Engaged</span>
              <span>{totalDays}% there</span>
              <span>Wedding day</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'floating') {
    return (
      <section className="py-28 md:py-36 bg-gradient-to-br from-white via-rose-50/40 to-stone-100" id="countdown">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative rounded-[2.5rem] border border-white bg-white/70 p-8 md:p-12 shadow-2xl shadow-stone-900/10 overflow-hidden">
            <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-rose-100/70 blur-3xl" />
            <div className="relative grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
              <div>
                {data.eyebrow && <p className="text-sm text-rose-500 font-medium mb-4">{data.eyebrow}</p>}
                {data.headline && <h2 className="text-4xl md:text-6xl font-light text-stone-950">{data.headline}</h2>}
                <p className="mt-5 text-stone-500">The little numbers are getting very real.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {units.map((unit, index) => (
                  <div key={unit.label} className={`rounded-[1.5rem] bg-white p-5 text-center shadow-lg shadow-stone-900/5 ${index % 2 ? 'md:translate-y-5' : ''}`}>
                    <p className="text-4xl md:text-5xl font-light tabular-nums text-stone-950">{String(unit.value).padStart(2, '0')}</p>
                    <p className="mt-2 text-xs text-stone-500">{unit.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`py-28 md:py-36 ${bgClass}`} id="countdown">
      <div className="max-w-5xl mx-auto px-6 text-center">
        {data.eyebrow && (
          <p className={`text-sm font-medium mb-4 ${mutedClass}`}>
            {data.eyebrow}
          </p>
        )}
        {data.headline && (
          <h2 className={`text-4xl md:text-6xl font-light mb-14 ${textClass}`}>{data.headline}</h2>
        )}

        {time.done ? (
          <p className={`text-3xl font-light ${textClass}`}>{doneMessage}</p>
        ) : (
          <div className="flex items-start justify-center gap-4 md:gap-10">
            {units.map((unit, idx) => (
              <React.Fragment key={unit.label}>
                {idx > 0 && (
                  <div className={`text-4xl md:text-6xl font-light mt-2 ${mutedClass}`}>:</div>
                )}
                <div className="flex flex-col items-center gap-2">
                  <div className={`text-5xl md:text-7xl lg:text-8xl font-light tabular-nums leading-none ${textClass}`}>
                    {String(unit.value).padStart(2, '0')}
                  </div>
                  <p className={`text-xs ${mutedClass}`}>{unit.label}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {!time.done && (
          <div className={`w-24 h-px mx-auto mt-12 ${dividerClass}`} />
        )}
      </div>
    </section>
  );
};

export const countdownSimpleDefinition: SectionDefinition<CountdownSimpleData> = {
  type: 'countdown',
  variant: 'simple',
  schema: countdownSimpleSchema,
  defaultData: defaultCountdownSimpleData,
  Component: CountdownSimple,
};

function countdownVariant(variant: string, layoutStyle: CountdownSimpleData['layoutStyle'], overrides: Partial<CountdownSimpleData> = {}): SectionDefinition<CountdownSimpleData> {
  return {
    type: 'countdown',
    variant,
    schema: countdownSimpleSchema,
    defaultData: { ...defaultCountdownSimpleData, layoutStyle, ...overrides },
    Component: CountdownSimple,
  };
}

export const countdownBannerDefinition = countdownVariant('banner', 'banner', { background: 'dark' });
export const countdownRingsDefinition = countdownVariant('rings', 'rings', { background: 'white' });
export const countdownMinimalDefinition = countdownVariant('minimal', 'minimal', { showSeconds: false, background: 'white' });
export const countdownDarkDefinition = countdownVariant('dark', 'dark', { background: 'dark' });
export const countdownPhotoDefinition = countdownVariant('photo', 'photo');
export const countdownProgressDefinition = countdownVariant('progress', 'progress', { showSeconds: false });
export const countdownFloatingDefinition = countdownVariant('floating', 'floating');
