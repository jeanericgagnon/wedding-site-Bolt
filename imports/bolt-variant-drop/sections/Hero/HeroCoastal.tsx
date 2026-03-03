import { Waves } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface HeroCoastalProps {
  section: Section;
}

export default function HeroCoastal({ section }: HeroCoastalProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';

  return (
    <section className="min-h-screen bg-gradient-to-b from-sky-100 via-blue-50 to-cyan-50 flex items-center justify-center relative">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg')] bg-cover bg-center opacity-25" />
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <Waves className="w-20 h-20 mx-auto mb-8 text-blue-400" />
        <h1 className="text-7xl md:text-8xl font-serif mb-6 text-blue-900" style={{ fontFamily: 'Georgia, serif' }}>
          {bride} & {groom}
        </h1>
        <div className="text-2xl md:text-3xl text-blue-600 mb-4 font-light tracking-wide">
          {date}
        </div>
        <p className="text-xl text-blue-500 italic">By the sea, where our journey begins</p>
      </div>
    </section>
  );
}
