import React from 'react';
import { z } from 'zod';
import { Quote, Heart } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const QuoteItemSchema = z.object({
  id: z.string(),
  text: z.string().default(''),
  author: z.string().default(''),
  role: z.string().default(''),
  photo: z.string().default(''),
  featured: z.boolean().default(false),
});

export const quotesFeaturedSchema = z.object({
  eyebrow: z.string().default('From the Heart'),
  headline: z.string().default('Words that mean the world to us'),
  subtitle: z.string().default(''),
  showPhotos: z.boolean().default(true),
  quotes: z.array(QuoteItemSchema).default([]),
});

export type QuotesFeaturedData = z.infer<typeof quotesFeaturedSchema>;

export const defaultQuotesFeaturedData: QuotesFeaturedData = {
  eyebrow: 'From the Heart',
  headline: 'Words that mean the world to us',
  subtitle: 'Messages from the people who know us best.',
  showPhotos: true,
  quotes: [
    { id: '1', text: 'Watching these two fall in love has been one of the greatest joys of my life. You were made for each other, and I couldn\'t be prouder.', author: 'Margaret Wilson', role: 'Mother of the Bride', photo: '', featured: true },
    { id: '2', text: 'I have never seen two people more perfectly suited. Here\'s to a lifetime of adventure and love.', author: 'Jamie Chen', role: 'Maid of Honor', photo: '', featured: false },
    { id: '3', text: 'From the moment you introduced us, I knew this was the one. Grateful to call you both family.', author: 'Daniel Park', role: 'Best Man', photo: '', featured: false },
    { id: '4', text: 'Love is patient, love is kind — and you two are living proof. Wishing you every happiness.', author: 'Aunt Carol', role: 'Family', photo: '', featured: false },
  ],
};

const QuotesFeatured: React.FC<SectionComponentProps<QuotesFeaturedData>> = ({ data }) => {
  const featured = data.quotes.find(q => q.featured);
  const others = data.quotes.filter(q => !q.featured);

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-white via-stone-50/50 to-white" id="quotes">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-rose-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-4">{data.headline}</h2>
          {data.subtitle && (
            <p className="text-stone-500 leading-relaxed">{data.subtitle}</p>
          )}
        </div>

        {featured && (
          <div className="max-w-4xl mx-auto mb-16">
            <div className="relative bg-white rounded-3xl p-10 md:p-16 shadow-lg border border-stone-100">
              <div className="absolute -top-5 -left-5 w-12 h-12 rounded-full bg-rose-50 border-4 border-white flex items-center justify-center shadow-sm">
                <Heart size={18} className="text-rose-400" fill="currentColor" />
              </div>
              <Quote size={40} className="text-rose-200 mx-auto mb-8" />
              <blockquote className="text-center">
                <p className="text-xl md:text-2xl font-light leading-relaxed text-stone-700 italic mb-8">
                  "{featured.text}"
                </p>
                <div className="flex flex-col items-center gap-4">
                  {data.showPhotos && featured.photo && (
                    <img src={featured.photo} alt={featured.author} className="w-16 h-16 rounded-full object-cover ring-4 ring-stone-100" />
                  )}
                  <div>
                    <p className="font-semibold text-stone-900">{featured.author}</p>
                    {featured.role && <p className="text-sm text-stone-400 mt-1">{featured.role}</p>}
                  </div>
                </div>
              </blockquote>
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {others.map((q) => (
              <div key={q.id} className="bg-white rounded-xl p-6 border border-stone-100 hover:shadow-md transition-shadow">
                <Quote size={16} className="text-rose-300 mb-4" />
                <p className="text-stone-600 text-sm leading-relaxed italic mb-4">"{q.text}"</p>
                <div className="flex items-center gap-3">
                  {data.showPhotos && q.photo ? (
                    <img src={q.photo} alt={q.author} className="w-8 h-8 rounded-full object-cover ring-2 ring-stone-100" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                      <span className="text-rose-500 text-xs font-medium">{q.author.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-stone-800 text-xs truncate">{q.author}</p>
                    {q.role && <p className="text-stone-400 text-[10px] truncate">{q.role}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const quotesFeaturedDefinition: SectionDefinition<QuotesFeaturedData> = {
  type: 'quotes',
  variant: 'featured',
  schema: quotesFeaturedSchema,
  defaultData: defaultQuotesFeaturedData,
  Component: QuotesFeatured,
};
