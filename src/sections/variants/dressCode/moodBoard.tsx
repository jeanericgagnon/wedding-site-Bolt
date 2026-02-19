import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';

const ColorSwatchSchema = z.object({
  id: z.string(),
  color: z.string().default('#d4c5a9'),
  label: z.string().default(''),
});

const MoodBoardImageSchema = z.object({
  id: z.string(),
  url: z.string().default(''),
  alt: z.string().default(''),
});

export const dressCodeMoodBoardSchema = z.object({
  eyebrow: z.string().default('What to wear'),
  headline: z.string().default('Dress Code'),
  dressCode: z.string().default('Cocktail Attire'),
  description: z.string().default(''),
  colorPalette: z.array(ColorSwatchSchema).default([]),
  moodImages: z.array(MoodBoardImageSchema).default([]),
  colorNote: z.string().default(''),
  additionalNote: z.string().default(''),
  avoidNote: z.string().default(''),
});

export type DressCodeMoodBoardData = z.infer<typeof dressCodeMoodBoardSchema>;

export const defaultDressCodeMoodBoardData: DressCodeMoodBoardData = {
  eyebrow: 'What to wear',
  headline: 'Dress Code',
  dressCode: 'Cocktail Attire',
  description: 'We invite you to dress up and feel your best! Think elegant cocktail dresses, suits, and formal separates.',
  colorNote: 'We kindly request guests avoid wearing white, ivory, or cream.',
  avoidNote: 'Please reserve white, cream, and ivory for the bride.',
  additionalNote: 'The event is partially outdoors — consider comfortable footwear.',
  colorPalette: [
    { id: '1', color: '#2c3e50', label: 'Navy' },
    { id: '2', color: '#7f6957', label: 'Mocha' },
    { id: '3', color: '#b8a89a', label: 'Blush' },
    { id: '4', color: '#4a5568', label: 'Slate' },
    { id: '5', color: '#718096', label: 'Steel' },
  ],
  moodImages: [
    { id: '1', url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Elegant dress' },
    { id: '2', url: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Formal suit' },
    { id: '3', url: 'https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Style inspiration' },
  ],
};

const DressCodeMoodBoard: React.FC<SectionComponentProps<DressCodeMoodBoardData>> = ({ data }) => {
  return (
    <section className="py-24 md:py-32 bg-stone-50" id="dress-code">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div>
              {data.eyebrow && (
                <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
                  {data.eyebrow}
                </p>
              )}
              <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-3">{data.headline}</h2>
              <div className="inline-flex items-center px-4 py-1.5 bg-stone-900 text-white text-sm font-medium rounded-full">
                {data.dressCode}
              </div>
            </div>

            {data.description && (
              <p className="text-stone-500 font-light leading-relaxed text-base">{data.description}</p>
            )}

            {data.colorPalette.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-stone-400 font-medium mb-4">Color Palette</p>
                <div className="flex flex-wrap gap-3">
                  {data.colorPalette.map(swatch => (
                    <div key={swatch.id} className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-10 h-10 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: swatch.color }}
                        title={swatch.label}
                      />
                      {swatch.label && (
                        <span className="text-xs text-stone-400">{swatch.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {data.colorNote && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700 font-light leading-relaxed">{data.colorNote}</p>
                </div>
              )}
              {data.avoidNote && data.avoidNote !== data.colorNote && (
                <div className="flex items-start gap-3 p-4 bg-stone-100 border border-stone-200 rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-stone-600 font-light leading-relaxed">{data.avoidNote}</p>
                </div>
              )}
              {data.additionalNote && (
                <div className="flex items-start gap-3 p-4 bg-stone-100 border border-stone-200 rounded-xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-stone-600 font-light leading-relaxed">{data.additionalNote}</p>
                </div>
              )}
            </div>
          </div>

          {data.moodImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {data.moodImages.slice(0, 4).map((img, idx) => (
                <div
                  key={img.id}
                  className={`rounded-xl overflow-hidden bg-stone-200 ${idx === 0 ? 'col-span-2 aspect-[16/9]' : 'aspect-square'}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export const dressCodeMoodBoardDefinition: SectionDefinition<DressCodeMoodBoardData> = {
  type: 'dressCode',
  variant: 'moodBoard',
  schema: dressCodeMoodBoardSchema,
  defaultData: defaultDressCodeMoodBoardData,
  Component: DressCodeMoodBoard,
};
