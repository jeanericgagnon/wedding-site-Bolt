import React from 'react';
import { z } from 'zod';
import { MapPin, ExternalLink, Sparkles } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const ActivitySchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  category: z.string().default(''),
  description: z.string().default(''),
  address: z.string().default(''),
  url: z.string().default(''),
});

export const travelThingsToDoSchema = z.object({
  eyebrow: z.string().default('Explore the area'),
  headline: z.string().default('Things To Do'),
  intro: z.string().default('Make a weekend of it — here are our favorite spots nearby.'),
  activities: z.array(ActivitySchema).default([]),
});

export type TravelThingsToDoData = z.infer<typeof travelThingsToDoSchema>;

export const defaultTravelThingsToDoData: TravelThingsToDoData = {
  eyebrow: 'Explore the area',
  headline: 'Things To Do',
  intro: 'Make a weekend of it — here are our favorite spots nearby.',
  activities: [
    {
      id: '1',
      name: 'Riverside Walk',
      category: 'Outdoors',
      description: 'A beautiful morning walk with coffee stops and skyline views.',
      address: 'Riverside Park, New York, NY',
      url: '',
    },
    {
      id: '2',
      name: 'City Art Museum',
      category: 'Culture',
      description: 'Great exhibits and a rooftop café for an easy afternoon.',
      address: '11 Museum Ave, New York, NY',
      url: '',
    },
    {
      id: '3',
      name: 'Local Food Hall',
      category: 'Food',
      description: 'Casual bites, cocktails, and quick options for groups.',
      address: '22 Market St, New York, NY',
      url: '',
    },
  ],
};

const TravelThingsToDo: React.FC<SectionComponentProps<TravelThingsToDoData>> = ({ data }) => {
  const activities = data.activities || [];
  return (
    <section className="py-24 bg-white" id="things-to-do">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/70 mb-3">{data.eyebrow}</p>
          <h2 className="text-3xl md:text-5xl font-light text-text-primary">{data.headline}</h2>
          {data.intro && <p className="text-sm text-text-secondary mt-3 max-w-2xl mx-auto">{data.intro}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((a) => (
            <article key={a.id} className="rounded-2xl border border-border/35 bg-white shadow-[0_6px_20px_rgba(15,23,42,0.06)] p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-semibold text-text-primary">{a.name}</h3>
                {a.category && <span className="text-[11px] px-2 py-1 rounded-full border border-border/50 text-text-tertiary">{a.category}</span>}
              </div>
              {a.description && <p className="text-sm text-text-secondary leading-relaxed">{a.description}</p>}
              {(a.address || a.url) && (
                <div className="mt-3 space-y-2">
                  {a.address && (
                    <p className="text-xs text-text-tertiary flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {a.address}
                    </p>
                  )}
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover">
                      <Sparkles className="w-3.5 h-3.5" />
                      Visit
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export const travelThingsToDoDefinition: SectionDefinition<TravelThingsToDoData> = {
  type: 'travel',
  variant: 'thingsToDo',
  schema: travelThingsToDoSchema,
  defaultData: defaultTravelThingsToDoData,
  Component: TravelThingsToDo,
};
