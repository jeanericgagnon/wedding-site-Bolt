import { Section } from '../../types/layoutConfig';

interface GalleryFullwidthProps {
  section: Section;
}

export default function GalleryFullwidth({ section }: GalleryFullwidthProps) {
  const images = [
    'https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg',
    'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg',
    'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg',
  ];

  return (
    <section className="py-0">
      <div className="space-y-0">
        {images.map((image, index) => (
          <div key={index} className="relative h-screen w-full">
            <img
              src={image}
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        ))}
      </div>
    </section>
  );
}
