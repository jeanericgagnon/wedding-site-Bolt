import React, { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const QuoteItemSchema = z.object({
  id: z.string(),
  text: z.string().default(''),
  author: z.string().default(''),
  role: z.string().default(''),
  photo: z.string().default(''),
});

export const quotesCarouselSchema = z.object({
  eyebrow: z.string().default('Wishes & Words'),
  headline: z.string().default('What everyone is saying'),
  autoplay: z.boolean().default(true),
  autoplayInterval: z.number().default(5000),
  background: z.enum(['white', 'soft', 'dark']).default('soft'),
  quotes: z.array(QuoteItemSchema).default([]),
});

export type QuotesCarouselData = z.infer<typeof quotesCarouselSchema>;

export const defaultQuotesCarouselData: QuotesCarouselData = {
  eyebrow: 'Wishes & Words',
  headline: 'What everyone is saying',
  autoplay: true,
  autoplayInterval: 5000,
  background: 'soft',
  quotes: [
    { id: '1', text: 'Watching these two fall in love has been one of the greatest joys of my life. You were made for each other.', author: 'Margaret & Tom', role: 'Parents of the Bride', photo: '' },
    { id: '2', text: 'I have never seen two people more perfectly suited. Here\'s to a lifetime of adventure, laughter, and love.', author: 'Jamie Chen', role: 'Maid of Honor', photo: '' },
    { id: '3', text: 'From the moment you introduced us, I knew this was the one. So grateful to call you both family.', author: 'Daniel Park', role: 'Best Man', photo: '' },
    { id: '4', text: 'Love is patient, love is kind — and you two are the living proof. Wishing you every happiness.', author: 'Aunt Carol', role: 'Family', photo: '' },
  ],
};

const bgMap: Record<string, { section: string; card: string; text: string; sub: string }> = {
  white: { section: 'bg-white', card: 'bg-stone-50', text: 'text-stone-900', sub: 'text-stone-400' },
  soft: { section: 'bg-stone-50', card: 'bg-white', text: 'text-stone-900', sub: 'text-stone-400' },
  dark: { section: 'bg-stone-900', card: 'bg-stone-800', text: 'text-white', sub: 'text-stone-400' },
};

const QuotesCarousel: React.FC<SectionComponentProps<QuotesCarouselData>> = ({ data }) => {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const colors = bgMap[data.background] ?? bgMap.soft;
  const total = data.quotes.length;

  const go = (dir: 1 | -1) => setCurrent(i => (i + dir + total) % total);

  useEffect(() => {
    if (!data.autoplay || total < 2) return;
    timerRef.current = setInterval(() => go(1), data.autoplayInterval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [data.autoplay, data.autoplayInterval, total]);

  if (total === 0) return null;

  const q = data.quotes[current];

  return (
    <section className={`relative overflow-hidden py-28 md:py-36 ${colors.section}`} id="quotes">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.10),transparent_55%)]" />
      <div className="relative max-w-3xl mx-auto px-6 md:px-12 text-center">
        {data.eyebrow && (
          <p className="text-xs uppercase tracking-[0.25em] text-rose-400 font-medium mb-4">{data.eyebrow}</p>
        )}
        <h2 className={`text-3xl md:text-4xl font-light mb-16 ${colors.text}`}>{data.headline}</h2>

        <div className="relative min-h-[260px] flex items-center justify-center">
          <div className={`w-full rounded-[2rem] p-10 md:p-16 shadow-xl border border-stone-100/80 transition-all duration-500 ${colors.card}`}>
            <Quote size={32} className="text-rose-200 mx-auto mb-6" />
            <blockquote>
              <p className={`text-xl md:text-2xl font-light leading-relaxed italic ${colors.text}`}>
                "{q.text}"
              </p>
              <div className="mt-8 flex items-center justify-center gap-4">
                {q.photo && (
                  <img src={q.photo} alt={q.author} className="w-10 h-10 rounded-full object-cover ring-2 ring-stone-200" />
                )}
                <div className="text-left">
                  <p className={`font-medium text-sm ${colors.text}`}>{q.author}</p>
                  {q.role && <p className={`text-xs mt-0.5 ${colors.sub}`}>{q.role}</p>}
                </div>
              </div>
            </blockquote>
          </div>
        </div>

        {total > 1 && (
          <div className="flex items-center justify-center gap-6 mt-10">
            <button
              onClick={() => go(-1)}
              className="w-10 h-10 rounded-full border border-stone-200 hover:border-rose-300 hover:bg-rose-50 flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={18} className={colors.sub} />
            </button>
            <div className="flex gap-2">
              {data.quotes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-rose-400' : 'w-2 h-2 bg-stone-300 hover:bg-stone-400'}`}
                />
              ))}
            </div>
            <button
              onClick={() => go(1)}
              className="w-10 h-10 rounded-full border border-stone-200 hover:border-rose-300 hover:bg-rose-50 flex items-center justify-center transition-colors"
            >
              <ChevronRight size={18} className={colors.sub} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export const quotesCarouselDefinition: SectionDefinition<QuotesCarouselData> = {
  type: 'quotes',
  variant: 'carousel',
  schema: quotesCarouselSchema,
  defaultData: defaultQuotesCarouselData,
  Component: QuotesCarousel,
};
