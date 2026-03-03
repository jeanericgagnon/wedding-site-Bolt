import { Section } from '../../types/layoutConfig';

interface VenueMinimalProps {
  section: Section;
}

export default function VenueMinimal({ section }: VenueMinimalProps) {
  const venueName = section.bindings?.venueName || 'The Grand Estate';
  const address = section.bindings?.address || '123 Beautiful Lane, City, State';

  return (
    <section className="py-32 bg-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="text-sm tracking-[0.3em] text-gray-400 uppercase mb-6">Location</div>
        <h2 className="text-6xl font-light mb-8 text-gray-900">{venueName}</h2>
        <p className="text-xl text-gray-500 font-light tracking-wide">{address}</p>
      </div>
    </section>
  );
}
