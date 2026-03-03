import { Flower2 } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface HeroGardenProps {
  section: Section;
}

export default function HeroGarden({ section }: HeroGardenProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';

  return (
    <section className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center relative">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg')] bg-cover bg-center opacity-10" />
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className="flex justify-center items-center gap-4 mb-8">
          <Flower2 className="w-10 h-10 text-emerald-500" />
          <Flower2 className="w-14 h-14 text-emerald-600" />
          <Flower2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h1 className="text-7xl md:text-8xl font-serif mb-6 text-emerald-900">
          {bride} <span className="text-emerald-500">&</span> {groom}
        </h1>
        <div className="text-2xl md:text-3xl text-emerald-700 mb-8 font-light">
          {date}
        </div>
        <p className="text-lg text-emerald-600 italic max-w-2xl mx-auto">
          Join us for a garden celebration of love and new beginnings
        </p>
      </div>
    </section>
  );
}
