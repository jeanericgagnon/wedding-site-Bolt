import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const TravelSection: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto text-center">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary mb-8">
            {settings.title || 'Travel & Accommodations'}
          </h2>
        )}
        <p className="text-text-secondary">
          Travel and accommodation information coming soon
        </p>
      </div>
    </section>
  );
};
