import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Car, Hotel, Plane, MapPin, ExternalLink } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const TravelSection: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const { venues, travel } = data;
  const hasContent = venues.length > 0 || travel?.notes || travel?.flightInfo || travel?.hotelInfo || travel?.parkingInfo;

  return (
    <section className="py-16 px-4 bg-surface-subtle">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary mb-8 text-center">
            {settings.title || 'Travel & Accommodations'}
          </h2>
        )}
        {!hasContent ? (
          <div className="text-center">
            <p className="text-text-secondary">Travel and accommodation details will appear here once added.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {travel?.notes && (
              <p className="text-text-secondary text-center max-w-2xl mx-auto whitespace-pre-wrap">{travel.notes}</p>
            )}
            {venues.map(venue => (
              <div key={venue.id} className="border border-border rounded-xl p-6 bg-surface">
                {venue.name && (
                  <h3 className="text-lg font-semibold text-text-primary mb-2">{venue.name}</h3>
                )}
                {venue.address && (
                  <p className="text-text-secondary flex items-start gap-2 mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {venue.address}
                  </p>
                )}
                {venue.address && (
                  <a
                    href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(venue.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View on Google Maps
                  </a>
                )}
                {venue.notes && (
                  <p className="text-sm text-text-secondary mt-3">{venue.notes}</p>
                )}
              </div>
            ))}
            {(travel?.flightInfo || travel?.hotelInfo || travel?.parkingInfo) && (
              <div className="grid md:grid-cols-3 gap-4">
                {travel?.flightInfo && (
                  <div className="border border-border rounded-xl p-5 bg-surface">
                    <div className="flex items-center gap-2 mb-2">
                      <Plane className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-text-primary">Getting Here</h4>
                    </div>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{travel.flightInfo}</p>
                  </div>
                )}
                {travel?.hotelInfo && (
                  <div className="border border-border rounded-xl p-5 bg-surface">
                    <div className="flex items-center gap-2 mb-2">
                      <Hotel className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-text-primary">Where to Stay</h4>
                    </div>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{travel.hotelInfo}</p>
                  </div>
                )}
                {travel?.parkingInfo && (
                  <div className="border border-border rounded-xl p-5 bg-surface">
                    <div className="flex items-center gap-2 mb-2">
                      <Car className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-text-primary">Parking</h4>
                    </div>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">{travel.parkingInfo}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export const TravelCards: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const { venues, travel } = data;

  return (
    <section className="py-20 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">Plan your trip</p>
            <h2 className="text-4xl font-light text-text-primary">{settings.title || 'Travel & Accommodations'}</h2>
            {travel?.notes && <p className="text-text-secondary mt-4 max-w-xl mx-auto">{travel.notes}</p>}
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        {venues.length > 0 && (
          <div className="space-y-4 mb-10">
            {venues.map(venue => (
              <div key={venue.id} className="flex items-start gap-4 p-6 rounded-2xl border border-border bg-surface-subtle">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {venue.name && (
                    <h3 className="font-semibold text-text-primary mb-1">{venue.name}</h3>
                  )}
                  {venue.address && (
                    <p className="text-sm text-text-secondary mb-2">{venue.address}</p>
                  )}
                  {venue.address && (
                    <a
                      href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(venue.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on Google Maps
                    </a>
                  )}
                  {venue.notes && (
                    <p className="text-xs text-text-secondary mt-2">{venue.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-8 rounded-2xl border border-border bg-surface-subtle">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Plane className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Getting Here</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {travel?.flightInfo || 'Flight and transport details will appear here once added'}
            </p>
          </div>
          <div className="text-center p-8 rounded-2xl border border-border bg-surface-subtle">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Hotel className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Where to Stay</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {travel?.hotelInfo || 'Hotel recommendations will appear here once added'}
            </p>
          </div>
          <div className="text-center p-8 rounded-2xl border border-border bg-surface-subtle">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Parking</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {travel?.parkingInfo || 'Parking details will appear here once added'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export const TravelLocalGuide: React.FC<Props> = ({ data, instance }) => {
  const { settings } = instance;
  const { venues, travel } = data;

  const localTips = (travel?.notes || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">Plan your trip</p>
            <h2 className="text-4xl font-light text-text-primary">{settings.title || 'Travel & Local Guide'}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-text-primary mb-3">Getting here</h3>
            <div className="space-y-3 text-sm text-text-secondary">
              <p><span className="font-medium text-text-primary">Flights:</span> {travel?.flightInfo || 'Airport and transport details will appear here once added.'}</p>
              <p><span className="font-medium text-text-primary">Parking:</span> {travel?.parkingInfo || 'Parking details will appear here once added.'}</p>
              <p><span className="font-medium text-text-primary">Hotels:</span> {travel?.hotelInfo || 'Hotel recommendations will appear here once added.'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-text-primary mb-3">Local tips</h3>
            <ul className="space-y-2 text-sm text-text-secondary list-disc pl-5">
              {(localTips.length > 0
                ? localTips
                : [
                    'Book accommodation early for best rates.',
                    'Plan extra travel time around ceremony start.',
                    'Rideshare pickup points will be shared before the event.',
                    'Check weather and bring layers for evening events.',
                  ]).map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>

        {venues.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-text-primary mb-4">Key locations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.slice(0, 4).map((venue) => (
                <div key={venue.id} className="rounded-xl border border-border-subtle bg-surface-subtle p-4">
                  <p className="font-medium text-text-primary">{venue.name || 'Venue'}</p>
                  {venue.address && <p className="text-sm text-text-secondary mt-1">{venue.address}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
