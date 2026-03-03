import { MapPin, Clock } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface VenueClassicProps {
  section: Section;
}

export default function VenueClassic({ section }: VenueClassicProps) {
  const venueName = section.bindings?.venueName || 'The Grand Estate';
  const address = section.bindings?.address || '123 Beautiful Lane, City, State 12345';
  const ceremonyTime = section.bindings?.ceremonyTime || '4:00 PM';
  const receptionTime = section.bindings?.receptionTime || '6:00 PM';

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Venue</h2>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden">
            <img
              src="https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg"
              alt="Venue"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="text-3xl font-serif mb-4 text-gray-800">{venueName}</h3>
              <div className="flex items-start gap-3 text-gray-600 mb-6">
                <MapPin className="w-5 h-5 mt-1 text-rose-400" />
                <p>{address}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="font-semibold text-gray-800">Ceremony</div>
                  <div className="text-gray-600">{ceremonyTime}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="font-semibold text-gray-800">Reception</div>
                  <div className="text-gray-600">{receptionTime}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
