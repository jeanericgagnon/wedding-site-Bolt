import React, { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const GalleryImageSchema = z.object({
  id: z.string(),
  url: z.string().default(''),
  alt: z.string().default(''),
  caption: z.string().default(''),
});

export const galleryGridSchema = z.object({
  eyebrow: z.string().default('Our moments'),
  headline: z.string().default('Photos'),
  images: z.array(GalleryImageSchema).default([]),
  columns: z.enum(['2', '3', '4']).default('3'),
  showCaptions: z.boolean().default(false),
  enableLightbox: z.boolean().default(true),
  animation: z.enum(['none', 'fade', 'slide-up', 'zoom']).default('fade'),
  aspectRatio: z.enum(['square', 'landscape', 'portrait']).default('square'),
});

export type GalleryGridData = z.infer<typeof galleryGridSchema>;

const SAMPLE_PHOTOS = [
  { url: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Couple' },
  { url: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Venue' },
  { url: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Flowers' },
  { url: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Detail' },
  { url: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Rings' },
  { url: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Portrait' },
  { url: 'https://images.pexels.com/photos/1043902/pexels-photo-1043902.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'First dance' },
  { url: 'https://images.pexels.com/photos/3812743/pexels-photo-3812743.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Ceremony' },
  { url: 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Toast' },
];

export const defaultGalleryGridData: GalleryGridData = {
  eyebrow: 'Our moments',
  headline: 'Photos',
  columns: '3',
  showCaptions: false,
  enableLightbox: true,
  animation: 'fade',
  aspectRatio: 'square',
  images: SAMPLE_PHOTOS.map((p, i) => ({ id: String(i + 1), url: p.url, alt: p.alt, caption: '' })),
};

function useIntersection(ref: React.RefObject<Element | null>, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

const ASPECT_CLASS: Record<string, string> = {
  square: 'aspect-square',
  landscape: 'aspect-[4/3]',
  portrait: 'aspect-[3/4]',
};

const AnimatedImage: React.FC<{
  image: GalleryGridData['images'][number];
  idx: number;
  animation: string;
  aspectClass: string;
  showCaptions: boolean;
  enableLightbox: boolean;
  onOpen: (idx: number) => void;
}> = ({ image, idx, animation, aspectClass, showCaptions, enableLightbox, onOpen }) => {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useIntersection(ref);

  const animStyle: React.CSSProperties = animation === 'none' ? {} : {
    transitionDelay: `${(idx % 9) * 60}ms`,
    transitionDuration: '600ms',
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const animClasses = {
    none: '',
    fade: visible ? 'opacity-100' : 'opacity-0',
    'slide-up': visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
    zoom: visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
  }[animation] ?? '';

  return (
    <div
      ref={ref}
      onClick={() => enableLightbox && onOpen(idx)}
      className={`relative group overflow-hidden rounded-xl bg-stone-200 ${aspectClass} ${enableLightbox ? 'cursor-pointer' : ''} transition-[opacity,transform] ${animClasses}`}
      style={animStyle}
    >
      <img
        src={image.url}
        alt={image.alt}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      {enableLightbox && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-300 flex items-center justify-center">
          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}
      {showCaptions && image.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-white text-xs font-light">{image.caption}</p>
        </div>
      )}
    </div>
  );
};

const GalleryGrid: React.FC<SectionComponentProps<GalleryGridData>> = ({ data }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const colClass = {
    '2': 'grid-cols-2',
    '3': 'grid-cols-2 md:grid-cols-3',
    '4': 'grid-cols-2 md:grid-cols-4',
  }[data.columns] ?? 'grid-cols-2 md:grid-cols-3';

  const aspectClass = ASPECT_CLASS[data.aspectRatio] ?? 'aspect-square';

  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex(i => i === null ? null : (i - 1 + data.images.length) % data.images.length);
  const nextImage = () => setLightboxIndex(i => i === null ? null : (i + 1) % data.images.length);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage();
      else if (e.key === 'ArrowRight') nextImage();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex]);

  return (
    <section className="py-28 md:py-36 bg-white" id="gallery">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 tracking-tight">{data.headline}</h2>
        </div>

        {data.images.length > 0 ? (
          <div className={`grid ${colClass} gap-3 md:gap-4`}>
            {data.images.map((image, idx) => (
              <AnimatedImage
                key={image.id}
                image={image}
                idx={idx}
                animation={data.animation}
                aspectClass={aspectClass}
                showCaptions={data.showCaptions}
                enableLightbox={data.enableLightbox}
                onOpen={setLightboxIndex}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-stone-400">
            <p className="text-sm">No photos added yet</p>
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={e => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); prevImage(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="max-w-5xl max-h-[85vh] px-16" onClick={e => e.stopPropagation()}>
            <img
              src={data.images[lightboxIndex].url}
              alt={data.images[lightboxIndex].alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {data.showCaptions && data.images[lightboxIndex].caption && (
              <p className="text-white/70 text-sm text-center mt-3">{data.images[lightboxIndex].caption}</p>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); nextImage(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
            {lightboxIndex + 1} / {data.images.length}
          </p>
        </div>
      )}
    </section>
  );
};

export const galleryGridDefinition: SectionDefinition<GalleryGridData> = {
  type: 'gallery',
  variant: 'grid',
  schema: galleryGridSchema,
  defaultData: defaultGalleryGridData,
  Component: GalleryGrid,
};
