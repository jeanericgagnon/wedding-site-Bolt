import { Calendar } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface HeroSplitProps {
  section: Section;
}

export default function HeroSplit({ section }: HeroSplitProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';
  const location = section.bindings?.location || 'Somewhere Beautiful';

  return (
    <section className="min-h-screen grid md:grid-cols-2">
      <div className="relative bg-gray-900 flex items-center justify-center p-8">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg')] bg-cover bg-center opacity-40" />
        <div className="relative z-10 text-white text-center max-w-lg">
          <h1 className="text-6xl md:text-7xl font-serif mb-6">
            {bride}
          </h1>
          <div className="text-3xl font-light mb-4">&</div>
          <h1 className="text-6xl md:text-7xl font-serif">
            {groom}
          </h1>
        </div>
      </div>
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-8">
        <div className="text-center max-w-lg">
          <Calendar className="w-16 h-16 mx-auto mb-8 text-amber-600" />
          <div className="text-4xl md:text-5xl font-serif mb-6 text-gray-800">{date}</div>
          <div className="text-2xl text-gray-600 font-light">{location}</div>
        </div>
      </div>
    </section>
  );
}
