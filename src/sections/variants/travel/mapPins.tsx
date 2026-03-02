import React from 'react';
import { z } from 'zod';
import { MapPin, ExternalLink } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const PinSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  type: z.string().default(''),
  address: z.string().default(''),
  note: z.string().default(''),
  url: z.string().default(''),
});

export const travelMapPinsSchema = z.object({
  eyebrow: z.string().default('Plan your route'),
  headline: z.string().default('Map & Key Locations'),
  intro: z.string().default('Important locations for your stay and the celebration.'),
  pins: z.array(PinSchema).default([]),
});

export type TravelMapPinsData = z.infer<typeof travelMapPinsSchema>;

export const defaultTravelMapPinsData: TravelMapPinsData = {
  eyebrow: 'Plan your route',
  headline: 'Map & Key Locations',
  intro: 'Important locations for your stay and the celebration.',
  pins: [
    { id: '1', name: 'Wedding Venue', type: 'Venue', address: '123 Celebration Ave', note: 'Ceremony + reception', url: '' },
    { id: '2', name: 'The Lowell Hotel', type: 'Hotel', address: '28 E 63rd St', note: 'Room block available', url: '' },
    { id: '3', name: 'JFK Airport', type: 'Airport', address: 'Queens, NY', note: 'Approx 30–45 min', url: '' },
  ],
};

const TravelMapPins: React.FC<SectionComponentProps<TravelMapPinsData>> = ({ data }) => {
  return (
    <section className="py-20 md:py-28 bg-surface" id="travel-map">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className="text-center mb-10 md:mb-12">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary mb-3">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
          {data.intro ? <p className="mt-3 text-sm md:text-base text-text-secondary max-w-2xl mx-auto">{data.intro}</p> : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-white p-4 md:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary mb-3">Map Preview</p>
            <div className="rounded-xl border border-dashed border-border/60 bg-surface-subtle h-64 flex items-center justify-center text-center px-4">
              <div>
                <MapPin className="w-5 h-5 text-primary/70 mx-auto mb-2" />
                <p className="text-sm text-text-secondary">Map preview placeholder. Use your location links in the pinned list for now.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-border/40 bg-white p-4 md:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary mb-3">Pinned locations</p>
            <div className="space-y-2.5">
              {data.pins.length === 0 ? (
                <p className="text-xs text-text-tertiary">No pinned locations added yet.</p>
              ) : data.pins.map((pin) => (
                <div key={pin.id} className="rounded-xl border border-border/35 bg-surface px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-text-primary font-medium">{pin.name}</p>
                    {pin.url ? (
                      <a href={pin.url} target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-primary" aria-label={`Open ${pin.name} location link`}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : null}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{[pin.type, pin.address].filter(Boolean).join(' · ')}</p>
                  {pin.note ? <p className="text-xs text-text-tertiary mt-1">{pin.note}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const travelMapPinsDefinition: SectionDefinition<TravelMapPinsData> = {
  type: 'travel',
  variant: 'mapPins',
  schema: travelMapPinsSchema,
  defaultData: defaultTravelMapPinsData,
  Component: TravelMapPins,
};
