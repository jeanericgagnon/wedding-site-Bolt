import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface GalleryCarouselProps {
  section: Section;
}

export default function GalleryCarousel({ section }: GalleryCarouselProps) {
  const images = [
    'https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg',
    'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg',
    'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg',
    'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg',
  ];

  return (
    <section className="py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-white">Our Moments</h2>

        <div className="relative">
          <div className="aspect-[16/9] bg-gray-800 rounded-2xl overflow-hidden">
            <img
              src={images[0]}
              alt="Gallery"
              className="w-full h-full object-cover"
            />
          </div>

          <button className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-900" />
          </button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-colors">
            <ChevronRight className="w-6 h-6 text-gray-900" />
          </button>

          <div className="flex gap-3 justify-center mt-8">
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === 0 ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-8">
          {images.map((image, index) => (
            <div key={index} className="aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity">
              <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
