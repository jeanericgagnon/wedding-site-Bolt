import { Heart, Sparkles, Star } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface HeroPlayfulProps {
  section: Section;
}

export default function HeroPlayful({ section }: HeroPlayfulProps) {
  const bride = section.bindings?.bride || 'Jane';
  const groom = section.bindings?.groom || 'John';
  const date = section.bindings?.date || 'June 15, 2025';

  return (
    <section className="min-h-screen bg-gradient-to-br from-fuchsia-100 via-pink-100 to-yellow-100 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-10 left-10 animate-bounce">
        <Heart className="w-8 h-8 text-fuchsia-400" fill="currentColor" />
      </div>
      <div className="absolute bottom-20 right-20 animate-pulse">
        <Star className="w-10 h-10 text-yellow-400" fill="currentColor" />
      </div>
      <div className="absolute top-1/3 right-10 animate-bounce delay-150">
        <Sparkles className="w-6 h-6 text-pink-400" />
      </div>
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-8xl md:text-9xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 via-pink-500 to-yellow-500">
          {bride}
        </h1>
        <div className="text-5xl font-bold text-fuchsia-500 mb-6">&</div>
        <h1 className="text-8xl md:text-9xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-pink-500 to-fuchsia-600">
          {groom}
        </h1>
        <div className="text-3xl text-fuchsia-700 font-bold mb-4">{date}</div>
        <p className="text-2xl text-pink-600 font-semibold">Let's Party! 🎉</p>
      </div>
    </section>
  );
}
