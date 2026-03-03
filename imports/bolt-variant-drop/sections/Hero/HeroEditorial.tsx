import { Section } from '../../types/layoutConfig';

interface HeroEditorialProps {
  section: Section;
}

export default function HeroEditorial({ section }: HeroEditorialProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';

  return (
    <section className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg')] bg-cover bg-center opacity-40" />
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-sm tracking-[0.5em] mb-8 text-gray-400 uppercase">Wedding Celebration</div>
              <h1 className="text-8xl font-bold mb-4 leading-none">{bride}</h1>
              <h1 className="text-8xl font-bold mb-12 leading-none">{groom}</h1>
              <div className="text-2xl tracking-wide text-gray-300">{date}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
