import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Calendar } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const RsvpSection: React.FC<Props> = ({ data, instance }) => {
  const { rsvp } = data;
  const { settings } = instance;

  const deadline = rsvp.deadlineISO ? new Date(rsvp.deadlineISO).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : null;

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-2xl mx-auto text-center">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary mb-8">
            {settings.title || 'RSVP'}
          </h2>
        )}
        {deadline && (
          <p className="text-text-secondary mb-8 flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5" />
            Please RSVP by {deadline}
          </p>
        )}
        <p className="text-text-secondary">
          RSVP functionality coming soon
        </p>
      </div>
    </section>
  );
};
