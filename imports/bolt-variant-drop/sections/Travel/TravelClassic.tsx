import { Plane, Hotel, Car } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface TravelClassicProps {
  section: Section;
}

export default function TravelClassic({ section }: TravelClassicProps) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Travel & Accommodations</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <Plane className="w-12 h-12 mx-auto mb-4 text-rose-400" />
            <h3 className="text-2xl font-serif mb-4 text-gray-800">Airport</h3>
            <p className="text-gray-600">The closest airport is International Airport (ABC), 30 minutes from the venue.</p>
          </div>
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <Hotel className="w-12 h-12 mx-auto mb-4 text-rose-400" />
            <h3 className="text-2xl font-serif mb-4 text-gray-800">Hotels</h3>
            <p className="text-gray-600">We have room blocks at nearby hotels. Details will be shared soon.</p>
          </div>
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <Car className="w-12 h-12 mx-auto mb-4 text-rose-400" />
            <h3 className="text-2xl font-serif mb-4 text-gray-800">Transportation</h3>
            <p className="text-gray-600">Shuttle service will be provided between hotels and the venue.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
