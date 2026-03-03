import { Section } from '../../types/layoutConfig';

interface HeroMoodyProps {
  section: Section;
}

export default function HeroMoody({ section }: HeroMoodyProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center relative">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg')] bg-cover bg-center opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <h1 className="text-7xl md:text-9xl font-light mb-6 text-white tracking-tight">
          {bride}
        </h1>
        <div className="text-3xl text-purple-300 font-serif italic mb-6">and</div>
        <h1 className="text-7xl md:text-9xl font-light mb-12 text-white tracking-tight">
          {groom}
        </h1>
        <div className="w-32 h-px bg-purple-400 mx-auto mb-8" />
        <div className="text-xl tracking-widest text-purple-200 uppercase">{date}</div>
      </div>
    </section>
  );
}
