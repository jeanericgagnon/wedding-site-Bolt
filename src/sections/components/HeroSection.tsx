import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return 'Date TBD';
  const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const HeroSection: React.FC<Props> = ({ data, instance }) => {
  const { couple, event, media } = data;
  const { settings } = instance;
  const displayName = (settings.headline as string) || couple.displayName || couple.partner1Name + ' & ' + couple.partner2Name;
  const date = formatDate(event.weddingDateISO);
  const bgImage = (settings.backgroundImage as string) || media.heroImageUrl || '';
  const opacity = typeof settings.overlayOpacity === 'number' ? settings.overlayOpacity / 100 : 0.3;

  return (
    <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="Hero" className="w-full h-full object-cover" style={{ opacity }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        </div>
      )}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <p className="text-sm uppercase tracking-[0.25em] text-text-secondary mb-6 font-medium">
            {(settings.title as string) || 'We are getting married'}
          </p>
        )}
        <h1 className="text-5xl md:text-7xl font-bold text-text-primary mb-6 leading-tight">
          {displayName}
        </h1>
        <div className="w-16 h-px bg-primary mx-auto mb-6" />
        <p className="text-xl md:text-2xl text-text-secondary">
          {(settings.subtitle as string) || date}
        </p>
      </div>
    </section>
  );
};

export const HeroMinimal: React.FC<Props> = ({ data, instance }) => {
  const { couple, event, media } = data;
  const { settings } = instance;
  const displayName = (settings.headline as string) || couple.displayName || couple.partner1Name + ' & ' + couple.partner2Name;
  const date = formatDate(event.weddingDateISO);
  const bgImage = (settings.backgroundImage as string) || media.heroImageUrl || '';
  const hasImage = !!bgImage;

  return (
    <section className="relative min-h-[70vh] flex items-end pb-16 bg-background">
      {hasImage && (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="Hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      )}
      <div className="relative z-10 w-full px-8 md:px-16">
        <div className="max-w-6xl mx-auto">
          {settings.showTitle !== false && (
            <p className={"text-sm uppercase tracking-[0.25em] font-medium mb-3 " + (hasImage ? "text-white/70" : "text-text-secondary")}>
              {(settings.title as string) || 'We are getting married'}
            </p>
          )}
          <h1 className={"text-6xl md:text-8xl font-light tracking-tight mb-3 " + (hasImage ? "text-white" : "text-text-primary")}>
            {displayName}
          </h1>
          <p className={"text-lg md:text-xl font-light " + (hasImage ? "text-white/80" : "text-text-secondary")}>
            {(settings.subtitle as string) || date}
          </p>
        </div>
      </div>
    </section>
  );
};

export const HeroFullbleed: React.FC<Props> = ({ data, instance }) => {
  const { couple, event, media } = data;
  const { settings } = instance;
  const displayName = (settings.headline as string) || couple.displayName || couple.partner1Name + ' & ' + couple.partner2Name;
  const date = formatDate(event.weddingDateISO);
  const bgImage = (settings.backgroundImage as string) || media.heroImageUrl || '';

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-neutral-900">
      {bgImage ? (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="Hero" className="w-full h-full object-cover opacity-60" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/60" />
      )}
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 text-center px-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/70 mb-8 font-medium">
          {(settings.subtitle as string) || date}
        </p>
        <h1 className="text-6xl md:text-9xl font-light tracking-tight text-white leading-none mb-8">
          {displayName}
        </h1>
        {settings.showTitle !== false && (
          <div className="flex items-center justify-center gap-6">
            <div className="h-px w-12 bg-white/50" />
            <p className="text-sm tracking-widest text-white/70 uppercase font-medium">
              {(settings.title as string) || 'Join us'}
            </p>
            <div className="h-px w-12 bg-white/50" />
          </div>
        )}
      </div>
    </section>
  );
};

function getCountdownParts(weddingDateISO?: string) {
  if (!weddingDateISO) return null;
  const target = new Date(weddingDateISO.includes('T') ? weddingDateISO : `${weddingDateISO}T12:00:00`);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (Number.isNaN(diff)) return null;

  const totalHours = Math.max(0, Math.floor(diff / 3_600_000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days, hours };
}

export const HeroCountdown: React.FC<Props> = ({ data, instance }) => {
  const { couple, event, media } = data;
  const { settings } = instance;
  const displayName = (settings.headline as string) || couple.displayName || `${couple.partner1Name} & ${couple.partner2Name}`;
  const date = formatDate(event.weddingDateISO);
  const bgImage = (settings.backgroundImage as string) || media.heroImageUrl || '';
  const countdown = getCountdownParts(event.weddingDateISO);

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-neutral-900">
      {bgImage ? (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt="Hero" className="w-full h-full object-cover opacity-65" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/70" />
      )}
      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {settings.showTitle !== false && (
          <p className="text-xs uppercase tracking-[0.35em] text-white/70 mb-5 font-medium">
            {(settings.title as string) || 'Save the date'}
          </p>
        )}
        <h1 className="text-5xl md:text-8xl font-light tracking-tight text-white leading-tight mb-4">{displayName}</h1>
        <p className="text-base md:text-xl text-white/80 mb-8">{(settings.subtitle as string) || date}</p>

        {countdown && (
          <div className="inline-flex items-center gap-4 md:gap-8 px-6 py-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
            <div>
              <p className="text-3xl md:text-4xl font-semibold text-white leading-none">{countdown.days}</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70 mt-1">Days</p>
            </div>
            <div className="w-px h-10 bg-white/30" />
            <div>
              <p className="text-3xl md:text-4xl font-semibold text-white leading-none">{countdown.hours}</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70 mt-1">Hours</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
