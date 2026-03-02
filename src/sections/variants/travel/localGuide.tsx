import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { Coffee, Utensils, Landmark, MoonStar, ExternalLink } from 'lucide-react';

const GuideItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  note: z.string().default(''),
  url: z.string().default(''),
});

export const travelLocalGuideSchema = z.object({
  eyebrow: z.string().default('Explore nearby'),
  headline: z.string().default('Local Guide'),
  intro: z.string().default('If you’re making a weekend of it, here are our favorite spots.'),
  coffee: z.array(GuideItemSchema).default([]),
  food: z.array(GuideItemSchema).default([]),
  sights: z.array(GuideItemSchema).default([]),
  nightlife: z.array(GuideItemSchema).default([]),
});

export type TravelLocalGuideData = z.infer<typeof travelLocalGuideSchema>;

export const defaultTravelLocalGuideData: TravelLocalGuideData = {
  eyebrow: 'Explore nearby',
  headline: 'Local Guide',
  intro: 'If you’re making a weekend of it, here are our favorite spots.',
  coffee: [
    { id: 'c1', name: 'Morning Light Café', note: 'Great pastries and quick service.', url: '' },
    { id: 'c2', name: 'Oak & Bean', note: 'Cozy tables for catching up.', url: '' },
  ],
  food: [
    { id: 'f1', name: 'Riverside Kitchen', note: 'Seasonal menu, easy reservations.', url: '' },
    { id: 'f2', name: 'Lantern Noodles', note: 'Casual and group-friendly.', url: '' },
  ],
  sights: [
    { id: 's1', name: 'City Art Museum', note: 'Modern wing + rooftop views.', url: '' },
    { id: 's2', name: 'Botanical Garden', note: 'Beautiful at golden hour.', url: '' },
  ],
  nightlife: [
    { id: 'n1', name: 'Juniper Bar', note: 'Craft cocktails, low-key vibe.', url: '' },
    { id: 'n2', name: 'Late Night Jazz Room', note: 'Live music after 9pm.', url: '' },
  ],
};

const GuideColumn: React.FC<{ title: string; icon: React.ReactNode; items: z.infer<typeof GuideItemSchema>[] }> = ({ title, icon, items }) => (
  <div className="rounded-2xl border border-border/30 bg-white p-4 md:p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">{title}</h3>
    </div>
    <div className="space-y-2.5">
      {items.length === 0 ? (
        <p className="text-xs text-text-tertiary">No recommendations added yet.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="rounded-xl border border-border/35 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-text-primary font-medium">{item.name}</p>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-text-tertiary hover:text-primary">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : null}
            </div>
            {item.note ? <p className="text-xs text-text-secondary mt-1">{item.note}</p> : null}
          </div>
        ))
      )}
    </div>
  </div>
);

const TravelLocalGuide: React.FC<SectionComponentProps<TravelLocalGuideData>> = ({ data }) => {
  return (
    <section className="py-20 md:py-28 bg-surface" id="travel-guide">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <div className="text-center mb-10 md:mb-12">
          <p className="text-xs uppercase tracking-[0.24em] text-text-tertiary mb-3">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
          {data.intro ? <p className="mt-3 text-sm md:text-base text-text-secondary max-w-2xl mx-auto">{data.intro}</p> : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <GuideColumn title="Coffee" icon={<Coffee className="w-4 h-4 text-primary/80" />} items={data.coffee} />
          <GuideColumn title="Food" icon={<Utensils className="w-4 h-4 text-primary/80" />} items={data.food} />
          <GuideColumn title="Sights" icon={<Landmark className="w-4 h-4 text-primary/80" />} items={data.sights} />
          <GuideColumn title="Nightlife" icon={<MoonStar className="w-4 h-4 text-primary/80" />} items={data.nightlife} />
        </div>
      </div>
    </section>
  );
};

export const travelLocalGuideDefinition: SectionDefinition<TravelLocalGuideData> = {
  type: 'travel',
  variant: 'localGuide',
  schema: travelLocalGuideSchema,
  defaultData: defaultTravelLocalGuideData,
  Component: TravelLocalGuide,
};
