import { Section } from '../../types/layoutConfig';

interface ScheduleMinimalProps {
  section: Section;
}

export default function ScheduleMinimal({ section }: ScheduleMinimalProps) {
  const events = [
    { time: '3:30 PM', title: 'Guest Arrival' },
    { time: '4:00 PM', title: 'Ceremony' },
    { time: '5:00 PM', title: 'Cocktail Hour' },
    { time: '6:00 PM', title: 'Reception' },
    { time: '11:00 PM', title: 'Send Off' },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-2xl mx-auto px-4">
        <h2 className="text-4xl font-serif text-center mb-20 text-gray-900">Order of Events</h2>
        <div className="space-y-1">
          {events.map((event, index) => (
            <div key={index} className="flex items-center justify-between py-6 border-b border-gray-200">
              <span className="text-2xl font-light text-gray-900">{event.title}</span>
              <span className="text-xl text-gray-500 font-mono">{event.time}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
