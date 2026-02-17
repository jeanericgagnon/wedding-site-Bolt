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
  const displayName = couple.displayName || couple.partner1Name + ' & ' + couple.partner2Name;
  const date = formatDate(event.weddingDateISO);

  return (
    <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
      {media.heroImageUrl && (
        <div className="absolute inset-0 z-0">
          <img src={media.heroImageUrl} alt="Hero" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        </div>
      )}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {settings.showTitle !== false && (
          <p className="text-sm uppercase tracking-[0.25em] text-text-secondary mb-6 font-medium">
            {settings.title || 'We are getting married'}
          </p>
        )}
        <h1 className="text-5xl md:text-7xl font-bold text-text-primary mb-6 leading-tight">
          {displayName}
        </h1>
        <div className="w-16 h-px bg-primary mx-auto mb-6" />
        <p className="text-xl md:text-2xl text-text-secondary">{date}</p>
      </div>
    </section>
  );
};

export const HeroMinimal: React.FC<Props> = ({ data, instance }) => {
  const { couple, event, media } = data;
  const { settings } = instance;
  const displayName = couple.displayName || couple.partner1Name + ' & ' + couple.partner2Name;
  const date = formatDate(event.weddingDateISO);
  const hasImage = !!media.heroImageUrl;

  return (
    <section className="relative min-h-[70vh] flex items-end pb-16 bg-background">
      {hasImage && (
        <div className="absolute inset-0 z-0">
          <img src={media.heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      )}
      <div className="relative z-10 w-full px-8 md:px-16">
        <div className="max-w-6xl mx-auto">
          {settings.showTitle !== false && (
            <p className={"text-sm uppercase tracking-[0.25em] font-medium mb-3 " + (hasImage ? "text-white/70" : "text-text-secondary")}>
              {settings.title || 'We are getting married'}
            </p>
          )}
          <h1
            className={"text-6xl md:text-8xl font-light tracking-tight mb-3 " + (hasImage ? "text-white" : "text-text-primary")}
          >
            {displayName}
          </h1>
          <p className={"text-lg md:text-xl font-light " + (hasImage ? "text-white/80" : "text-text-secondary")}>
            {date}
          </p>
        </div>
      </div>
    </section>
  );
};

export const HeroFullbleed: React.FC<Props> = ({ data, instance }) => {
  const { couple, event, media } = data;
  const { settings } = instance;
  const displayName = couple.displayName || couple.partner1Name + ' & ' + couple.partner2Name;
  const date = formatDate(event.weddingDateISO);

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-neutral-900">
      {media.heroImageUrl ? (
        <div className="absolute inset-0 z-0">
          <img src={media.heroImageUrl} alt="Hero" className="w-full h-full object-cover opacity-60" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/60" />
      )}
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 text-center px-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/70 mb-8 font-medium">{date}</p>
        <h1 className="text-6xl md:text-9xl font-light tracking-tight text-white leading-none mb-8">
          {displayName}
        </h1>
        {settings.showTitle !== false && (
          <div className="flex items-center justify-center gap-6">
            <div className="h-px w-12 bg-white/50" />
            <p className="text-sm tracking-widest text-white/70 uppercase font-medium">{settings.title || 'Join us'}</p>
            <div className="h-px w-12 bg-white/50" />
          </div>
        )}
      </div>
    </section>
  );
};
