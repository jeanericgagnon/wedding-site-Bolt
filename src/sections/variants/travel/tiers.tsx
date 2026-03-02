import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';

const TierHotelSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  distance: z.string().default(''),
  price: z.string().default(''),
  note: z.string().default(''),
  url: z.string().default(''),
});

export const travelTiersSchema = z.object({
  eyebrow: z.string().default('Where to stay'),
  headline: z.string().default('Hotel Options by Budget'),
  intro: z.string().default('Choose what works best for your trip.'),
  closest: z.array(TierHotelSchema).default([]),
  value: z.array(TierHotelSchema).default([]),
  budget: z.array(TierHotelSchema).default([]),
});

export type TravelTiersData = z.infer<typeof travelTiersSchema>;

export const defaultTravelTiersData: TravelTiersData = {
  eyebrow: 'Where to stay',
  headline: 'Hotel Options by Budget',
  intro: 'Choose what works best for your trip.',
  closest: [
    { id: 'c1', name: 'Baccarat Hotel', distance: '0.2 mi from venue', price: 'From $395/night', note: '', url: '' },
  ],
  value: [
    { id: 'v1', name: 'The Lowell Hotel', distance: '0.4 mi from venue', price: 'From $289/night', note: '', url: '' },
  ],
  budget: [
    { id: 'b1', name: 'Cityline Inn', distance: '1.1 mi from venue', price: 'From $179/night', note: '', url: '' },
  ],
};

const TierColumn: React.FC<{ title: string; hotels: z.infer<typeof TierHotelSchema>[]; accent?: boolean }> = ({ title, hotels, accent }) => (
  <div className={`rounded-2xl border p-4 md:p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ${accent ? 'bg-primary/5 border-primary/20' : 'bg-white border-border/35'}`}>
    <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary mb-3">{title}</p>
    <div className="space-y-2.5">
      {hotels.length === 0 ? (
        <p className="text-xs text-text-tertiary">No hotels added yet.</p>
      ) : (
        hotels.map((h) => (
          <div key={h.id} className="rounded-xl border border-border/35 bg-white px-3 py-2.5">
            <p className="text-sm font-medium text-text-primary">{h.name}</p>
            <p className="text-xs text-text-secondary mt-0.5">{[h.distance, h.price].filter(Boolean).join(' · ')}</p>
            {h.note ? <p className="text-xs text-text-tertiary mt-1">{h.note}</p> : null}
          </div>
        ))
      )}
    </div>
  </div>
);

const TravelTiers: React.FC<SectionComponentProps<TravelTiersData>> = ({ data }) => {
  return (
    <section className="py-20 md:py-28 bg-surface" id="travel">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className="text-center mb-10 md:mb-12">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary mb-3">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
          {data.intro ? <p className="mt-3 text-sm md:text-base text-text-secondary max-w-2xl mx-auto">{data.intro}</p> : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <TierColumn title="Closest" hotels={data.closest} accent />
          <TierColumn title="Best Value" hotels={data.value} />
          <TierColumn title="Budget" hotels={data.budget} />
        </div>
      </div>
    </section>
  );
};

export const travelTiersDefinition: SectionDefinition<TravelTiersData> = {
  type: 'travel',
  variant: 'tiers',
  schema: travelTiersSchema,
  defaultData: defaultTravelTiersData,
  Component: TravelTiers,
};
