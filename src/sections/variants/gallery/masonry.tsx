import React, { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const GalleryImageSchema = z.object({
  id: z.string(),
  url: z.string().default(''),
  alt: z.string().default(''),
  caption: z.string().default(''),
  span: z.enum(['1', '2']).default('1'),
});

export const galleryMasonrySchema = z.object({
  eyebrow: z.string().default('Our moments'),
  headline: z.string().default('Photos'),
  images: z.array(GalleryImageSchema).default([]),
  showCaptions: z.boolean().default(true),
  enableLightbox: z.boolean().default(true),
  animation: z.enum(['none', 'fade', 'slide-up', 'zoom']).default('fade'),
});

export type GalleryMasonryData = z.infer<typeof galleryMasonrySchema>;

const SAMPLE_PHOTOS = [
  { url: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Couple' },
  { url: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Venue' },
  { url: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Flowers' },
  { url: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Detail' },
  { url: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Rings' },
  { url: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Couple portrait' },
];

export const defaultGalleryMasonryData: GalleryMasonryData = {
  eyebrow: 'Our moments',
  headline: 'Photos',
  showCaptions: true,
  enableLightbox: true,
  animation: 'fade',
  images: SAMPLE_PHOTOS.map((p, i) => ({
    id: String(i + 1),
    url: p.url,
    alt: p.alt,
    caption: '',
    span: (i === 0 || i === 4) ? '2' : '1',
  })),
};

function useIntersection(ref: React.RefObject<Element | null>, threshold = 0.1) {
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
  }, []);
  return visible;
}

const MasonryCell: React.FC<{
  image: GalleryMasonryData['images'][number];
  idx: number;
  animation: string;
  showCaptions: boolean;
  enableLightbox: boolean;
  onOpen: (idx: number) => void;
}> = ({ image, idx, animation, showCaptions, enableLightbox, onOpen }) => {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useIntersection(ref);

  const animStyle: React.CSSProperties = animation === 'none' ? {} : {
    transitionDelay: `${(idx % 6) * 80}ms`,
    transitionDuration: '650ms',
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const animClasses = animation === 'none' ? '' :
    animation === 'fade' ? (visible ? 'opacity-100' : 'opacity-0') :
    animation === 'slide-up' ? (visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8') :
    animation === 'zoom' ? (visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95') : '';

  return (
    <div
      ref={ref}
      onClick={() => enableLightbox && onOpen(idx)}
      className={`${PHOTO_FRAME} ${
        image.span === '2' ? 'col-span-2' : ''
      } ${enableLightbox ? 'cursor-pointer' : ''} ${animClasses}`}
      style={animStyle}
    >
      <img
        src={image.url}
        alt={image.alt}
        className={PHOTO_IMG}
      />
      {enableLightbox && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      )}
      {showCaptions && image.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
          <p className="text-white text-xs font-light">{image.caption}</p>
        </div>
      )}
    </div>
  );
};

const SECTION_SHELL = "py-28 md:py-36 bg-gradient-to-b from-stone-50 to-white";
const CONTAINER_SHELL = "max-w-6xl mx-auto px-6 md:px-12";
const SECTION_TITLE = "text-4xl md:text-6xl font-light text-stone-900 tracking-tight text-balance";
const PHOTO_FRAME = "relative group overflow-hidden rounded-[1.4rem] bg-stone-200 ring-1 ring-stone-100/80 shadow-[0_12px_40px_-28px_rgba(28,25,23,0.45)] transition-[opacity,transform]";
const PHOTO_IMG = "w-full h-full object-cover saturate-[1.03] contrast-[1.02] transition-transform duration-700 group-hover:scale-105";

const GalleryMasonry: React.FC<SectionComponentProps<GalleryMasonryData>> = ({ data }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => setLightboxIndex(i => i === null ? null : (i - 1 + data.images.length) % data.images.length);
  const nextImage = () => setLightboxIndex(i => i === null ? null : (i + 1) % data.images.length);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage();
      else if (e.key === 'ArrowRight') nextImage();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [lightboxIndex]);

  return (
    <section className={SECTION_SHELL} id="gallery">
      <div className={CONTAINER_SHELL}>
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className={SECTION_TITLE}>{data.headline}</h2>
        </div>

        {data.images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 auto-rows-[220px] md:auto-rows-[250px] gap-3 md:gap-4">
            {data.images.map((image, idx) => (
              <MasonryCell
                key={image.id}
                image={image}
                idx={idx}
                animation={data.animation}
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
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors"
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
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors"
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

export const galleryMasonryDefinition: SectionDefinition<GalleryMasonryData> = {
  type: 'gallery',
  variant: 'masonry',
  schema: galleryMasonrySchema,
  defaultData: defaultGalleryMasonryData,
  Component: GalleryMasonry,
};
