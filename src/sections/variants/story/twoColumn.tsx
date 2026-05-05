import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps, parseSectionData } from '../../types';
import { getSafePublicImageUrl } from '../../publicLinks';

export const storyTwoColumnSchema = z.object({
  eyebrow: z.string().default('Our Story'),
  headline: z.string().default('How it all began'),
  body: z.string().default(''),
  image: z.string().default(''),
  imageAlt: z.string().default('Couple photo'),
  imagePosition: z.enum(['left', 'right']).default('right'),
  presentation: z.enum(['twoColumn', 'centered', 'timeline', 'chapters', 'duoColumn', 'milestones']).default('twoColumn'),
  quote: z.string().default(''),
  quoteAttribution: z.string().default(''),
  showDivider: z.boolean().default(true),
});

export type StoryTwoColumnData = z.infer<typeof storyTwoColumnSchema>;

export const defaultStoryTwoColumnData: StoryTwoColumnData = {
  eyebrow: 'Our Story',
  headline: 'How it all began',
  body: 'We met on a rainy Tuesday in October. Neither of us expected that a chance encounter would become the beginning of our forever. From that first conversation over coffee to this moment, every day has been an adventure worth sharing.',
  image: 'https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=1200&q=85',
  imageAlt: 'Couple photo',
  imagePosition: 'right',
  presentation: 'twoColumn',
  quote: 'In all the world, there is no heart for me like yours.',
  quoteAttribution: '',
  showDivider: true,
};

const StoryTwoColumn: React.FC<SectionComponentProps<StoryTwoColumnData>> = ({ data }) => {
  const paragraphs = data.body.split('\n\n').filter(Boolean);
  const image = getSafePublicImageUrl(data.image);

  if (data.presentation === 'centered') {
    return (
      <section className="py-28 md:py-40 bg-[#fbfaf7]" id="story">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          {data.eyebrow && <p className="text-sm text-stone-500 mb-5">{data.eyebrow}</p>}
          <h2 className="text-5xl md:text-7xl font-light text-stone-950 leading-tight">{data.headline}</h2>
          {image && <img src={image} alt={data.imageAlt} className="mt-12 mx-auto aspect-[16/10] w-full rounded-[2rem] object-cover shadow-[0_30px_90px_-50px_rgba(0,0,0,0.55)]" />}
          <div className="mt-10 mx-auto max-w-2xl space-y-5">
            {(paragraphs.length ? paragraphs : [data.body]).map((p, i) => <p key={i} className="text-lg font-light leading-[1.9] text-stone-600">{p}</p>)}
          </div>
        </div>
      </section>
    );
  }

  if (data.presentation === 'timeline' || data.presentation === 'chapters' || data.presentation === 'milestones') {
    const items = (paragraphs.length ? paragraphs : data.body.split(/[.?!]\s+/).filter(Boolean)).slice(0, 4);
    return (
      <section className="py-28 md:py-40 bg-white" id="story">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-12 lg:gap-20">
            <div>
              {data.eyebrow && <p className="text-sm text-stone-500 mb-5">{data.eyebrow}</p>}
              <h2 className="text-5xl md:text-7xl font-light text-stone-950 leading-tight">{data.headline}</h2>
              {image && <img src={image} alt={data.imageAlt} className="mt-10 aspect-[4/5] w-full rounded-[2rem] object-cover" />}
            </div>
            <div className="space-y-4">
              {items.map((item, index) => (
                <article key={`${item}-${index}`} className="grid grid-cols-[3rem_1fr] gap-5 rounded-3xl border border-stone-100 bg-stone-50/65 p-5 md:p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm text-stone-500 shadow-sm">{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <p className="text-xs text-stone-500 mb-2">{data.presentation === 'milestones' ? 'Milestone' : data.presentation === 'chapters' ? 'Chapter' : 'Moment'}</p>
                    <p className="text-stone-650 leading-[1.8] font-light">{item}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (data.presentation === 'duoColumn') {
    const [first = data.body, second = data.quote || data.body] = paragraphs.length >= 2 ? paragraphs : [data.body, data.quote || data.body];
    return (
      <section className="py-28 md:py-40 bg-stone-950 text-white" id="story">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-14">
            {data.eyebrow && <p className="text-sm text-white/55 mb-5">{data.eyebrow}</p>}
            <h2 className="text-5xl md:text-7xl font-light leading-tight">{data.headline}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-px bg-white/10 overflow-hidden rounded-[2rem]">
            {[first, second].map((text, index) => (
              <div key={index} className="bg-stone-900 p-8 md:p-12">
                <p className="text-xs text-white/50 mb-5">{index === 0 ? 'Partner one' : 'Partner two'}</p>
                <p className="text-lg leading-[1.9] text-white/72 font-light">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-32 md:py-40 bg-gradient-to-b from-white via-stone-50/35 to-white" id="story">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-[5.5rem] lg:gap-24 items-center ${data.imagePosition === 'left' ? 'md:[&>*:first-child]:order-2 md:[&>*:last-child]:order-1' : ''}`}>
          <div className="space-y-9 md:space-y-10">
            {data.showDivider && <div className="w-14 h-px bg-stone-300" />}

            <div className="space-y-4">
              {data.eyebrow && (
                <p className="text-sm text-stone-500 font-light">
                  {data.eyebrow}
                </p>
              )}
              <h2 className="text-4xl md:text-6xl font-light text-stone-900 leading-[1.04] text-balance">
                {data.headline}
              </h2>
            </div>

            <div className="space-y-[1.15rem] md:space-y-5">
              {paragraphs.length > 0
                ? paragraphs.map((p, i) => (
                    <p key={i} className="text-stone-600 leading-[1.85] md:leading-[1.9] text-base md:text-lg font-light text-pretty max-w-[60ch]">
                      {p}
                    </p>
                  ))
                : (
                  <p className="text-stone-600 leading-[1.85] md:leading-[1.9] text-base md:text-lg font-light text-pretty max-w-[60ch]">{data.body}</p>
                )
              }
            </div>

            {data.quote && (
              <blockquote className="border-l-2 border-stone-200 pl-5 md:pl-6 py-2 bg-stone-50/60 rounded-r-xl">
                <p className="text-stone-600 italic text-base leading-relaxed md:leading-[1.8]">"{data.quote}"</p>
                {data.quoteAttribution && (
                  <cite className="text-stone-400 text-sm not-italic mt-2 block">- {data.quoteAttribution}</cite>
                )}
              </blockquote>
            )}
          </div>

          {image ? (
            <div className="relative">
              <div className="aspect-[3/4] rounded-[1.9rem] overflow-hidden shadow-[0_34px_80px_-35px_rgba(24,24,27,0.5)]">
                <img
                  src={image}
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

const makeStoryDefinition = (variant: string, overrides: Partial<StoryTwoColumnData>): SectionDefinition<StoryTwoColumnData> => ({
  type: 'story',
  variant,
  schema: storyTwoColumnSchema,
  defaultData: { ...defaultStoryTwoColumnData, ...overrides },
  Component: StoryTwoColumn,
});

export const storyCenteredDefinition = makeStoryDefinition('centered', { presentation: 'centered', showDivider: false });
export const storySplitDefinition = makeStoryDefinition('split', { presentation: 'twoColumn', imagePosition: 'left' });
export const storyTimelineDefinition = makeStoryDefinition('timeline', { presentation: 'timeline' });
export const storyChaptersDefinition = makeStoryDefinition('chapters', { presentation: 'chapters' });
export const storyDuoColumnDefinition = makeStoryDefinition('duoColumn', { presentation: 'duoColumn', image: '' });
export const storyMilestonesDefinition = makeStoryDefinition('milestones', { presentation: 'milestones' });
