import React from 'react';
import { z } from 'zod';
import { MapPin, Navigation, Car, Train, ExternalLink } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const TransportOptionSchema = z.object({
  id: z.string(),
  icon: z.enum(['car', 'train', 'other']).default('car'),
  label: z.string().default(''),
  description: z.string().default(''),
});

export const directionsPinSchema = z.object({
  eyebrow: z.string().default('Getting Here'),
  headline: z.string().default('Directions & Parking'),
  venueName: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default(''),
  mapUrl: z.string().default(''),
  parkingNote: z.string().default(''),
  shuttleNote: z.string().default(''),
  showTransport: z.boolean().default(true),
  transport: z.array(TransportOptionSchema).default([]),
});

export type DirectionsPinData = z.infer<typeof directionsPinSchema>;

export const defaultDirectionsPinData: DirectionsPinData = {
  eyebrow: 'Getting Here',
  headline: 'Directions & Parking',
  venueName: 'The Grand Ballroom',
  address: '123 Celebration Lane',
  city: 'San Francisco, CA 94102',
  mapUrl: '',
  parkingNote: 'Complimentary valet parking is available at the main entrance. Self-parking is also available on-site.',
  shuttleNote: 'Shuttles will run from the Marriott Hotel every 30 minutes starting at 4pm.',
  showTransport: true,
  transport: [
    { id: '1', icon: 'car', label: 'By Car', description: 'Take I-80 West to Exit 3B. Turn right on Celebration Lane. Venue is on the left.' },
    { id: '2', icon: 'train', label: 'By Transit', description: 'BART to Civic Center Station. Exit at Grove Street. 10-minute walk or Uber recommended.' },
  ],
};

const iconMap = { car: Car, train: Train, other: Navigation };

const DirectionsPin: React.FC<SectionComponentProps<DirectionsPinData>> = ({ data }) => {
  const mapsQuery = [data.venueName, data.address, data.city].filter(Boolean).join(', ');
  const mapsHref = data.mapUrl || (mapsQuery ? `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}` : '');

  return (
    <section className="py-28 md:py-36 bg-gradient-to-b from-white via-stone-50/40 to-white" id="directions">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900">{data.headline}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={18} className="text-rose-500" />
              </div>
              <div>
                {data.venueName && <p className="font-semibold text-stone-900 text-lg">{data.venueName}</p>}
                {data.address && <p className="text-stone-600 mt-1">{data.address}</p>}
                {data.city && <p className="text-stone-600">{data.city}</p>}
                {mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    Open in Maps
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {data.parkingNote && (
              <div className="flex items-start gap-4 p-5 rounded-xl bg-stone-50 border border-stone-100">
                <Car size={16} className="text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Parking</p>
                  <p className="text-stone-600 text-sm leading-relaxed">{data.parkingNote}</p>
                </div>
              </div>
            )}

            {data.shuttleNote && (
              <div className="flex items-start gap-4 p-5 rounded-xl bg-rose-50 border border-rose-100">
                <Navigation size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-rose-400 mb-1">Shuttle Service</p>
                  <p className="text-stone-600 text-sm leading-relaxed">{data.shuttleNote}</p>
                </div>
              </div>
            )}

            {data.showTransport && data.transport.length > 0 && (
              <div className="space-y-4">
                {data.transport.map(t => {
                  const Icon = iconMap[t.icon] ?? Navigation;
                  return (
                    <div key={t.id} className="flex items-start gap-3">
                      <Icon size={14} className="text-stone-400 shrink-0 mt-1" />
                      <div>
                        <p className="font-medium text-stone-800 text-sm">{t.label}</p>
                        <p className="text-stone-500 text-sm mt-0.5 leading-relaxed">{t.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 relative group">
              {mapsHref ? (
                <>
                  <iframe
                    title="Venue location"
                    width="100%"
                    height="100%"
                    className="border-0 w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`}
                  />
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full shadow text-xs font-medium text-stone-700 hover:text-stone-900 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink size={11} />
                    Open Maps
                  </a>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <MapPin size={32} className="text-stone-300" />
                  <p className="text-stone-400 text-sm">Add venue address to show map</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const directionsPinDefinition: SectionDefinition<DirectionsPinData> = {
  type: 'directions',
  variant: 'pin',
  schema: directionsPinSchema,
  defaultData: defaultDirectionsPinData,
  Component: DirectionsPin,
};
