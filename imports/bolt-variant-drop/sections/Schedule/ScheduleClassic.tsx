import { Clock } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface ScheduleClassicProps {
  section: Section;
}

export default function ScheduleClassic({ section }: ScheduleClassicProps) {
  const events = [
    { time: '3:30 PM', title: 'Guest Arrival', description: 'Please arrive early to find your seats' },
    { time: '4:00 PM', title: 'Ceremony', description: 'The celebration begins' },
    { time: '5:00 PM', title: 'Cocktail Hour', description: 'Drinks and hors d\'oeuvres' },
    { time: '6:00 PM', title: 'Reception', description: 'Dinner, dancing, and merriment' },
    { time: '11:00 PM', title: 'Send Off', description: 'A fond farewell' },
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Schedule</h2>
        <div className="space-y-8">
          {events.map((event, index) => (
            <div key={index} className="flex gap-6 items-start">
              <div className="flex items-center gap-3 min-w-[140px]">
                <Clock className="w-5 h-5 text-rose-400" />
                <span className="text-lg font-semibold text-gray-800">{event.time}</span>
              </div>
              <div className="flex-1 pb-8 border-l-2 border-rose-200 pl-6">
                <h3 className="text-2xl font-serif mb-2 text-gray-800">{event.title}</h3>
                <p className="text-gray-600">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
