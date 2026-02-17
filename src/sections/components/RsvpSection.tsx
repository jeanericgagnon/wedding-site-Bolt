import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Calendar, CheckCircle } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const RsvpSection: React.FC<Props> = ({ data, instance }) => {
  const { rsvp } = data;
  const { settings } = instance;
  const deadline = rsvp.deadlineISO ? new Date(rsvp.deadlineISO + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : null;

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-2xl mx-auto text-center">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary mb-8">{settings.title || 'RSVP'}</h2>
        )}
        {deadline && (
          <p className="text-text-secondary mb-8 flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5" />
            Please RSVP by {deadline}
          </p>
        )}
        <p className="text-text-secondary">RSVP functionality coming soon</p>
      </div>
    </section>
  );
};

export const RsvpInline: React.FC<Props> = ({ data, instance }) => {
  const { rsvp, couple } = data;
  const { settings } = instance;
  const deadline = rsvp.deadlineISO ? new Date(rsvp.deadlineISO + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : null;
  const displayName = couple.displayName || couple.partner1Name + ' & ' + couple.partner2Name;

  return (
    <section className="py-20 px-4 bg-primary">
      <div className="max-w-2xl mx-auto text-center">
        {settings.showTitle && (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 mb-4 font-medium">You are invited</p>
            <h2 className="text-4xl md:text-5xl font-light text-white mb-3">{settings.title || 'RSVP'}</h2>
            <p className="text-white/80 mb-8">Join {displayName} to celebrate their special day</p>
          </>
        )}
        {deadline && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm mb-8">
            <Calendar className="w-4 h-4" />
            Kindly respond by {deadline}
          </div>
        )}
        <div className="bg-white/10 rounded-2xl p-8 text-center">
          <CheckCircle className="w-10 h-10 text-white/50 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">RSVP Form</p>
          <p className="text-white/60 text-sm">Online RSVP coming soon. Check back closer to the date.</p>
        </div>
      </div>
    </section>
  );
};
