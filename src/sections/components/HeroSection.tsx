import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const HeroSection: React.FC<Props> = ({ data }) => {
  const { couple, event, media } = data;
  const displayName = couple.displayName || `${couple.partner1Name} & ${couple.partner2Name}`;
  const date = event.weddingDateISO ? new Date(event.weddingDateISO).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Date TBD';

  return (
    <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
      {media.heroImageUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={media.heroImageUrl}
            alt="Hero"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
      )}
      <div className="relative z-10 text-center px-4">
        <h1 className="text-5xl md:text-7xl font-bold text-text-primary mb-4">
          {displayName}
        </h1>
        <p className="text-xl md:text-2xl text-text-secondary">
          {date}
        </p>
      </div>
    </section>
  );
};
