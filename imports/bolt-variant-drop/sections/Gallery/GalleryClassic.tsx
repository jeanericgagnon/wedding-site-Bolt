import { Section } from '../../types/layoutConfig';

interface GalleryClassicProps {
  section: Section;
}

export default function GalleryClassic({ section }: GalleryClassicProps) {
  const images = [
    'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
    'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg',
    'https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg',
    'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg',
    'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg',
    'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg',
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Our Memories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
              <img
                src={image}
                alt={`Gallery ${index + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
