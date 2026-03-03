import { Heart } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface HeroClassicProps {
  section: Section;
}

export default function HeroClassic({ section }: HeroClassicProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';
  const location = section.bindings?.location || 'Somewhere Beautiful';

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg')] bg-cover bg-center opacity-20" />
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <Heart className="w-16 h-16 mx-auto mb-8 text-rose-400" />
        <h1 className="text-7xl md:text-8xl font-serif mb-6 text-gray-800">
          {bride} <span className="text-rose-400">&</span> {groom}
        </h1>
        <div className="text-2xl md:text-3xl text-gray-600 mb-4 font-light tracking-wide">
          {date}
        </div>
        <div className="text-xl md:text-2xl text-gray-500 font-light">
          {location}
        </div>
      </div>
    </section>
  );
}
