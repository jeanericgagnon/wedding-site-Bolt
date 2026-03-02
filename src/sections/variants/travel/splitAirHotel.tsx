import React from 'react';
import { z } from 'zod';
import { Plane, Hotel, ExternalLink } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const HotelSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  distance: z.string().default(''),
  note: z.string().default(''),
  url: z.string().default(''),
});

export const travelSplitAirHotelSchema = z.object({
  eyebrow: z.string().default('Travel basics'),
  headline: z.string().default('Flights & Hotels'),
  flightInfo: z.string().default(''),
  airportTips: z.string().default(''),
  hotels: z.array(HotelSchema).default([]),
});

export type TravelSplitAirHotelData = z.infer<typeof travelSplitAirHotelSchema>;

export const defaultTravelSplitAirHotelData: TravelSplitAirHotelData = {
  eyebrow: 'Travel basics',
  headline: 'Flights & Hotels',
  flightInfo: 'Recommended airports: JFK (30 min) or EWR (45 min).',
  airportTips: 'Arrive before 3pm Friday to avoid peak traffic.',
  hotels: [
    { id: '1', name: 'The Lowell Hotel', distance: '0.4 mi from venue', note: 'Room block available', url: '' },
    { id: '2', name: 'Baccarat Hotel', distance: '0.2 mi from venue', note: '', url: '' },
  ],
};

const TravelSplitAirHotel: React.FC<SectionComponentProps<TravelSplitAirHotelData>> = ({ data }) => {
  return (
    <section className="py-20 md:py-28 bg-white" id="travel">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className="text-center mb-10 md:mb-12">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary mb-3">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="rounded-2xl border border-border/40 bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Plane className="w-4 h-4 text-primary/80" />
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">By Air</p>
            </div>
            {data.flightInfo ? <p className="text-sm text-text-primary">{data.flightInfo}</p> : null}
            {data.airportTips ? <p className="text-xs text-text-secondary mt-2">{data.airportTips}</p> : null}
          </div>

          <div className="rounded-2xl border border-border/40 bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Hotel className="w-4 h-4 text-primary/80" />
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Hotels</p>
            </div>
            <div className="space-y-2.5">
              {data.hotels.map((h) => (
                <div key={h.id} className="rounded-xl border border-border/35 bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-text-primary font-medium">{h.name}</p>
                    {h.url ? (
                      <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-primary">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : null}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{h.distance}</p>
                  {h.note ? <p className="text-xs text-text-tertiary mt-1">{h.note}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const travelSplitAirHotelDefinition: SectionDefinition<TravelSplitAirHotelData> = {
  type: 'travel',
  variant: 'splitAirHotel',
  schema: travelSplitAirHotelSchema,
  defaultData: defaultTravelSplitAirHotelData,
  Component: TravelSplitAirHotel,
};
