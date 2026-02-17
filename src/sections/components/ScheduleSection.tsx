import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Clock, MapPin } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

function formatTime(iso: string | undefined): string {
  if (!iso) return 'Time TBD';
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    const parts = iso.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0]);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return hour12 + ':' + m + ' ' + ampm;
    }
    return iso;
  }
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
            <h2 className="text-4xl font-bold text-text-primary mb-8">{settings.title || 'Schedule'}</h2>
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
          <h2 className="text-4xl font-bold text-text-primary text-center mb-12">{settings.title || 'Schedule'}</h2>
        )}
        <div className="space-y-6">
          {itemsToShow.map(item => {
            const venue = item.venueId ? venues.find(v => v.id === item.venueId) : null;
            return (
              <div key={item.id} className="border-l-4 border-primary pl-6">
                <h3 className="text-xl font-semibold text-text-primary mb-1">{item.label}</h3>
                <p className="text-text-secondary flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  {formatTime(item.startTimeISO)}
                </p>
                {venue && <p className="text-sm text-text-secondary">{venue.name}</p>}
                {item.notes && <p className="text-sm text-text-secondary mt-2">{item.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const ScheduleTimeline: React.FC<Props> = ({ data, instance }) => {
  const { schedule, venues } = data;
  const { settings, bindings } = instance;
  const itemsToShow = bindings.scheduleItemIds && bindings.scheduleItemIds.length > 0
    ? schedule.filter(s => bindings.scheduleItemIds!.includes(s.id))
    : schedule;

  if (itemsToShow.length === 0) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-3xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-light text-text-primary mb-8">{settings.title || 'Schedule'}</h2>
          )}
          <p className="text-text-secondary">Schedule details coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-2xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">The day ahead</p>
            <h2 className="text-4xl font-light text-text-primary">{settings.title || 'Schedule'}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        <div className="relative">
          <div className="absolute left-[5.25rem] top-0 bottom-0 w-px bg-border" />
          <div className="space-y-10">
            {itemsToShow.map((item) => {
              const venue = item.venueId ? venues.find(v => v.id === item.venueId) : null;
              return (
                <div key={item.id} className="flex gap-6 items-start">
                  <div className="w-20 text-right flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">{formatTime(item.startTimeISO)}</span>
                  </div>
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-surface-subtle" />
                  </div>
                  <div className="flex-1 pb-2">
                    <h3 className="font-semibold text-text-primary mb-1">{item.label}</h3>
                    {venue && (
                      <p className="text-sm text-text-secondary flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {venue.name}
                      </p>
                    )}
                    {item.notes && <p className="text-sm text-text-secondary mt-1">{item.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
