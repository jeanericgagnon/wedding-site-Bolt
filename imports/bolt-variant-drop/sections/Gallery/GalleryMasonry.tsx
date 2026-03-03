import { Section } from '../../types/layoutConfig';

interface GalleryMasonryProps {
  section: Section;
}

export default function GalleryMasonry({ section }: GalleryMasonryProps) {
  const images = [
    { src: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg', tall: true },
    { src: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg', tall: false },
    { src: 'https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg', tall: false },
    { src: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg', tall: true },
    { src: 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg', tall: false },
    { src: 'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg', tall: true },
  ];

  return (
    <section className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-white">Gallery</h2>
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="mb-4 break-inside-avoid">
              <img
                src={image.src}
                alt={`Gallery ${index + 1}`}
                className="w-full rounded-lg hover:opacity-80 transition-opacity"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
