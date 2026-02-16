import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { MapPin } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const VenueSection: React.FC<Props> = ({ data, instance }) => {
  const { venues } = data;
  const { settings, bindings } = instance;
  
  const venuesToShow = bindings.venueIds && bindings.venueIds.length > 0
    ? venues.filter(v => bindings.venueIds!.includes(v.id))
    : venues;

  if (venuesToShow.length === 0) {
    return (
      <section className="py-16 px-4 bg-surface-subtle">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-bold text-text-primary mb-8">
              {settings.title || 'Venue'}
            </h2>
          )}
          <p className="text-text-secondary">Venue details coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary text-center mb-12">
            {settings.title || 'Venue'}
          </h2>
        )}
        <div className="space-y-8">
          {venuesToShow.map(venue => (
            <div key={venue.id} className="bg-surface p-6 rounded-lg shadow-sm">
              <h3 className="text-2xl font-semibold text-text-primary mb-2">
                {venue.name || 'Venue Name TBD'}
              </h3>
              {venue.address && (
                <p className="text-text-secondary flex items-start gap-2">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{venue.address}</span>
                </p>
              )}
              {venue.notes && (
                <p className="text-text-secondary mt-4">{venue.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
