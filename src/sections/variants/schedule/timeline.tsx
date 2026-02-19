import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';

const ScheduleEventSchema = z.object({
  id: z.string(),
  time: z.string().default(''),
  label: z.string().default(''),
  description: z.string().default(''),
  location: z.string().default(''),
  icon: z.string().default(''),
});

export const scheduleTimelineSchema = z.object({
  eyebrow: z.string().default('The big day'),
  headline: z.string().default('Day-of Schedule'),
  events: z.array(ScheduleEventSchema).default([]),
  date: z.string().default(''),
  showDate: z.boolean().default(true),
});

export type ScheduleTimelineData = z.infer<typeof scheduleTimelineSchema>;

export const defaultScheduleTimelineData: ScheduleTimelineData = {
  eyebrow: 'The big day',
  headline: 'Day-of Schedule',
  date: 'Saturday, June 14th, 2025',
  showDate: true,
  events: [
    { id: '1', time: '3:30 PM', label: 'Guests Arrive', description: 'Please be seated by 3:45 PM', location: 'Main Hall', icon: '' },
    { id: '2', time: '4:00 PM', label: 'Ceremony', description: 'The exchange of vows', location: 'Garden Terrace', icon: '' },
    { id: '3', time: '5:00 PM', label: 'Cocktail Hour', description: 'Drinks and hors d\'oeuvres', location: 'The Courtyard', icon: '' },
    { id: '4', time: '6:30 PM', label: 'Reception Dinner', description: 'Seated dinner and toasts', location: 'Grand Ballroom', icon: '' },
    { id: '5', time: '8:00 PM', label: 'First Dance', description: 'Dancing to follow', location: 'Grand Ballroom', icon: '' },
    { id: '6', time: '11:00 PM', label: 'Farewell', description: 'Safe travels!', location: '', icon: '' },
  ],
};

const ScheduleTimeline: React.FC<SectionComponentProps<ScheduleTimelineData>> = ({ data }) => {
  return (
    <section className="py-24 md:py-32 bg-white" id="schedule">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-3">{data.headline}</h2>
          {data.showDate && data.date && (
            <p className="text-stone-400 text-base font-light">{data.date}</p>
          )}
        </div>

        <div className="relative">
          <div className="absolute left-[3.25rem] top-3 bottom-3 w-px bg-stone-100" aria-hidden="true" />

          <div className="space-y-0">
            {data.events.map((event, idx) => (
              <div key={event.id} className="flex gap-8 group">
                <div className="flex flex-col items-end w-24 flex-shrink-0 pt-1">
                  <span className="text-sm font-medium text-stone-500 tabular-nums leading-none whitespace-nowrap">
                    {event.time}
                  </span>
                </div>

                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-stone-300 bg-white mt-1.5 group-first:border-stone-500 z-10" />
                  {idx < data.events.length - 1 && (
                    <div className="w-px flex-1 bg-stone-100 mt-1" style={{ minHeight: '2rem' }} />
                  )}
                </div>

                <div className="pb-10 flex-1 min-w-0">
                  <h3 className="text-base font-medium text-stone-900 leading-tight">{event.label}</h3>
                  {event.description && (
                    <p className="text-sm text-stone-500 font-light mt-1 leading-relaxed">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="text-xs text-stone-400 mt-1.5 uppercase tracking-wide">{event.location}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export const scheduleTimelineDefinition: SectionDefinition<ScheduleTimelineData> = {
  type: 'schedule',
  variant: 'timeline',
  schema: scheduleTimelineSchema,
  defaultData: defaultScheduleTimelineData,
  Component: ScheduleTimeline,
};
