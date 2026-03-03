import { Clock, Music, Camera, Utensils, Sparkles } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface ScheduleCardsProps {
  section: Section;
}

export default function ScheduleCards({ section }: ScheduleCardsProps) {
  const events = [
    { time: '3:30 PM', title: 'Guest Arrival', icon: Clock, color: 'blue' },
    { time: '4:00 PM', title: 'Ceremony', icon: Camera, color: 'rose' },
    { time: '5:00 PM', title: 'Cocktail Hour', icon: Utensils, color: 'amber' },
    { time: '6:00 PM', title: 'Reception & Dancing', icon: Music, color: 'purple' },
    { time: '11:00 PM', title: 'Send Off', icon: Sparkles, color: 'emerald' },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-900', icon: 'text-blue-500' },
      rose: { bg: 'bg-rose-50', text: 'text-rose-900', icon: 'text-rose-500' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-900', icon: 'text-amber-500' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-900', icon: 'text-purple-500' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-900', icon: 'text-emerald-500' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Timeline</h2>
        <div className="grid md:grid-cols-5 gap-6">
          {events.map((event, index) => {
            const Icon = event.icon;
            const colors = getColorClasses(event.color);
            return (
              <div key={index} className={`${colors.bg} rounded-2xl p-6 text-center`}>
                <Icon className={`w-10 h-10 mx-auto mb-4 ${colors.icon}`} />
                <div className={`text-2xl font-bold mb-2 ${colors.text}`}>{event.time}</div>
                <h3 className={`text-lg font-semibold ${colors.text}`}>{event.title}</h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
