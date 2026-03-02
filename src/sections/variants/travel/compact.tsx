import React from 'react';
import { z } from 'zod';
import { MapPin, ExternalLink } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const CompactHotelSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  distance: z.string().default(''),
  url: z.string().default(''),
});

export const travelCompactSchema = z.object({
  eyebrow: z.string().default('Travel details'),
  headline: z.string().default('Travel & Stay'),
  intro: z.string().default('Quick travel details for planning your weekend.'),
  airport: z.string().default(''),
  venueAddress: z.string().default(''),
  hotels: z.array(CompactHotelSchema).default([]),
});

export type TravelCompactData = z.infer<typeof travelCompactSchema>;

export const defaultTravelCompactData: TravelCompactData = {
  eyebrow: 'Travel details',
  headline: 'Travel & Stay',
  intro: 'Quick travel details for planning your weekend.',
  airport: 'Nearest airport: JFK (30 min) / EWR (45 min)',
  venueAddress: 'Venue: 123 Celebration Ave, New York, NY',
  hotels: [
    { id: '1', name: 'The Lowell Hotel', distance: '0.4 mi from venue', url: '' },
    { id: '2', name: 'Baccarat Hotel', distance: '0.2 mi from venue', url: '' },
  ],
};

const TravelCompact: React.FC<SectionComponentProps<TravelCompactData>> = ({ data }) => {
  return (
    <section className="py-16 md:py-20 bg-white" id="travel">
      <div className="max-w-4xl mx-auto px-5 md:px-8">
        <div className="text-center mb-8 md:mb-10">
          <p className="text-xs uppercase tracking-[0.22em] text-text-tertiary mb-2.5">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-4xl font-light text-text-primary">{data.headline}</h2>
          {data.intro ? <p className="mt-2.5 text-sm text-text-secondary">{data.intro}</p> : null}
        </div>

        <div className="rounded-2xl border border-border/30 bg-surface p-4 md:p-5 space-y-3">
          {data.airport ? <p className="text-sm text-text-primary">• {data.airport}</p> : null}
          {data.venueAddress ? (
            <p className="text-sm text-text-primary flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary/80" />
              {data.venueAddress}
            </p>
          ) : null}

          {data.hotels.length > 0 ? (
            <div className="pt-1.5">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary mb-2">Nearby hotels</p>
              <ul className="space-y-2">
                {data.hotels.map((hotel) => (
                  <li key={hotel.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/35 bg-white px-3 py-2">
                    <div>
                      <p className="text-sm text-text-primary">{hotel.name}</p>
                      {hotel.distance ? <p className="text-xs text-text-secondary">{hotel.distance}</p> : null}
                    </div>
                    {hotel.url ? (
                      <a href={hotel.url} target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-primary">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export const travelCompactDefinition: SectionDefinition<TravelCompactData> = {
  type: 'travel',
  variant: 'compact',
  schema: travelCompactSchema,
  defaultData: defaultTravelCompactData,
  Component: TravelCompact,
};
