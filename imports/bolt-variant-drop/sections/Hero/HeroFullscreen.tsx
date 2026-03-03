import { ChevronDown } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface HeroFullscreenProps {
  section: Section;
}

export default function HeroFullscreen({ section }: HeroFullscreenProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';

  return (
    <section className="relative h-screen flex items-center justify-center">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 text-center px-4 text-white">
        <div className="text-xl md:text-2xl tracking-widest uppercase mb-8 font-light">Together Forever</div>
        <h1 className="text-8xl md:text-9xl font-serif mb-8">
          {bride} & {groom}
        </h1>
        <div className="text-2xl md:text-3xl tracking-wider font-light">{date}</div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white animate-bounce">
        <ChevronDown className="w-8 h-8" />
      </div>
    </section>
  );
}
