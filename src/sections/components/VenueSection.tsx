import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { MapPin, ExternalLink } from 'lucide-react';

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
            <h2 className="text-4xl font-bold text-text-primary mb-8">{settings.title || 'Venue'}</h2>
          )}
          <p className="text-text-secondary">Venue details will appear here once added</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary text-center mb-12">{settings.title || 'Venue'}</h2>
        )}
        <div className="space-y-8">
          {venuesToShow.map(venue => (
            <div key={venue.id} className="bg-surface p-6 rounded-lg shadow-sm">
              <h3 className="text-2xl font-semibold text-text-primary mb-2">{venue.name || 'Venue Name TBD'}</h3>
              {venue.address && (
                <p className="text-text-secondary flex items-start gap-2">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{venue.address}</span>
                </p>
              )}
              {venue.notes && <p className="text-text-secondary mt-4">{venue.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const VenueCard: React.FC<Props> = ({ data, instance }) => {
  const { venues } = data;
  const { settings, bindings } = instance;
  const venuesToShow = bindings.venueIds && bindings.venueIds.length > 0
    ? venues.filter(v => bindings.venueIds!.includes(v.id))
    : venues;

  if (venuesToShow.length === 0) {
    return (
      <section className="py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-light text-text-primary mb-8">{settings.title || 'Venue'}</h2>
          )}
          <p className="text-text-secondary">Venue details will appear here once added</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-background">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">Where to find us</p>
            <h2 className="text-4xl font-light text-text-primary">{settings.title || 'Venue'}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {venuesToShow.map(venue => (
            <div
              key={venue.id}
              className="group border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="aspect-video bg-surface-subtle relative overflow-hidden flex items-center justify-center">
                <MapPin className="w-12 h-12 text-primary/30" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-3">{venue.name || 'Venue TBD'}</h3>
                {venue.address && (
                  <p className="text-text-secondary flex items-start gap-2 mb-4">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
                    <span className="text-sm">{venue.address}</span>
                  </p>
                )}
                {venue.notes && <p className="text-sm text-text-secondary mb-4">{venue.notes}</p>}
                {venue.address && (
                  <a
                    href={"https://maps.google.com/?q=" + encodeURIComponent(venue.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    View on map
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
