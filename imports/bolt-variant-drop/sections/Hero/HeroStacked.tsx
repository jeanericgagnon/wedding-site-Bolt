import { Heart } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface HeroStackedProps {
  section: Section;
}

export default function HeroStacked({ section }: HeroStackedProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';
  const location = section.bindings?.location || 'Somewhere Beautiful';

  return (
    <section className="min-h-screen bg-white">
      <div className="h-[60vh] relative bg-[url('https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
      </div>
      <div className="max-w-3xl mx-auto px-4 -mt-32 relative z-10 text-center pb-24">
        <Heart className="w-12 h-12 mx-auto mb-6 text-rose-500" />
        <h1 className="text-6xl md:text-7xl font-serif mb-4 text-gray-900">
          {bride} & {groom}
        </h1>
        <div className="h-px w-24 bg-rose-300 mx-auto my-8" />
        <div className="text-3xl text-gray-700 mb-3">{date}</div>
        <div className="text-xl text-gray-500">{location}</div>
      </div>
    </section>
  );
}
