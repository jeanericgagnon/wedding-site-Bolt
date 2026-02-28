import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps, parseSectionData } from '../../types';

export const storyTwoColumnSchema = z.object({
  eyebrow: z.string().default('Our Story'),
  headline: z.string().default('How it all began'),
  body: z.string().default(''),
  image: z.string().default(''),
  imageAlt: z.string().default('Couple photo'),
  imagePosition: z.enum(['left', 'right']).default('right'),
  quote: z.string().default(''),
  quoteAttribution: z.string().default(''),
  showDivider: z.boolean().default(true),
});

export type StoryTwoColumnData = z.infer<typeof storyTwoColumnSchema>;

export const defaultStoryTwoColumnData: StoryTwoColumnData = {
  eyebrow: 'Our Story',
  headline: 'How it all began',
  body: 'We met on a rainy Tuesday in October. Neither of us expected that a chance encounter would become the beginning of our forever. From that first conversation over coffee to this moment, every day has been an adventure worth sharing.',
  image: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=900',
  imageAlt: 'Couple photo',
  imagePosition: 'right',
  quote: 'In all the world, there is no heart for me like yours.',
  quoteAttribution: '',
  showDivider: true,
};

const StoryTwoColumn: React.FC<SectionComponentProps<StoryTwoColumnData>> = ({ data }) => {
  const paragraphs = data.body.split('\n\n').filter(Boolean);

  return (
    <section className="py-28 md:py-36 bg-gradient-to-b from-white via-stone-50/40 to-white" id="story">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center ${data.imagePosition === 'left' ? 'md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1' : ''}`}>
          <div className="space-y-10">
            {data.showDivider && <div className="w-14 h-px bg-stone-300" />}

            <div className="space-y-4">
              {data.eyebrow && (
                <p className="text-[11px] uppercase tracking-[0.32em] text-stone-400 font-semibold">
                  {data.eyebrow}
                </p>
              )}
              <h2 className="text-4xl md:text-6xl font-light text-stone-900 leading-[1.04] tracking-tight">
                {data.headline}
              </h2>
            </div>

            <div className="space-y-5">
              {paragraphs.length > 0
                ? paragraphs.map((p, i) => (
                    <p key={i} className="text-stone-600 leading-[1.95] text-base md:text-lg font-light">
                      {p}
                    </p>
                  ))
                : (
                  <p className="text-stone-600 leading-[1.95] text-base md:text-lg font-light">{data.body}</p>
                )
              }
            </div>

            {data.quote && (
              <blockquote className="border-l-2 border-stone-200 pl-5 py-1">
                <p className="text-stone-500 italic text-base leading-relaxed">"{data.quote}"</p>
                {data.quoteAttribution && (
                  <cite className="text-stone-400 text-sm not-italic mt-2 block">— {data.quoteAttribution}</cite>
                )}
              </blockquote>
            )}
          </div>

          {data.image ? (
            <div className="relative">
              <div className="aspect-[3/4] rounded-[1.75rem] overflow-hidden shadow-[0_24px_70px_-30px_rgba(24,24,27,0.45)]">
                <img
                  src={data.image}
                  alt={data.imageAlt}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 border border-stone-200 rounded-2xl -z-10" aria-hidden="true" />
            </div>
          ) : (
            <div className="aspect-[3/4] rounded-2xl bg-stone-100 flex items-center justify-center">
              <p className="text-stone-400 text-sm">Add a photo</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export const storyTwoColumnDefinition: SectionDefinition<StoryTwoColumnData> = {
  type: 'story',
  variant: 'twoColumn',
  schema: storyTwoColumnSchema,
  defaultData: defaultStoryTwoColumnData,
  Component: StoryTwoColumn,
};
