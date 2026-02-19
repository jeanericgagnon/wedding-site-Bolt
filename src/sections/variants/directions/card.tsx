import React from 'react';
import { z } from 'zod';
import { MapPin, Car, Navigation, ExternalLink, Phone } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

export const directionsCardSchema = z.object({
  eyebrow: z.string().default('Find Us'),
  headline: z.string().default('Location & Directions'),
  venueName: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default(''),
  phone: z.string().default(''),
  mapUrl: z.string().default(''),
  parkingNote: z.string().default(''),
  rideshareNote: z.string().default(''),
  background: z.enum(['white', 'soft']).default('white'),
});

export type DirectionsCardData = z.infer<typeof directionsCardSchema>;

export const defaultDirectionsCardData: DirectionsCardData = {
  eyebrow: 'Find Us',
  headline: 'Location & Directions',
  venueName: 'The Grand Ballroom',
  address: '123 Celebration Lane',
  city: 'San Francisco, CA 94102',
  phone: '(415) 555-0123',
  mapUrl: '',
  parkingNote: 'Complimentary valet available at the main entrance.',
  rideshareNote: 'Uber and Lyft drop-off at the north entrance.',
  background: 'white',
};

const DirectionsCard: React.FC<SectionComponentProps<DirectionsCardData>> = ({ data }) => {
  const mapsQuery = [data.venueName, data.address, data.city].filter(Boolean).join(', ');
  const mapsHref = data.mapUrl || (mapsQuery ? `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}` : '');
  const bg = data.background === 'soft' ? 'bg-stone-50' : 'bg-white';

  return (
    <section className={`py-24 md:py-32 ${bg}`} id="directions">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900">{data.headline}</h2>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-stone-100">
          {mapsHref && (
            <div className="aspect-[2/1] bg-stone-100 relative">
              <iframe
                title="Venue map"
                width="100%"
                height="100%"
                className="border-0 w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`}
              />
            </div>
          )}

          <div className="p-8 md:p-10">
            <div className="flex items-start gap-4 mb-8 pb-8 border-b border-stone-100">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <MapPin size={20} className="text-rose-500" />
              </div>
              <div className="flex-1">
                {data.venueName && <p className="font-semibold text-stone-900 text-lg mb-1">{data.venueName}</p>}
                {data.address && <p className="text-stone-600">{data.address}</p>}
                {data.city && <p className="text-stone-600">{data.city}</p>}
                {data.phone && (
                  <a href={`tel:${data.phone}`} className="inline-flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 mt-2 transition-colors">
                    <Phone size={12} />
                    {data.phone}
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {data.parkingNote && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                    <Car size={14} className="text-stone-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Parking</p>
                    <p className="text-stone-600 text-sm leading-relaxed">{data.parkingNote}</p>
                  </div>
                </div>
              )}

              {data.rideshareNote && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                    <Navigation size={14} className="text-stone-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Rideshare</p>
                    <p className="text-stone-600 text-sm leading-relaxed">{data.rideshareNote}</p>
                  </div>
                </div>
              )}
            </div>

            {mapsHref && (
              <div className="mt-8 pt-8 border-t border-stone-100">
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Get Directions
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export const directionsCardDefinition: SectionDefinition<DirectionsCardData> = {
  type: 'directions',
  variant: 'card',
  schema: directionsCardSchema,
  defaultData: defaultDirectionsCardData,
  Component: DirectionsCard,
};
