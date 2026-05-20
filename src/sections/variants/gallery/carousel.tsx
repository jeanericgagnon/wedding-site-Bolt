import React from 'react';
import { z } from 'zod';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { sanitizePublicGalleryImages } from './publicGallery';

const GalleryImageSchema = z.object({
  id: z.string(),
  url: z.string().default(''),
  alt: z.string().default(''),
  caption: z.string().default(''),
});

export const galleryCarouselSchema = z.object({
  eyebrow: z.string().default('Our moments'),
  headline: z.string().default('Photos'),
  images: z.array(GalleryImageSchema).default([]),
  showCaptions: z.boolean().default(true),
  autoplay: z.boolean().default(true),
  glideSpeed: z.number().default(6),
});

export type GalleryCarouselData = z.infer<typeof galleryCarouselSchema>;

const SAMPLE_PHOTOS = [
  { url: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1400', alt: 'Couple portrait' },
  { url: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=1400', alt: 'Ceremony venue' },
  { url: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=1400', alt: 'Floral detail' },
  { url: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=1400', alt: 'Reception table' },
];

export const defaultGalleryCarouselData: GalleryCarouselData = {
  eyebrow: 'Our moments',
  headline: 'Photos',
  showCaptions: true,
  autoplay: true,
  glideSpeed: 6,
  images: SAMPLE_PHOTOS.map((photo, i) => ({
    id: String(i + 1),
    url: photo.url,
    alt: photo.alt,
    caption: '',
  })),
};

const GalleryCarousel: React.FC<SectionComponentProps<GalleryCarouselData>> = ({ data }) => {
  const slides = sanitizePublicGalleryImages(data.images);
  const [index, setIndex] = React.useState(0);
  const total = slides.length;

  React.useEffect(() => {
    setIndex(0);
  }, [data.images]);

  React.useEffect(() => {
    if (!data.autoplay || total <= 1) return;
    const speedSeconds = Math.min(Math.max(data.glideSpeed || 6, 2), 20);
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, speedSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [data.autoplay, data.glideSpeed, total]);

  React.useEffect(() => {
    if (index >= total && total > 0) setIndex(0);
  }, [index, total]);

  const goPrev = () => setIndex((prev) => (prev - 1 + total) % total);
  const goNext = () => setIndex((prev) => (prev + 1) % total);

  return (
    <section className="py-24 md:py-32 bg-white" id="gallery">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-10">
          {data.eyebrow && (
            <p className="text-sm text-stone-400 font-light mb-3">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900">{data.headline}</h2>
        </div>

        {total > 0 ? (
          <div className="relative">
            <div className="relative aspect-[16/10] md:aspect-[21/9] overflow-hidden rounded-2xl bg-stone-100">
              {slides.map((slide, i) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  <img
                    src={slide.url}
                    alt={slide.alt || 'Gallery photo'}
                    className="w-full h-full object-cover"
                    loading={i === index ? 'eager' : 'lazy'}
                  />
                  {data.showCaptions && slide.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-4">
                      <p className="text-white/90 text-sm md:text-base">{slide.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/35 text-white hover:bg-black/55 transition-colors flex items-center justify-center"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/35 text-white hover:bg-black/55 transition-colors flex items-center justify-center"
                  aria-label="Next photo"
                >
                  <ChevronRight size={20} />
                </button>

                <div className="mt-4 flex items-center justify-center gap-1.5">
                  {slides.map((slide, i) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setIndex(i)}
                      className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-stone-800' : 'w-2 bg-stone-300 hover:bg-stone-400'}`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-200 py-16 text-center text-stone-400 text-sm">
            Photos will appear once they’re added.
          </div>
        )}
      </div>
    </section>
  );
};

export const galleryCarouselDefinition: SectionDefinition<GalleryCarouselData> = {
  type: 'gallery',
  variant: 'carousel',
  schema: galleryCarouselSchema,
  defaultData: defaultGalleryCarouselData,
  Component: GalleryCarousel,
};
