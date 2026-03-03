import { MapPin, Clock, Utensils } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface VenueCardsProps {
  section: Section;
}

export default function VenueCards({ section }: VenueCardsProps) {
  const ceremonyVenue = section.bindings?.ceremonyVenue || 'Garden Chapel';
  const ceremonyAddress = section.bindings?.ceremonyAddress || '123 Chapel Lane';
  const ceremonyTime = section.bindings?.ceremonyTime || '4:00 PM';
  const receptionVenue = section.bindings?.receptionVenue || 'Grand Ballroom';
  const receptionAddress = section.bindings?.receptionAddress || '456 Reception Ave';
  const receptionTime = section.bindings?.receptionTime || '6:00 PM';

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Venues</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
            <div className="h-64 bg-[url('https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg')] bg-cover bg-center" />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="w-6 h-6 text-rose-500" />
                <span className="text-2xl font-semibold text-gray-800">{ceremonyTime}</span>
              </div>
              <h3 className="text-3xl font-serif mb-4 text-gray-800">{ceremonyVenue}</h3>
              <div className="flex items-start gap-3 text-gray-600">
                <MapPin className="w-5 h-5 mt-1 text-gray-400" />
                <p>{ceremonyAddress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
            <div className="h-64 bg-[url('https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg')] bg-cover bg-center" />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Utensils className="w-6 h-6 text-amber-500" />
                <span className="text-2xl font-semibold text-gray-800">{receptionTime}</span>
              </div>
              <h3 className="text-3xl font-serif mb-4 text-gray-800">{receptionVenue}</h3>
              <div className="flex items-start gap-3 text-gray-600">
                <MapPin className="w-5 h-5 mt-1 text-gray-400" />
                <p>{receptionAddress}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
