import { Heart } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface StoryTimelineProps {
  section: Section;
}

export default function StoryTimeline({ section }: StoryTimelineProps) {
  const events = [
    { year: '2018', title: 'First Meeting', description: 'Our paths crossed at a mutual friend\'s party' },
    { year: '2019', title: 'First Date', description: 'A perfect evening that turned into many more' },
    { year: '2021', title: 'Moved In Together', description: 'Started building our life as one' },
    { year: '2024', title: 'The Proposal', description: 'Forever started with a simple yes' },
    { year: '2025', title: 'Our Wedding', description: 'Celebrating our love with you' },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-20 text-gray-800">Our Journey</h2>
        <div className="relative">
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-px bg-rose-200" />
          <div className="space-y-16">
            {events.map((event, index) => (
              <div key={index} className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-1/2 ${index % 2 === 0 ? 'pr-12 text-right' : 'pl-12 text-left'}`}>
                  <div className="text-3xl font-bold text-rose-400 mb-2">{event.year}</div>
                  <h3 className="text-2xl font-serif mb-2 text-gray-800">{event.title}</h3>
                  <p className="text-gray-600">{event.description}</p>
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-rose-400 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" fill="white" />
                  </div>
                </div>
                <div className="w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
