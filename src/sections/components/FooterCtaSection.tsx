import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Heart } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const FooterCtaSection: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const displayName = data.couple.displayName || `${data.couple.partner1Name} & ${data.couple.partner2Name}`;
  const date = formatDate(data.event.weddingDateISO);
  const rsvpUrl = (settings.rsvpUrl as string) || '#rsvp';
  const buttonLabel = (settings.buttonLabel as string) || 'RSVP Now';
  const headline = (settings.headline as string) || `We hope to see you there`;
  const subtext = (settings.subtext as string) || (data.rsvp.deadlineISO ? `Please RSVP by ${formatDate(data.rsvp.deadlineISO)}` : 'Your presence means the world to us');

  return (
    <section className="relative py-24 px-4 bg-primary overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-8 left-8 w-32 h-32 rounded-full border border-white" />
        <div className="absolute bottom-8 right-8 w-48 h-48 rounded-full border border-white" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px w-10 bg-white/40" />
          <Heart className="w-5 h-5 text-white/60 fill-white/30" />
          <div className="h-px w-10 bg-white/40" />
        </div>

        <h2 className="text-4xl md:text-5xl font-light text-white mb-3 leading-tight">
          {displayName}
        </h2>
        {date && (
          <p className="text-white/70 text-sm uppercase tracking-[0.2em] mb-8">{date}</p>
        )}
        <p className="text-xl text-white/90 mb-3 font-light">{headline}</p>
        <p className="text-white/60 text-sm mb-10">{subtext}</p>

        {data.rsvp.enabled !== false && (
          <a
            href={rsvpUrl}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-semibold rounded-full hover:bg-white/90 transition-all hover:shadow-lg hover:-translate-y-0.5 text-sm tracking-wide"
          >
            {buttonLabel}
          </a>
        )}

        {settings.footerNote && (
          <p className="mt-10 text-xs text-white/40 italic">{settings.footerNote as string}</p>
        )}
      </div>
    </section>
  );
};

export const FooterCtaMinimal: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const displayName = data.couple.displayName || `${data.couple.partner1Name} & ${data.couple.partner2Name}`;
  const date = formatDate(data.event.weddingDateISO);
  const rsvpUrl = (settings.rsvpUrl as string) || '#rsvp';
  const buttonLabel = (settings.buttonLabel as string) || 'RSVP Now';
  const headline = (settings.headline as string) || `We can't wait to celebrate with you`;
  const subtext = (settings.subtext as string) || (data.rsvp.deadlineISO ? `RSVP deadline: ${formatDate(data.rsvp.deadlineISO)}` : '');

  return (
    <section className="py-20 px-4 bg-surface border-t border-border">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-10 h-px bg-primary mx-auto mb-8" />
        <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-4">{displayName}</p>
        {date && <p className="text-sm text-text-secondary mb-6">{date}</p>}
        <h2 className="text-3xl font-light text-text-primary mb-3">{headline}</h2>
        {subtext && <p className="text-text-secondary text-sm mb-8">{subtext}</p>}

        {data.rsvp.enabled !== false && (
          <a
            href={rsvpUrl}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-medium rounded-full hover:bg-primary/90 transition-all text-sm tracking-wide"
          >
            {buttonLabel}
          </a>
        )}

        <div className="mt-12 flex items-center justify-center gap-2 text-text-tertiary">
          <Heart className="w-3.5 h-3.5 fill-current" />
        </div>
      </div>
    </section>
  );
};
