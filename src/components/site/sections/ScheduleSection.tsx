import React from 'react';
import { Calendar } from 'lucide-react';
import type { ScheduleContent } from '../../../types/siteConfig';

interface ScheduleSectionProps {
  content: ScheduleContent;
}

export const ScheduleSection: React.FC<ScheduleSectionProps> = ({ content }) => {
  return (
    <section className="py-16 px-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-text-primary text-center mb-12">
          Schedule
        </h2>

        <div className="space-y-6">
          {content.items.map((item) => (
            <div key={item.id} className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-24 text-right">
                <p className="font-semibold text-primary">{item.time}</p>
              </div>
              <div className="flex-shrink-0">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-1">{item.title}</h3>
                {item.description && (
                  <p className="text-text-secondary text-sm mb-1">{item.description}</p>
                )}
                {item.location && (
                  <p className="text-text-secondary text-sm italic">{item.location}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
