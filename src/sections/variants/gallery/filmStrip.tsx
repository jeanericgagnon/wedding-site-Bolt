import React, { useState, useRef, useEffect } from 'react';
import { z } from 'zod';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const GalleryImageSchema = z.object({
  id: z.string(),
  url: z.string().default(''),
  alt: z.string().default(''),
  caption: z.string().default(''),
});

export const galleryFilmStripSchema = z.object({
  eyebrow: z.string().default('Our moments'),
  headline: z.string().default('Photos'),
  images: z.array(GalleryImageSchema).default([]),
  showCaptions: z.boolean().default(true),
  enableLightbox: z.boolean().default(true),
  animation: z.enum(['none', 'fade', 'slide-up', 'zoom']).default('slide-up'),
  autoScroll: z.boolean().default(false),
  continuousGlide: z.boolean().default(true),
  glideSpeed: z.number().min(10).max(90).default(42),
});

export type GalleryFilmStripData = z.infer<typeof galleryFilmStripSchema>;

const SAMPLE_PHOTOS = [
  { url: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Couple' },
  { url: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Venue' },
  { url: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Flowers' },
  { url: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Detail' },
  { url: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Rings' },
  { url: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Portrait' },
  { url: 'https://images.pexels.com/photos/1043902/pexels-photo-1043902.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'First dance' },
  { url: 'https://images.pexels.com/photos/3812743/pexels-photo-3812743.jpeg?auto=compress&cs=tinysrgb&w=800', alt: 'Ceremony' },
];

export const defaultGalleryFilmStripData: GalleryFilmStripData = {
  eyebrow: 'Our moments',
  headline: 'Photos',
  showCaptions: true,
  enableLightbox: true,
  animation: 'slide-up',
  autoScroll: false,
  continuousGlide: true,
  glideSpeed: 42,
  images: SAMPLE_PHOTOS.map((p, i) => ({ id: String(i + 1), url: p.url, alt: p.alt, caption: '' })),
};

const GalleryFilmStrip: React.FC<SectionComponentProps<GalleryFilmStripData>> = ({ data }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isGlidePaused, setIsGlidePaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!data.autoScroll || data.images.length === 0) return;
    const ms = Math.max(1400, 5200 - data.glideSpeed * 40);
    const interval = setInterval(() => {
      setActiveIndex(i => (i + 1) % data.images.length);
    }, ms);
    return () => clearInterval(interval);
  }, [data.autoScroll, data.images.length, data.glideSpeed]);

  useEffect(() => {
    if (!stripRef.current) return;
    const thumbEl = stripRef.current.children[activeIndex] as HTMLElement;
    if (thumbEl) thumbEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIndex]);

  const closeLightbox = () => setLightboxIndex(null);
  const prevLightbox = () => setLightboxIndex(i => i === null ? null : (i - 1 + data.images.length) % data.images.length);
  const nextLightbox = () => setLightboxIndex(i => i === null ? null : (i + 1) % data.images.length);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevLightbox();
      else if (e.key === 'ArrowRight') nextLightbox();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [lightboxIndex]);

  const active = data.images[activeIndex];

  const heroAnimClass = data.animation === 'none' ? '' :
    data.animation === 'fade' ? (isVisible ? 'opacity-100' : 'opacity-0') :
    data.animation === 'slide-up' ? (isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8') :
    data.animation === 'zoom' ? (isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95') : '';

  return (
    <>
      <style>{`@keyframes filmstripMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(calc(-50% - 0.25rem)); } }`}</style>
      <section ref={sectionRef} className="py-32 md:py-40 bg-stone-900" id="gallery">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-10">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-white tracking-tight">{data.headline}</h2>
        </div>

        {data.images.length > 0 && (
          <>
            <div
              className={`relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden mb-4 cursor-pointer group transition-[opacity,transform] duration-700 ${heroAnimClass}`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
              onClick={() => data.enableLightbox && setLightboxIndex(activeIndex)}
            >
              {data.images.map((img, idx) => (
                <div
                  key={img.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${idx === activeIndex ? 'opacity-100' : 'opacity-0'}`}
                >
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover saturate-[1.03] contrast-[1.02]" />
                </div>
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

              {data.images.length > 1 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setActiveIndex(i => (i - 1 + data.images.length) % data.images.length); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setActiveIndex(i => (i + 1) % data.images.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {data.showCaptions && active?.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white/80 text-sm font-light">{active.caption}</p>
                </div>
              )}

              <div className="absolute bottom-3 right-3 text-white/40 text-xs font-medium">
                {activeIndex + 1} / {data.images.length}
              </div>
            </div>

            {data.continuousGlide ? (
              <div
                className="relative overflow-hidden pb-1"
                onMouseEnter={() => setIsGlidePaused(true)}
                onMouseLeave={() => setIsGlidePaused(false)}
              >
                <div
                  className="flex gap-2 w-max"
                  style={{
                    animation: `filmstripMarquee ${Math.max(16, 72 - data.glideSpeed * 0.6)}s linear infinite`,
                    animationPlayState: isGlidePaused ? 'paused' : 'running',
                  }}
                >
                  {[...data.images, ...data.images].map((img, i) => {
                    const idx = i % data.images.length;
                    return (
                      <button
                        key={`${img.id}-${i}`}
                        onClick={() => setActiveIndex(idx)}
                        className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden transition-all ${
                          idx === activeIndex
                            ? 'ring-2 ring-white scale-105 opacity-100'
                            : 'opacity-40 hover:opacity-70 scale-100'
                        }`}
                      >
                        <img src={img.url} alt={img.alt} className="w-full h-full object-cover saturate-[1.03] contrast-[1.02]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                ref={stripRef}
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x"
                style={{ scrollbarWidth: 'none' }}
              >
                {data.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden transition-all snap-start ${
                      idx === activeIndex
                        ? 'ring-2 ring-white scale-105 opacity-100'
                        : 'opacity-40 hover:opacity-70 scale-100'
                    }`}
                  >
                    <img src={img.url} alt={img.alt} className="w-full h-full object-cover saturate-[1.03] contrast-[1.02]" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button onClick={e => { e.stopPropagation(); closeLightbox(); }} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X size={18} />
          </button>
          <button onClick={e => { e.stopPropagation(); prevLightbox(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="max-w-5xl max-h-[85vh] px-16" onClick={e => e.stopPropagation()}>
            <img src={data.images[lightboxIndex].url} alt={data.images[lightboxIndex].alt} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
          <button onClick={e => { e.stopPropagation(); nextLightbox(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <ChevronRight size={20} />
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">{lightboxIndex + 1} / {data.images.length}</p>
        </div>
      )}
      </section>
    </>
  );
};

export const galleryFilmStripDefinition: SectionDefinition<GalleryFilmStripData> = {
  type: 'gallery',
  variant: 'filmStrip',
  schema: galleryFilmStripSchema,
  defaultData: defaultGalleryFilmStripData,
  Component: GalleryFilmStrip,
};
