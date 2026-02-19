import React from 'react';
import { z } from 'zod';
import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const VenueItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  role: z.string().default(''),
  address: z.string().default(''),
  city: z.string().default(''),
  time: z.string().default(''),
  image: z.string().default(''),
  mapUrl: z.string().default(''),
  notes: z.string().default(''),
});

export const venueCardSchema = z.object({
  eyebrow: z.string().default('Where we gather'),
  headline: z.string().default('Venue'),
  venues: z.array(VenueItemSchema).default([]),
});

export type VenueCardData = z.infer<typeof venueCardSchema>;

export const defaultVenueCardData: VenueCardData = {
  eyebrow: 'Where we gather',
  headline: 'Venue',
  venues: [
    {
      id: '1',
      name: 'The Grand Pavilion',
      role: 'Ceremony & Reception',
      address: '450 Park Avenue',
      city: 'New York, NY 10022',
      time: '4:00 PM — 11:00 PM',
      image: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
      mapUrl: '',
      notes: 'Valet parking available. Please arrive by 3:45 PM.',
    },
  ],
};

const VenueCard: React.FC<SectionComponentProps<VenueCardData>> = ({ data }) => {
  return (
    <section className="py-24 md:py-32 bg-stone-50" id="venue">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900">{data.headline}</h2>
        </div>

        <div className={`grid gap-8 ${data.venues.length === 1 ? 'max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
          {data.venues.map(venue => (
            <div key={venue.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-md transition-shadow">
              {venue.image && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 md:p-8 space-y-4">
                {venue.role && (
                  <p className="text-xs uppercase tracking-[0.2em] text-rose-500 font-medium">{venue.role}</p>
                )}
                <h3 className="text-2xl font-light text-stone-900">{venue.name}</h3>

                <div className="space-y-2.5">
                  {(venue.address || venue.city) && (
                    <div className="flex items-start gap-3 text-stone-500">
                      <MapPin size={15} className="mt-0.5 flex-shrink-0 text-stone-400" />
                      <div>
                        {venue.address && <p className="text-sm leading-snug">{venue.address}</p>}
                        {venue.city && <p className="text-sm leading-snug">{venue.city}</p>}
                      </div>
                    </div>
                  )}
                  {venue.time && (
                    <div className="flex items-center gap-3 text-stone-500">
                      <Clock size={15} className="flex-shrink-0 text-stone-400" />
                      <p className="text-sm">{venue.time}</p>
                    </div>
                  )}
                </div>

                {venue.notes && (
                  <p className="text-sm text-stone-400 leading-relaxed border-t border-stone-100 pt-4">{venue.notes}</p>
                )}

                {venue.mapUrl && (
                  <a
                    href={venue.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors mt-2"
                  >
                    <ExternalLink size={13} />
                    Get directions
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

export const venueCardDefinition: SectionDefinition<VenueCardData> = {
  type: 'venue',
  variant: 'card',
  schema: venueCardSchema,
  defaultData: defaultVenueCardData,
  Component: VenueCard,
};
