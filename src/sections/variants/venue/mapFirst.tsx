import React from 'react';
import { z } from 'zod';
import { MapPin, Clock, Navigation } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const VenueItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  role: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default(''),
  time: z.string().default(''),
  mapUrl: z.string().default(''),
  mapEmbedUrl: z.string().default(''),
  notes: z.string().default(''),
});

export const venueMapFirstSchema = z.object({
  eyebrow: z.string().default('Where we gather'),
  headline: z.string().default('Venue'),
  venues: z.array(VenueItemSchema).default([]),
  mapHeight: z.enum(['sm', 'md', 'lg']).default('md'),
});

export type VenueMapFirstData = z.infer<typeof venueMapFirstSchema>;

export const defaultVenueMapFirstData: VenueMapFirstData = {
  eyebrow: 'Where we gather',
  headline: 'Venue',
  mapHeight: 'md',
  venues: [
    {
      id: '1',
      name: 'The Grand Pavilion',
      role: 'Ceremony & Reception',
      address: '450 Park Avenue',
      city: 'New York, NY 10022',
      time: '4:00 PM — 11:00 PM',
      mapUrl: 'https://maps.google.com/?q=450+Park+Avenue+New+York+NY',
      mapEmbedUrl: '',
      notes: 'Valet parking available. Please arrive by 3:45 PM.',
    },
  ],
};

const MAP_HEIGHT = { sm: 'h-64', md: 'h-80 md:h-96', lg: 'h-96 md:h-[28rem]' };

const VenueMapFirst: React.FC<SectionComponentProps<VenueMapFirstData>> = ({ data }) => {
  const primaryVenue = data.venues[0];
  const extraVenues = data.venues.slice(1);
  const heightClass = MAP_HEIGHT[data.mapHeight];

  return (
    <section className="py-28 md:py-36 bg-gradient-to-b from-stone-50 to-white" id="venue">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 tracking-tight">{data.headline}</h2>
        </div>

        {primaryVenue && (
          <div className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
            <div className={`relative w-full ${heightClass} bg-stone-200`}>
              {primaryVenue.mapEmbedUrl ? (
                <iframe
                  src={primaryVenue.mapEmbedUrl}
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${primaryVenue.name}`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-stone-100">
                  <div className="w-16 h-16 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-sm">
                    <MapPin size={28} className="text-stone-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-stone-600 font-medium text-sm">{primaryVenue.address}</p>
                    <p className="text-stone-400 text-sm">{primaryVenue.city}</p>
                  </div>
                  {primaryVenue.mapUrl && (
                    <a
                      href={primaryVenue.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-600 hover:border-stone-400 hover:text-stone-900 transition-all shadow-sm"
                    >
                      <Navigation size={13} />
                      Open in Maps
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div className="space-y-2">
                  {primaryVenue.role && (
                    <p className="text-xs uppercase tracking-[0.2em] text-rose-500 font-medium">{primaryVenue.role}</p>
                  )}
                  <h3 className="text-2xl font-light text-stone-900">{primaryVenue.name}</h3>
                  <div className="flex flex-col gap-2 pt-1">
                    {(primaryVenue.address || primaryVenue.city) && (
                      <div className="flex items-start gap-2.5 text-stone-500">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0 text-stone-400" />
                        <span className="text-sm">
                          {[primaryVenue.address, primaryVenue.city].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {primaryVenue.time && (
                      <div className="flex items-center gap-2.5 text-stone-500">
                        <Clock size={14} className="flex-shrink-0 text-stone-400" />
                        <span className="text-sm">{primaryVenue.time}</span>
                      </div>
                    )}
                  </div>
                </div>

                {primaryVenue.mapUrl && (
                  <a
                    href={primaryVenue.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    <Navigation size={14} />
                    Get Directions
                  </a>
                )}
              </div>

              {primaryVenue.notes && (
                <p className="mt-5 pt-5 border-t border-stone-100 text-sm text-stone-400 leading-relaxed">
                  {primaryVenue.notes}
                </p>
              )}
            </div>
          </div>
        )}

        {extraVenues.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {extraVenues.map(venue => (
              <div key={venue.id} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                {venue.role && (
                  <p className="text-xs uppercase tracking-[0.2em] text-rose-500 font-medium mb-2">{venue.role}</p>
                )}
                <h3 className="text-lg font-light text-stone-900 mb-3">{venue.name}</h3>
                <div className="space-y-2">
                  {(venue.address || venue.city) && (
                    <div className="flex items-start gap-2 text-stone-500">
                      <MapPin size={13} className="mt-0.5 flex-shrink-0 text-stone-400" />
                      <span className="text-sm">{[venue.address, venue.city].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {venue.time && (
                    <div className="flex items-center gap-2 text-stone-500">
                      <Clock size={13} className="flex-shrink-0 text-stone-400" />
                      <span className="text-sm">{venue.time}</span>
                    </div>
                  )}
                </div>
                {venue.mapUrl && (
                  <a href={venue.mapUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors uppercase tracking-wide font-medium">
                    <Navigation size={12} />
                    Directions
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const venueMapFirstDefinition: SectionDefinition<VenueMapFirstData> = {
  type: 'venue',
  variant: 'mapFirst',
  schema: venueMapFirstSchema,
  defaultData: defaultVenueMapFirstData,
  Component: VenueMapFirst,
};
