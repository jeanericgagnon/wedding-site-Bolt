import React, { useState } from 'react';
import { z } from 'zod';
import { MapPin } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const ScheduleEventSchema = z.object({
  id: z.string(),
  time: z.string().default(''),
  label: z.string().default(''),
  description: z.string().default(''),
  location: z.string().default(''),
  highlight: z.boolean().default(false),
});

const DaySchema = z.object({
  id: z.string(),
  label: z.string().default(''),
  date: z.string().default(''),
  events: z.array(ScheduleEventSchema).default([]),
});

export const scheduleDayTabsSchema = z.object({
  eyebrow: z.string().default('Weekend events'),
  headline: z.string().default('Schedule'),
  days: z.array(DaySchema).default([]),
});

export type ScheduleDayTabsData = z.infer<typeof scheduleDayTabsSchema>;

export const defaultScheduleDayTabsData: ScheduleDayTabsData = {
  eyebrow: 'Weekend events',
  headline: 'Schedule',
  days: [
    {
      id: 'fri',
      label: 'Friday',
      date: 'June 13',
      events: [
        { id: '1', time: '6:00 PM', label: 'Welcome Drinks', description: 'Casual cocktails for early arrivals', location: 'Hotel Bar, The Lowell', highlight: false },
        { id: '2', time: '8:00 PM', label: 'Rehearsal Dinner', description: 'Family & wedding party dinner', location: 'Private Dining Room', highlight: true },
      ],
    },
    {
      id: 'sat',
      label: 'Saturday',
      date: 'June 14',
      events: [
        { id: '3', time: '3:30 PM', label: 'Guests Arrive', description: 'Please be seated by 3:45 PM', location: 'Main Hall', highlight: false },
        { id: '4', time: '4:00 PM', label: 'Ceremony', description: 'The exchange of vows', location: 'Garden Terrace', highlight: true },
        { id: '5', time: '5:00 PM', label: 'Cocktail Hour', description: 'Wine and hors d\'oeuvres', location: 'The Courtyard', highlight: false },
        { id: '6', time: '6:30 PM', label: 'Reception Dinner', description: 'Seated dinner and toasts', location: 'Grand Ballroom', highlight: false },
        { id: '7', time: '8:00 PM', label: 'First Dance & Dancing', description: '', location: 'Grand Ballroom', highlight: false },
        { id: '8', time: '11:00 PM', label: 'Farewell', description: 'Safe travels!', location: '', highlight: false },
      ],
    },
    {
      id: 'sun',
      label: 'Sunday',
      date: 'June 15',
      events: [
        { id: '9', time: '10:00 AM', label: 'Farewell Brunch', description: 'A casual goodbye before you head home', location: 'The Lowell Hotel', highlight: false },
        { id: '10', time: '12:00 PM', label: 'Brunch Ends', description: 'Safe travels!', location: '', highlight: false },
      ],
    },
  ],
};

const ScheduleDayTabs: React.FC<SectionComponentProps<ScheduleDayTabsData>> = ({ data }) => {
  const [activeDay, setActiveDay] = useState(data.days[0]?.id ?? '');
  const currentDay = data.days.find(d => d.id === activeDay) ?? data.days[0];

  return (
    <section className="py-28 md:py-36 bg-gradient-to-b from-white via-stone-50/40 to-white" id="schedule">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 tracking-tight">{data.headline}</h2>
        </div>

        {data.days.length > 1 && (
          <div className="flex gap-2 mb-10 overflow-x-auto pb-1 justify-center">
            {data.days.map(day => (
              <button
                key={day.id}
                onClick={() => setActiveDay(day.id)}
                className={`flex-shrink-0 flex flex-col items-center px-5 py-3 rounded-xl border-2 transition-all ${
                  activeDay === day.id
                    ? 'border-stone-900 bg-stone-900 text-white shadow-sm'
                    : 'border-stone-200/90 bg-white/80 text-stone-500 hover:border-stone-300 hover:text-stone-700'
                }`}
              >
                <span className="text-xs font-medium uppercase tracking-wide">{day.label}</span>
                {day.date && (
                  <span className={`text-xs mt-0.5 ${activeDay === day.id ? 'text-white/60' : 'text-stone-400'}`}>
                    {day.date}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {currentDay && (
          <div className="relative">
            <div className="absolute left-[5.5rem] top-0 bottom-0 w-px bg-stone-100" aria-hidden="true" />
            <div className="space-y-0">
              {currentDay.events.map((event, idx) => (
                <div key={event.id} className="flex gap-6 group">
                  <div className="w-20 flex-shrink-0 text-right pt-1">
                    <span className="text-xs font-medium text-stone-400 tabular-nums leading-none whitespace-nowrap">
                      {event.time}
                    </span>
                  </div>

                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full border-2 mt-1 z-10 transition-colors ${
                      event.highlight
                        ? 'border-rose-400 bg-rose-400'
                        : 'border-stone-300 bg-white'
                    }`} />
                    {idx < currentDay.events.length - 1 && (
                      <div className="w-px flex-1 bg-stone-100 mt-1" style={{ minHeight: '2rem' }} />
                    )}
                  </div>

                  <div className={`pb-8 flex-1 min-w-0 ${event.highlight ? 'pb-10' : ''}`}>
                    <div className={`${event.highlight ? 'p-4 bg-rose-50 border border-rose-100 rounded-xl -ml-1' : ''}`}>
                      <h3 className={`text-sm font-semibold leading-tight ${event.highlight ? 'text-rose-900' : 'text-stone-900'}`}>
                        {event.label}
                      </h3>
                      {event.description && (
                        <p className={`text-xs mt-1 leading-relaxed font-light ${event.highlight ? 'text-rose-600' : 'text-stone-500'}`}>
                          {event.description}
                        </p>
                      )}
                      {event.location && (
                        <div className={`flex items-center gap-1 mt-1.5 ${event.highlight ? 'text-rose-400' : 'text-stone-400'}`}>
                          <MapPin size={10} />
                          <span className="text-[10px] uppercase tracking-wide font-medium">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export const scheduleDayTabsDefinition: SectionDefinition<ScheduleDayTabsData> = {
  type: 'schedule',
  variant: 'dayTabs',
  schema: scheduleDayTabsSchema,
  defaultData: defaultScheduleDayTabsData,
  Component: ScheduleDayTabs,
};
