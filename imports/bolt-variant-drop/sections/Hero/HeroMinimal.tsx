import { Section } from '../../types/layoutConfig';

interface HeroMinimalProps {
  section: Section;
}

export default function HeroMinimal({ section }: HeroMinimalProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || '06.15.2025';

  return (
    <section className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center px-4">
        <div className="space-y-12">
          <h1 className="text-8xl md:text-9xl font-light tracking-tight text-gray-900">
            {bride}
          </h1>
          <div className="text-4xl text-gray-300 font-extralight">&</div>
          <h1 className="text-8xl md:text-9xl font-light tracking-tight text-gray-900">
            {groom}
          </h1>
          <div className="pt-8 text-lg tracking-[0.3em] text-gray-400 uppercase">
            {date}
          </div>
        </div>
      </div>
    </section>
  );
}
