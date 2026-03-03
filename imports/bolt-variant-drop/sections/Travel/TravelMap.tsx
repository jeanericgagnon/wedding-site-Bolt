import { MapPin, Plane, Hotel, Navigation } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface TravelMapProps {
  section: Section;
}

export default function TravelMap({ section }: TravelMapProps) {
  return (
    <section className="py-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Getting There</h2>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="relative h-[500px] bg-gray-200 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1252459/pexels-photo-1252459.jpeg')] bg-cover bg-center opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="w-24 h-24 text-blue-600" />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Plane className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-serif mb-3 text-gray-800">Flying In</h3>
                <p className="text-gray-600 leading-relaxed">
                  The nearest airport is International Airport (ABC), located 30 minutes from the venue.
                  Direct flights available from most major cities.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Hotel className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <h3 className="text-2xl font-serif mb-3 text-gray-800">Where to Stay</h3>
                <p className="text-gray-600 leading-relaxed">
                  We have room blocks at The Grand Hotel and The Boutique Inn.
                  Use code "WEDDING2025" when booking for special rates.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Navigation className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-2xl font-serif mb-3 text-gray-800">Transportation</h3>
                <p className="text-gray-600 leading-relaxed">
                  Complimentary shuttle service between hotels and venue.
                  Ride-sharing services also readily available.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
