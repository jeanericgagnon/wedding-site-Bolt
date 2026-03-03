import { Sparkles } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface HeroLuxuryProps {
  section: Section;
}

export default function HeroLuxury({ section }: HeroLuxuryProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';
  const venue = section.bindings?.venue || 'Grand Ballroom';

  return (
    <section className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg')] bg-cover bg-center opacity-20" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <Sparkles className="w-12 h-12 mx-auto mb-8 text-amber-400" />
        <div className="text-sm tracking-[0.4em] mb-6 text-amber-400 uppercase">Request the Honour of Your Presence</div>
        <h1 className="text-7xl md:text-8xl font-serif mb-8 text-white">
          {bride} & {groom}
        </h1>
        <div className="w-24 h-px bg-amber-400 mx-auto mb-8" />
        <div className="text-2xl text-gray-300 mb-4 tracking-wide">{date}</div>
        <div className="text-xl text-gray-400 italic">{venue}</div>
      </div>
    </section>
  );
}
