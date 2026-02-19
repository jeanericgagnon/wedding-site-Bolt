import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';

export const countdownSimpleSchema = z.object({
  eyebrow: z.string().default('Counting down to'),
  headline: z.string().default(''),
  targetDate: z.string().default(''),
  messageAfter: z.string().default('Today is the day!'),
  showSeconds: z.boolean().default(true),
  background: z.enum(['white', 'dark', 'soft']).default('soft'),
});

export type CountdownSimpleData = z.infer<typeof countdownSimpleSchema>;

export const defaultCountdownSimpleData: CountdownSimpleData = {
  eyebrow: 'Counting down to',
  headline: 'Sarah & James',
  targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  messageAfter: 'Today is the day!',
  showSeconds: true,
  background: 'soft',
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
    const id = setInterval(() => setTime(getTime()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return time;
}

const CountdownSimple: React.FC<SectionComponentProps<CountdownSimpleData>> = ({ data }) => {
  const time = useCountdown(data.targetDate);

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

  return (
    <section className={`py-20 md:py-28 ${bgClass}`} id="countdown">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {data.eyebrow && (
          <p className={`text-xs uppercase tracking-[0.25em] font-medium mb-4 ${mutedClass}`}>
            {data.eyebrow}
          </p>
        )}
        {data.headline && (
          <h2 className={`text-3xl md:text-4xl font-light mb-12 ${textClass}`}>{data.headline}</h2>
        )}

        {time.done ? (
          <p className={`text-3xl font-light ${textClass}`}>{data.messageAfter}</p>
        ) : (
          <div className="flex items-start justify-center gap-4 md:gap-8">
            {units.map((unit, idx) => (
              <React.Fragment key={unit.label}>
                {idx > 0 && (
                  <div className={`text-3xl md:text-5xl font-light mt-2 ${mutedClass}`}>:</div>
                )}
                <div className="flex flex-col items-center gap-2">
                  <div className={`text-5xl md:text-7xl font-light tabular-nums tracking-tight leading-none ${textClass}`}>
                    {String(unit.value).padStart(2, '0')}
                  </div>
                  <p className={`text-xs uppercase tracking-[0.2em] ${mutedClass}`}>{unit.label}</p>
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
