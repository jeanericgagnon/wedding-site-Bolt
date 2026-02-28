import React from 'react';
import { z } from 'zod';
import { MapPin, Clock } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const AgendaEventSchema = z.object({
  id: z.string(),
  time: z.string().default(''),
  endTime: z.string().default(''),
  label: z.string().default(''),
  description: z.string().default(''),
  location: z.string().default(''),
  category: z.enum(['ceremony', 'cocktails', 'reception', 'dinner', 'dancing', 'other']).default('other'),
  image: z.string().default(''),
});

export const scheduleAgendaCardsSchema = z.object({
  eyebrow: z.string().default('The big day'),
  headline: z.string().default('Day-of Schedule'),
  date: z.string().default(''),
  showDate: z.boolean().default(true),
  events: z.array(AgendaEventSchema).default([]),
  accentColor: z.enum(['rose', 'stone', 'amber', 'teal']).default('rose'),
});

export type ScheduleAgendaCardsData = z.infer<typeof scheduleAgendaCardsSchema>;

const CATEGORY_LABELS: Record<string, string> = {
  ceremony: 'Ceremony',
  cocktails: 'Cocktails',
  reception: 'Reception',
  dinner: 'Dinner',
  dancing: 'Dancing',
  other: '',
};

const ACCENT_CLASSES = {
  rose: { border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-400' },
  stone: { border: 'border-stone-300', bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-500' },
  amber: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' },
  teal: { border: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-600', dot: 'bg-teal-400' },
};

export const defaultScheduleAgendaCardsData: ScheduleAgendaCardsData = {
  eyebrow: 'The big day',
  headline: 'Day-of Schedule',
  date: 'Saturday, June 14th, 2025',
  showDate: true,
  accentColor: 'rose',
  events: [
    { id: '1', time: '3:30 PM', endTime: '4:00 PM', label: 'Guests Arrive', description: 'Find your seat and enjoy pre-ceremony music', location: 'Main Hall', category: 'other', image: '' },
    { id: '2', time: '4:00 PM', endTime: '5:00 PM', label: 'Ceremony', description: 'The exchange of vows in the garden', location: 'Garden Terrace', category: 'ceremony', image: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id: '3', time: '5:00 PM', endTime: '6:30 PM', label: 'Cocktail Hour', description: 'Champagne, wine, and passed hors d\'oeuvres', location: 'The Courtyard', category: 'cocktails', image: '' },
    { id: '4', time: '6:30 PM', endTime: '9:00 PM', label: 'Reception Dinner', description: 'Seated dinner, toasts, and the first dance', location: 'Grand Ballroom', category: 'dinner', image: '' },
    { id: '5', time: '9:00 PM', endTime: '11:00 PM', label: 'Dancing', description: 'Let\'s celebrate on the dance floor', location: 'Grand Ballroom', category: 'dancing', image: '' },
    { id: '6', time: '11:00 PM', endTime: '', label: 'Farewell', description: 'Thank you for celebrating with us!', location: '', category: 'other', image: '' },
  ],
};

const ScheduleAgendaCards: React.FC<SectionComponentProps<ScheduleAgendaCardsData>> = ({ data }) => {
  const accent = ACCENT_CLASSES[data.accentColor];

  return (
    <section className="py-32 md:py-40 bg-gradient-to-b from-stone-50 to-white" id="schedule">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 mb-2 tracking-tight">{data.headline}</h2>
          {data.showDate && data.date && (
            <p className="text-stone-400 text-base font-light">{data.date}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {data.events.map(event => {
            const categoryLabel = CATEGORY_LABELS[event.category];
            return (
              <div
                key={event.id}
                className={`bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-shadow ${
                  event.category !== 'other' ? accent.border : 'border-stone-100'
                }`}
              >
                {event.image && (
                  <div className="h-36 overflow-hidden">
                    <img src={event.image} alt={event.label} className="w-full h-full object-cover saturate-[1.03] contrast-[1.02]" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.category !== 'other' ? accent.dot : 'bg-stone-300'}`} />
                      <div className="flex items-center gap-1.5 text-stone-400">
                        <Clock size={12} />
                        <span className="text-xs font-medium tabular-nums">
                          {event.time}{event.endTime ? ` — ${event.endTime}` : ''}
                        </span>
                      </div>
                    </div>
                    {categoryLabel && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${accent.bg} ${accent.text}`}>
                        {categoryLabel}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-stone-900 leading-tight">{event.label}</h3>

                  {event.description && (
                    <p className="text-sm text-stone-500 font-light mt-1.5 leading-relaxed">{event.description}</p>
                  )}

                  {event.location && (
                    <div className="flex items-center gap-1.5 mt-3 text-stone-400">
                      <MapPin size={11} />
                      <span className="text-xs uppercase tracking-wide font-medium">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const scheduleAgendaCardsDefinition: SectionDefinition<ScheduleAgendaCardsData> = {
  type: 'schedule',
  variant: 'agendaCards',
  schema: scheduleAgendaCardsSchema,
  defaultData: defaultScheduleAgendaCardsData,
  Component: ScheduleAgendaCards,
};
