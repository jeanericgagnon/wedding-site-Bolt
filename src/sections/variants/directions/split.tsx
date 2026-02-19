import React from 'react';
import { z } from 'zod';
import { MapPin, Car, Navigation, Train, ExternalLink, Clock } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

export const directionsSplitSchema = z.object({
  eyebrow: z.string().default('Find Us'),
  headline: z.string().default('How to Get Here'),
  venueName: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default(''),
  mapUrl: z.string().default(''),
  drivingTime: z.string().default(''),
  drivingTimeFrom: z.string().default('city center'),
  parkingNote: z.string().default(''),
  publicTransitNote: z.string().default(''),
  shuttleNote: z.string().default(''),
  background: z.enum(['white', 'soft']).default('soft'),
});

export type DirectionsSplitData = z.infer<typeof directionsSplitSchema>;

export const defaultDirectionsSplitData: DirectionsSplitData = {
  eyebrow: 'Find Us',
  headline: 'How to Get Here',
  venueName: 'The Grand Ballroom',
  address: '123 Celebration Lane',
  city: 'San Francisco, CA 94102',
  mapUrl: '',
  drivingTime: '25 min',
  drivingTimeFrom: 'downtown San Francisco',
  parkingNote: 'Complimentary valet at the main entrance. Self-parking also available.',
  publicTransitNote: 'BART to Civic Center, then a 10-minute walk north on Market Street.',
  shuttleNote: 'Shuttle service from the Marriott Union Square every 30 minutes, 4:00–6:30pm.',
  background: 'soft',
};

const DirectionsSplit: React.FC<SectionComponentProps<DirectionsSplitData>> = ({ data }) => {
  const mapsQuery = [data.venueName, data.address, data.city].filter(Boolean).join(', ');
  const mapsHref = data.mapUrl || (mapsQuery ? `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}` : '');
  const bg = data.background === 'soft' ? 'bg-stone-50' : 'bg-white';

  return (
    <section className={`${bg}`} id="directions">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
        <div className="py-20 px-8 md:px-16 flex flex-col justify-center">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-8">{data.headline}</h2>

          <div className="flex items-start gap-4 mb-8">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-rose-500" />
            </div>
            <div>
              {data.venueName && <p className="font-semibold text-stone-900">{data.venueName}</p>}
              {data.address && <p className="text-stone-600 text-sm mt-0.5">{data.address}</p>}
              {data.city && <p className="text-stone-600 text-sm">{data.city}</p>}
              {mapsHref && (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-rose-500 hover:text-rose-600 font-medium transition-colors"
                >
                  Get Directions <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          {data.drivingTime && (
            <div className="flex items-center gap-3 mb-6 py-3 border-y border-stone-200">
              <Clock size={14} className="text-stone-400" />
              <p className="text-stone-600 text-sm">
                About <strong className="text-stone-900">{data.drivingTime}</strong> from {data.drivingTimeFrom}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {data.parkingNote && (
              <div className="flex items-start gap-3">
                <Car size={14} className="text-stone-400 shrink-0 mt-1" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Parking</p>
                  <p className="text-stone-600 text-sm leading-relaxed">{data.parkingNote}</p>
                </div>
              </div>
            )}
            {data.publicTransitNote && (
              <div className="flex items-start gap-3">
                <Train size={14} className="text-stone-400 shrink-0 mt-1" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Public Transit</p>
                  <p className="text-stone-600 text-sm leading-relaxed">{data.publicTransitNote}</p>
                </div>
              </div>
            )}
            {data.shuttleNote && (
              <div className="flex items-start gap-3">
                <Navigation size={14} className="text-rose-400 shrink-0 mt-1" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">Shuttle Service</p>
                  <p className="text-stone-600 text-sm leading-relaxed">{data.shuttleNote}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative min-h-[400px] lg:min-h-0">
          {mapsHref ? (
            <iframe
              title="Venue map"
              width="100%"
              height="100%"
              className="border-0 w-full h-full absolute inset-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`}
            />
          ) : (
            <div className="w-full h-full bg-stone-200 flex flex-col items-center justify-center gap-3">
              <MapPin size={32} className="text-stone-400" />
              <p className="text-stone-500 text-sm">Add venue address to show map</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export const directionsSplitDefinition: SectionDefinition<DirectionsSplitData> = {
  type: 'directions',
  variant: 'split',
  schema: directionsSplitSchema,
  defaultData: defaultDirectionsSplitData,
  Component: DirectionsSplit,
};
