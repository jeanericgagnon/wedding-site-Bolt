import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Clock } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const ScheduleSection: React.FC<Props> = ({ data, instance }) => {
  const { schedule, venues } = data;
  const { settings, bindings } = instance;
  
  const itemsToShow = bindings.scheduleItemIds && bindings.scheduleItemIds.length > 0
    ? schedule.filter(s => bindings.scheduleItemIds!.includes(s.id))
    : schedule;

  if (itemsToShow.length === 0) {
    return (
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-bold text-text-primary mb-8">
              {settings.title || 'Schedule'}
            </h2>
          )}
          <p className="text-text-secondary">Schedule details coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary text-center mb-12">
            {settings.title || 'Schedule'}
          </h2>
        )}
        <div className="space-y-6">
          {itemsToShow.map(item => {
            const venue = item.venueId ? venues.find(v => v.id === item.venueId) : null;
            const time = item.startTimeISO ? new Date(item.startTimeISO).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : 'Time TBD';

            return (
              <div key={item.id} className="border-l-4 border-primary pl-6">
                <h3 className="text-xl font-semibold text-text-primary mb-1">
                  {item.label}
                </h3>
                <p className="text-text-secondary flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  {time}
                </p>
                {venue && (
                  <p className="text-sm text-text-secondary">{venue.name}</p>
                )}
                {item.notes && (
                  <p className="text-sm text-text-secondary mt-2">{item.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
