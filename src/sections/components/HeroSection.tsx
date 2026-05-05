import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { readBuilderValue } from '../../lib/weddingProfile';
import { getSectionPrimaryImage } from '../../lib/sectionMedia';
import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';
import { getSafePublicImageUrl } from '../publicLinks';

const DEFAULT_HERO_IMAGE = '/preview-photos/header-anchor.jpg';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return 'Date TBD';
  const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Date TBD';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getHeroDisplayName(
  headline: string | { value: string } | undefined,
  couple: WeddingDataV1['couple']
): string {
  return readBuilderValue(headline, '')
    || couple.displayName
    || buildCoupleDisplayName(couple.partner1Name, couple.partner2Name)
    || 'The couple';
}

function normalizeHeroImageOpacity(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.45;
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0.18, Math.min(1, normalized));
}

export const HeroSection: React.FC<Props> = ({ data, instance }) => {
  const { couple, event, media } = data;
  const { settings } = instance;
  const displayName = getHeroDisplayName(settings.headline as string | { value: string } | undefined, couple);
  const date = formatDate(event.weddingDateISO);
  const bgImage = getSafePublicImageUrl(getSectionPrimaryImage(settings as Record<string, unknown>, media.heroImageUrl || DEFAULT_HERO_IMAGE));
  const opacity = normalizeHeroImageOpacity(settings.overlayOpacity);
  const eyebrowClass = bgImage ? 'text-white/75' : 'text-text-secondary';
  const headlineClass = bgImage ? 'text-white' : 'text-text-primary';
  const subheadlineClass = bgImage ? 'text-white/80' : 'text-text-secondary';
  const dividerClass = bgImage ? 'bg-white/55' : 'bg-primary';

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
          <p className={`text-sm mb-6 font-light ${eyebrowClass}`}>
            {readBuilderValue(settings.title as string | { value: string } | undefined, 'We are getting married')}
          </p>
        )}
        <h1 className={`text-5xl md:text-7xl font-bold mb-6 leading-tight drop-shadow-[0_8px_28px_rgba(0,0,0,0.35)] ${headlineClass}`}>
          {displayName}
        </h1>
        <div className={`w-16 h-px mx-auto mb-6 ${dividerClass}`} />
        <p className={`text-xl md:text-2xl ${subheadlineClass}`}>
          {readBuilderValue(settings.subtitle as string | { value: string } | undefined, date)}
        </p>
      </div>
    </section>
  );
};

export const HeroMinimal: React.FC<Props> = ({ data, instance }) => {
  const { couple, event, media } = data;
  const { settings } = instance;
  const displayName = getHeroDisplayName(settings.headline as string | { value: string } | undefined, couple);
  const date = formatDate(event.weddingDateISO);
  const bgImage = getSafePublicImageUrl(getSectionPrimaryImage(settings as Record<string, unknown>, media.heroImageUrl || DEFAULT_HERO_IMAGE));
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
            <p className={"text-sm font-light mb-3 " + (hasImage ? "text-white/75" : "text-text-secondary")}>
              {readBuilderValue(settings.title as string | { value: string } | undefined, 'We are getting married')}
            </p>
          )}
          <h1 className={"text-6xl md:text-8xl font-light mb-3 " + (hasImage ? "text-white" : "text-text-primary")}>
            {displayName}
          </h1>
          <p className={"text-lg md:text-xl font-light " + (hasImage ? "text-white/80" : "text-text-secondary")}>
            {readBuilderValue(settings.subtitle as string | { value: string } | undefined, date)}
          </p>
        </div>
      </div>
    </section>
  );
};

export const HeroFullbleed: React.FC<Props> = ({ data, instance }) => {
  const { couple, event, media } = data;
  const { settings } = instance;
  const displayName = getHeroDisplayName(settings.headline as string | { value: string } | undefined, couple);
  const date = formatDate(event.weddingDateISO);
  const bgImage = getSafePublicImageUrl(getSectionPrimaryImage(settings as Record<string, unknown>, media.heroImageUrl || DEFAULT_HERO_IMAGE));

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
        <p className="text-sm text-white/75 mb-8 font-light">
          {readBuilderValue(settings.subtitle as string | { value: string } | undefined, date)}
        </p>
        <h1 className="text-6xl md:text-9xl font-light text-white leading-none mb-8">
          {displayName}
        </h1>
        {settings.showTitle !== false && (
          <div className="flex items-center justify-center gap-6">
            <div className="h-px w-12 bg-white/50" />
            <p className="text-sm text-white/75 font-light">
              {readBuilderValue(settings.title as string | { value: string } | undefined, 'Celebrate with us')}
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
  const displayName = getHeroDisplayName(settings.headline as string | { value: string } | undefined, couple);
  const date = formatDate(event.weddingDateISO);
  const bgImage = getSafePublicImageUrl(getSectionPrimaryImage(settings as Record<string, unknown>, media.heroImageUrl || DEFAULT_HERO_IMAGE));
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
          <p className="text-sm text-white/75 mb-5 font-light">
            {readBuilderValue(settings.title as string | { value: string } | undefined, 'Save the date')}
          </p>
        )}
        <h1 className="text-5xl md:text-8xl font-light text-white leading-tight mb-4">{displayName}</h1>
        <p className="text-base md:text-xl text-white/80 mb-8">{readBuilderValue(settings.subtitle as string | { value: string } | undefined, date)}</p>

        {countdown && (
          <div className="inline-flex items-center gap-4 md:gap-8 px-6 py-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
            <div>
              <p className="text-3xl md:text-4xl font-semibold text-white leading-none">{countdown.days}</p>
              <p className="text-xs text-white/75 mt-1">Days</p>
            </div>
            <div className="w-px h-10 bg-white/30" />
            <div>
              <p className="text-3xl md:text-4xl font-semibold text-white leading-none">{countdown.hours}</p>
              <p className="text-xs text-white/75 mt-1">Hours</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
