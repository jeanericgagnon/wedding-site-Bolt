import React, { useRef, useEffect, useState } from 'react';
import { z } from 'zod';
import { Quote } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const QuoteItemSchema = z.object({
  id: z.string(),
  text: z.string().default(''),
  author: z.string().default(''),
  role: z.string().default(''),
  photo: z.string().default(''),
});

export const quotesGridSchema = z.object({
  eyebrow: z.string().default('Wishes & Words'),
  headline: z.string().default('From the people we love'),
  columns: z.enum(['2', '3']).default('3'),
  background: z.enum(['white', 'soft', 'dark']).default('white'),
  quotes: z.array(QuoteItemSchema).default([]),
});

export type QuotesGridData = z.infer<typeof quotesGridSchema>;

export const defaultQuotesGridData: QuotesGridData = {
  eyebrow: 'Wishes & Words',
  headline: 'From the people we love',
  columns: '3',
  background: 'white',
  quotes: [
    { id: '1', text: 'Watching these two fall in love has been one of the greatest joys of my life.', author: 'Margaret', role: 'Mother of the Bride', photo: '' },
    { id: '2', text: 'I have never seen two people more perfectly suited for each other.', author: 'Jamie Chen', role: 'Maid of Honor', photo: '' },
    { id: '3', text: 'From the moment you introduced us, I knew this was the one.', author: 'Daniel Park', role: 'Best Man', photo: '' },
    { id: '4', text: 'Love is patient, love is kind — and you two are the living proof.', author: 'Aunt Carol', role: 'Family', photo: '' },
    { id: '5', text: 'Here\'s to a lifetime of adventure, laughter, and love.', author: 'The Nguyens', role: 'Friends', photo: '' },
    { id: '6', text: 'So grateful to witness this love story from the very beginning.', author: 'Priya & Sam', role: 'College Friends', photo: '' },
  ],
};

function useIntersection(ref: React.RefObject<Element | null>, threshold = 0.1) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return visible;
}

const QuoteCard: React.FC<{ q: QuotesGridData['quotes'][number]; idx: number }> = ({ q, idx }) => {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useIntersection(ref);

  return (
    <div
      ref={ref}
      className={`flex flex-col p-8 rounded-2xl bg-stone-50 border border-stone-100 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${(idx % 6) * 80}ms` }}
    >
      <Quote size={20} className="text-rose-300 mb-5 shrink-0" />
      <p className="text-stone-600 italic leading-relaxed text-base flex-1">"{q.text}"</p>
      <div className="mt-6 flex items-center gap-3">
        {q.photo ? (
          <img src={q.photo} alt={q.author} className="w-9 h-9 rounded-full object-cover ring-2 ring-stone-200 shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
            <span className="text-rose-500 text-sm font-medium">{q.author.charAt(0)}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-stone-800 text-sm truncate">{q.author}</p>
          {q.role && <p className="text-stone-400 text-xs mt-0.5 truncate">{q.role}</p>}
        </div>
      </div>
    </div>
  );
};

const bgMap: Record<string, string> = {
  white: 'bg-white',
  soft: 'bg-stone-50',
  dark: 'bg-stone-900',
};

const QuotesGrid: React.FC<SectionComponentProps<QuotesGridData>> = ({ data }) => {
  const bg = bgMap[data.background] ?? 'bg-white';
  const gridCols = data.columns === '2' ? 'md:grid-cols-2' : 'md:grid-cols-3';

  return (
    <section className={`py-24 md:py-32 ${bg}`} id="quotes">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-rose-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900">{data.headline}</h2>
        </div>

        {data.quotes.length > 0 ? (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-6`}>
            {data.quotes.map((q, i) => <QuoteCard key={q.id} q={q} idx={i} />)}
          </div>
        ) : (
          <p className="text-center text-stone-400 text-sm py-12">No quotes added yet.</p>
        )}
      </div>
    </section>
  );
};

export const quotesGridDefinition: SectionDefinition<QuotesGridData> = {
  type: 'quotes',
  variant: 'grid',
  schema: quotesGridSchema,
  defaultData: defaultQuotesGridData,
  Component: QuotesGrid,
};
