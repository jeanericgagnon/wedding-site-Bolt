import { Plane, Hotel } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface TravelCompactProps {
  section: Section;
}

export default function TravelCompact({ section }: TravelCompactProps) {
  return (
    <section className="py-20 bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-4xl font-serif text-center mb-12">Travel Information</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex items-start gap-4">
            <Plane className="w-8 h-8 text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Airport</h3>
              <p className="text-gray-300">International Airport (ABC) - 30 min drive</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Hotel className="w-8 h-8 text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-semibold mb-2">Accommodations</h3>
              <p className="text-gray-300">Hotel blocks available - details on RSVP</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
