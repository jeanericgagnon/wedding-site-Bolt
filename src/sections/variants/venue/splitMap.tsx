import React from 'react';
import { z } from 'zod';
import { MapPin, Clock, Navigation, CalendarDays } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const VenueItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  role: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default(''),
  time: z.string().default(''),
  date: z.string().default(''),
  image: z.string().default(''),
  mapUrl: z.string().default(''),
  mapEmbedUrl: z.string().default(''),
  notes: z.string().default(''),
});

export const venueSplitMapSchema = z.object({
  eyebrow: z.string().default('Where we gather'),
  headline: z.string().default('Venue'),
  subheadline: z.string().default(''),
  imagePosition: z.enum(['left', 'right']).default('right'),
  venues: z.array(VenueItemSchema).default([]),
});

export type VenueSplitMapData = z.infer<typeof venueSplitMapSchema>;

export const defaultVenueSplitMapData: VenueSplitMapData = {
  eyebrow: 'Where we gather',
  headline: 'Venue',
  subheadline: '',
  imagePosition: 'right',
  venues: [
    {
      id: '1',
      name: 'The Grand Pavilion',
      role: 'Ceremony & Reception',
      address: '450 Park Avenue',
      city: 'New York, NY 10022',
      time: '4:00 PM — 11:00 PM',
      date: 'Saturday, June 14, 2025',
      image: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800',
      mapUrl: 'https://maps.google.com/?q=450+Park+Avenue+New+York+NY',
      mapEmbedUrl: '',
      notes: 'Valet parking available. Please arrive by 3:45 PM.',
    },
  ],
};

const VenueSplitMap: React.FC<SectionComponentProps<VenueSplitMapData>> = ({ data }) => {
  return (
    <section className="py-32 md:py-40 bg-gradient-to-b from-white to-stone-50/35" id="venue">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 mb-2 tracking-tight">{data.headline}</h2>
          {data.subheadline && (
            <p className="text-stone-400 font-light">{data.subheadline}</p>
          )}
        </div>

        <div className="space-y-10">
          {data.venues.map((venue, idx) => {
            const imgRight = idx % 2 === 0 ? data.imagePosition === 'right' : data.imagePosition === 'left';
            return (
              <div
                key={venue.id}
                className={`grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-stone-100 shadow-sm ${imgRight ? '' : 'md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1'}`}
              >
                <div className="flex flex-col justify-center p-8 md:p-12 bg-white">
                  {venue.role && (
                    <p className="text-xs uppercase tracking-[0.2em] text-rose-500 font-medium mb-4">{venue.role}</p>
                  )}
                  <h3 className="text-2xl md:text-3xl font-light text-stone-900 mb-6">{venue.name}</h3>

                  <div className="space-y-3 mb-6">
                    {(venue.address || venue.city) && (
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MapPin size={13} className="text-stone-400" />
                        </div>
                        <div>
                          {venue.address && <p className="text-sm text-stone-700">{venue.address}</p>}
                          {venue.city && <p className="text-sm text-stone-400">{venue.city}</p>}
                        </div>
                      </div>
                    )}
                    {venue.time && (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center flex-shrink-0">
                          <Clock size={13} className="text-stone-400" />
                        </div>
                        <p className="text-sm text-stone-700">{venue.time}</p>
                      </div>
                    )}
                    {venue.date && (
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center flex-shrink-0">
                          <CalendarDays size={13} className="text-stone-400" />
                        </div>
                        <p className="text-sm text-stone-700">{venue.date}</p>
                      </div>
                    )}
                  </div>

                  {venue.notes && (
                    <p className="text-sm text-stone-400 leading-relaxed mb-6">{venue.notes}</p>
                  )}

                  {venue.mapUrl && (
                    <a
                      href={venue.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors"
                    >
                      <Navigation size={14} />
                      Get Directions
                    </a>
                  )}
                </div>

                <div className="relative min-h-[280px] md:min-h-0 bg-stone-100">
                  {venue.mapEmbedUrl ? (
                    <iframe
                      src={venue.mapEmbedUrl}
                      className="absolute inset-0 w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Map of ${venue.name}`}
                    />
                  ) : venue.image ? (
                    <img
                      src={venue.image}
                      alt={venue.name}
                      className="absolute inset-0 w-full h-full object-cover saturate-[1.03] contrast-[1.02]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-50">
                      <MapPin size={32} className="text-stone-300" />
                      <p className="text-stone-300 text-sm">Add a map or venue photo</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const venueSplitMapDefinition: SectionDefinition<VenueSplitMapData> = {
  type: 'venue',
  variant: 'splitMap',
  schema: venueSplitMapSchema,
  defaultData: defaultVenueSplitMapData,
  Component: VenueSplitMap,
};
