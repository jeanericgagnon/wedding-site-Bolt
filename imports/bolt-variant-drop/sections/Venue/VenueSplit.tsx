import { MapPin, Clock, Info } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface VenueSplitProps {
  section: Section;
}

export default function VenueSplit({ section }: VenueSplitProps) {
  const venueName = section.bindings?.venueName || 'The Grand Estate';
  const address = section.bindings?.address || '123 Beautiful Lane, City, State 12345';
  const ceremonyTime = section.bindings?.ceremonyTime || '4:00 PM';
  const receptionTime = section.bindings?.receptionTime || '6:00 PM';
  const dresscode = section.bindings?.dresscode || 'Cocktail Attire';

  return (
    <section className="grid md:grid-cols-2 min-h-[600px]">
      <div className="relative bg-[url('https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg')] bg-cover bg-center" />
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-12 md:p-16 flex items-center">
        <div className="max-w-lg">
          <h2 className="text-4xl md:text-5xl font-serif mb-12">Location Details</h2>

          <div className="space-y-8">
            <div className="flex gap-4">
              <MapPin className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-2xl font-serif mb-2">{venueName}</h3>
                <p className="text-gray-300">{address}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Clock className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <div className="mb-3">
                  <div className="text-xl font-semibold mb-1">Ceremony</div>
                  <div className="text-gray-300">{ceremonyTime}</div>
                </div>
                <div>
                  <div className="text-xl font-semibold mb-1">Reception</div>
                  <div className="text-gray-300">{receptionTime}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Info className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <div className="text-xl font-semibold mb-1">Dress Code</div>
                <div className="text-gray-300">{dresscode}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
