import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Car, Hotel, Plane } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const TravelSection: React.FC<Props> = ({ instance }) => {
  const { settings } = instance;

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto text-center">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary mb-8">
            {settings.title || 'Travel & Accommodations'}
          </h2>
        )}
        <p className="text-text-secondary">Travel and accommodation information coming soon</p>
      </div>
    </section>
  );
};

export const TravelCards: React.FC<Props> = ({ instance }) => {
  const { settings } = instance;

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">Plan your trip</p>
            <h2 className="text-4xl font-light text-text-primary">{settings.title || 'Travel & Accommodations'}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-8 rounded-2xl border border-border bg-surface-subtle">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Plane className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Getting Here</h3>
            <p className="text-sm text-text-secondary">Flight and transport information coming soon</p>
          </div>
          <div className="text-center p-8 rounded-2xl border border-border bg-surface-subtle">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Hotel className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Where to Stay</h3>
            <p className="text-sm text-text-secondary">Hotel recommendations coming soon</p>
          </div>
          <div className="text-center p-8 rounded-2xl border border-border bg-surface-subtle">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Parking</h3>
            <p className="text-sm text-text-secondary">Parking details coming soon</p>
          </div>
        </div>
      </div>
    </section>
  );
};
