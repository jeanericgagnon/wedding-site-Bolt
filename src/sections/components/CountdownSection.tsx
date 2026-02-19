import React, { useState, useEffect } from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Clock } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(dateISO: string | undefined): TimeLeft | null {
  if (!dateISO) return null;
  const target = new Date(dateISO.includes('T') ? dateISO : dateISO + 'T12:00:00').getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export const CountdownSection: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(data.event.weddingDateISO));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(data.event.weddingDateISO));
    }, 1000);
    return () => clearInterval(interval);
  }, [data.event.weddingDateISO]);

  const displayName = data.couple.displayName || `${data.couple.partner1Name} & ${data.couple.partner2Name}`;

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-4xl mx-auto text-center">
        {settings.showTitle !== false && (
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">
              {settings.eyebrow || 'Counting down to'}
            </p>
            <h2 className="text-3xl font-light text-text-primary">
              {settings.title || displayName}
            </h2>
            <div className="w-10 h-px bg-primary mx-auto mt-5" />
          </div>
        )}
        {timeLeft ? (
          <div className="flex items-start justify-center gap-4 md:gap-10">
            {[
              { value: timeLeft.days, label: 'Days' },
              { value: timeLeft.hours, label: 'Hours' },
              { value: timeLeft.minutes, label: 'Minutes' },
              { value: timeLeft.seconds, label: 'Seconds' },
            ].map(({ value, label }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <span className="text-3xl md:text-5xl font-light text-text-tertiary mt-3 select-none">:</span>}
                <div className="flex flex-col items-center min-w-[64px] md:min-w-[96px]">
                  <span className="text-5xl md:text-7xl font-light tabular-nums text-text-primary leading-none">
                    {String(value).padStart(2, '0')}
                  </span>
                  <span className="text-xs uppercase tracking-[0.2em] text-text-tertiary mt-2 font-medium">
                    {label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        ) : data.event.weddingDateISO ? (
          <div className="py-8">
            <p className="text-2xl font-light text-primary">Today is the day!</p>
            <p className="text-text-secondary mt-2">Wishing {displayName} a beautiful wedding</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-text-tertiary">
            <Clock className="w-8 h-8" />
            <p className="text-sm">Set your wedding date to see the countdown</p>
          </div>
        )}
        {settings.message && (
          <p className="mt-10 text-text-secondary max-w-lg mx-auto text-base">
            {settings.message}
          </p>
        )}
      </div>
    </section>
  );
};

export const CountdownBanner: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(data.event.weddingDateISO));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(data.event.weddingDateISO));
    }, 1000);
    return () => clearInterval(interval);
  }, [data.event.weddingDateISO]);

  if (!timeLeft) return null;

  return (
    <section className="py-10 px-4 bg-primary text-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-1">
              {settings.eyebrow || 'Time remaining'}
            </p>
            <h2 className="text-xl font-medium text-white">
              {settings.title || 'Until the big day'}
            </h2>
          </div>
          <div className="flex items-center gap-6 md:gap-10">
            {[
              { value: timeLeft.days, label: 'Days' },
              { value: timeLeft.hours, label: 'Hrs' },
              { value: timeLeft.minutes, label: 'Min' },
              { value: timeLeft.seconds, label: 'Sec' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center min-w-[48px]">
                <div className="text-4xl font-light tabular-nums text-white leading-none">
                  {String(value).padStart(2, '0')}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-white/60 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
