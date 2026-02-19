import React from 'react';
import { z } from 'zod';
import { MapPin, Clock, Navigation, CalendarDays, Users, Utensils } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const VenueDetailSchema = z.object({
  id: z.string(),
  icon: z.enum(['mapPin', 'clock', 'calendar', 'users', 'utensils', 'navigation']).default('mapPin'),
  label: z.string().default(''),
  value: z.string().default(''),
});

const VenueItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  role: z.string().default(''),
  description: z.string().default(''),
  details: z.array(VenueDetailSchema).default([]),
  image: z.string().default(''),
  mapUrl: z.string().default(''),
});

export const venueDetailsFirstSchema = z.object({
  eyebrow: z.string().default('Where we gather'),
  headline: z.string().default('Venue'),
  subheadline: z.string().default(''),
  venues: z.array(VenueItemSchema).default([]),
  layout: z.enum(['stacked', 'wide']).default('stacked'),
});

export type VenueDetailsFirstData = z.infer<typeof venueDetailsFirstSchema>;

export const defaultVenueDetailsFirstData: VenueDetailsFirstData = {
  eyebrow: 'Where we gather',
  headline: 'Venue',
  subheadline: '',
  layout: 'stacked',
  venues: [
    {
      id: '1',
      name: 'The Grand Pavilion',
      role: 'Ceremony',
      description: 'A stunning garden terrace overlooking the Manhattan skyline.',
      image: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800',
      mapUrl: '',
      details: [
        { id: '1', icon: 'mapPin', label: 'Address', value: '450 Park Avenue, New York, NY 10022' },
        { id: '2', icon: 'clock', label: 'Time', value: '4:00 PM — Ceremony begins' },
        { id: '3', icon: 'calendar', label: 'Date', value: 'Saturday, June 14, 2025' },
      ],
    },
    {
      id: '2',
      name: 'The Grand Ballroom',
      role: 'Reception',
      description: 'Floor-to-ceiling windows, crystal chandeliers, and room for the whole family.',
      image: '',
      mapUrl: '',
      details: [
        { id: '1', icon: 'mapPin', label: 'Address', value: '450 Park Avenue, Floor 22' },
        { id: '2', icon: 'clock', label: 'Time', value: '6:00 PM — Doors open' },
        { id: '3', icon: 'users', label: 'Capacity', value: '150 guests' },
      ],
    },
  ],
};

const ICONS = {
  mapPin: MapPin,
  clock: Clock,
  calendar: CalendarDays,
  users: Users,
  utensils: Utensils,
  navigation: Navigation,
};

const VenueDetailsFirst: React.FC<SectionComponentProps<VenueDetailsFirstData>> = ({ data }) => {
  const isWide = data.layout === 'wide';

  return (
    <section className="py-24 md:py-32 bg-stone-50" id="venue">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-2">{data.headline}</h2>
          {data.subheadline && (
            <p className="text-stone-400 font-light mt-2">{data.subheadline}</p>
          )}
        </div>

        <div className={isWide ? 'grid grid-cols-1 md:grid-cols-2 gap-8' : 'space-y-8 max-w-3xl mx-auto'}>
          {data.venues.map(venue => (
            <div key={venue.id} className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm">
              {venue.image && (
                <div className="aspect-[21/9] overflow-hidden">
                  <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-6 md:p-8">
                <div className="mb-6">
                  {venue.role && (
                    <p className="text-xs uppercase tracking-[0.2em] text-rose-500 font-medium mb-2">{venue.role}</p>
                  )}
                  <h3 className="text-xl md:text-2xl font-light text-stone-900">{venue.name}</h3>
                  {venue.description && (
                    <p className="text-sm text-stone-500 font-light mt-2 leading-relaxed">{venue.description}</p>
                  )}
                </div>

                {venue.details.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {venue.details.map(detail => {
                      const Icon = ICONS[detail.icon] ?? MapPin;
                      return (
                        <div key={detail.id} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                          <div className="w-7 h-7 rounded-lg bg-white border border-stone-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Icon size={13} className="text-stone-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-stone-400 uppercase tracking-wide font-medium">{detail.label}</p>
                            <p className="text-sm text-stone-700 font-medium mt-0.5 leading-snug">{detail.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {venue.mapUrl && (
                  <a
                    href={venue.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors"
                  >
                    <Navigation size={14} />
                    Get Directions
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

export const venueDetailsFirstDefinition: SectionDefinition<VenueDetailsFirstData> = {
  type: 'venue',
  variant: 'detailsFirst',
  schema: venueDetailsFirstSchema,
  defaultData: defaultVenueDetailsFirstData,
  Component: VenueDetailsFirst,
};
