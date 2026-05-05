import React from 'react';
import { z } from 'zod';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { getSafePublicImageUrl } from '../../publicLinks';

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
  presetCode: z.string().default(''),
  dressCodeLabel: z.string().default(''),
  dressCode: z.string().default('Cocktail Attire'),
  description: z.string().default(''),
  colorPalette: z.array(ColorSwatchSchema).default([]),
  moodImages: z.array(MoodBoardImageSchema).default([]),
  colorNote: z.string().default(''),
  additionalNote: z.string().default(''),
  avoidNote: z.string().default(''),
  layoutStyle: z.enum(['moodBoard', 'banner', 'palette', 'illustrated', 'card', 'scale']).default('moodBoard'),
  formalityLevel: z.number().min(1).max(5).default(3),
});

export type DressCodeMoodBoardData = z.infer<typeof dressCodeMoodBoardSchema>;

export const defaultDressCodeMoodBoardData: DressCodeMoodBoardData = {
  eyebrow: 'What to wear',
  headline: 'Dress Code',
  presetCode: '',
  dressCodeLabel: '',
  dressCode: 'Cocktail Attire',
  description: 'We invite you to dress up and feel your best! Think elegant cocktail dresses, suits, and formal separates.',
  colorNote: 'We kindly request guests avoid wearing white, ivory, or cream.',
  avoidNote: 'Please reserve white, cream, and ivory for the bride.',
  additionalNote: 'The event is partially outdoors — consider comfortable footwear.',
  layoutStyle: 'moodBoard',
  formalityLevel: 3,
  colorPalette: [
    { id: '1', color: '#2c3e50', label: 'Navy' },
    { id: '2', color: '#7f6957', label: 'Mocha' },
    { id: '3', color: '#b8a89a', label: 'Blush' },
    { id: '4', color: '#4a5568', label: 'Slate' },
    { id: '5', color: '#718096', label: 'Steel' },
  ],
  moodImages: [
    { id: '1', url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85', alt: 'Elegant dress' },
    { id: '2', url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=85', alt: 'Formal suit' },
    { id: '3', url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85', alt: 'Style inspiration' },
  ],
};

const DressCodeMoodBoard: React.FC<SectionComponentProps<DressCodeMoodBoardData>> = ({ data }) => {
  const palette = data.colorPalette.length > 0 ? data.colorPalette : defaultDressCodeMoodBoardData.colorPalette;
  const safeMoodImages = data.moodImages
    .map((img) => ({ ...img, url: getSafePublicImageUrl(img.url) }))
    .filter((img) => img.url);
  const dressCodeLabel = data.dressCodeLabel || data.dressCode || data.presetCode || 'Dress Code';
  const notes = [
    data.colorNote ? { label: 'Color note', text: data.colorNote } : null,
    data.avoidNote ? { label: 'Please avoid', text: data.avoidNote } : null,
    data.additionalNote ? { label: 'Good to know', text: data.additionalNote } : null,
  ].filter(Boolean) as Array<{ label: string; text: string }>;

  if (data.layoutStyle === 'banner') {
    return (
      <section className="py-14 md:py-16 bg-stone-950 text-white" id="dress-code">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              {data.eyebrow && <p className="text-sm text-white/55 font-medium mb-3">{data.eyebrow}</p>}
              <h2 className="text-3xl md:text-5xl font-light">{dressCodeLabel || data.headline}</h2>
              {data.description && <p className="mt-3 max-w-2xl text-white/60 leading-relaxed">{data.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {palette.slice(0, 6).map((swatch) => (
                <div key={swatch.id} className="h-12 w-12 rounded-full border border-white/20 shadow-lg" style={{ backgroundColor: swatch.color }} title={swatch.label} />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'palette') {
    return (
      <section className="py-28 md:py-36 bg-white" id="dress-code">
        <div className="max-w-5xl mx-auto px-6 md:px-12 text-center">
          {data.eyebrow && <p className="text-sm text-stone-500 font-medium mb-4">{data.eyebrow}</p>}
          <h2 className="text-4xl md:text-6xl font-light text-stone-950">{data.headline}</h2>
          <p className="mt-4 text-xl md:text-2xl font-light text-stone-500">{dressCodeLabel}</p>
          {data.description && <p className="mt-5 max-w-2xl mx-auto text-stone-500 leading-relaxed">{data.description}</p>}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {palette.slice(0, 5).map((swatch) => (
              <div key={swatch.id} className="rounded-[1.5rem] border border-stone-100 bg-stone-50 p-3">
                <div className="aspect-square rounded-[1.1rem] shadow-inner" style={{ backgroundColor: swatch.color }} />
                {swatch.label && <p className="mt-3 text-xs text-stone-500">{swatch.label}</p>}
              </div>
            ))}
          </div>
          {data.colorNote && <p className="mt-8 text-sm text-stone-500">{data.colorNote}</p>}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'illustrated') {
    return (
      <section className="py-28 md:py-36 bg-gradient-to-b from-stone-50 to-white" id="dress-code">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
            <div>
              {data.eyebrow && <p className="text-sm text-stone-500 font-medium mb-4">{data.eyebrow}</p>}
              <h2 className="text-4xl md:text-6xl font-light text-stone-950">{data.headline}</h2>
              <div className="mt-5 inline-flex rounded-full bg-stone-950 px-5 py-2 text-sm font-medium text-white">{dressCodeLabel}</div>
              {data.description && <p className="mt-6 text-stone-500 leading-relaxed">{data.description}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Suit', shape: 'rounded-t-full' },
                { label: 'Dress', shape: 'rounded-[45%_45%_18%_18%]' },
                { label: 'Separates', shape: 'rounded-[2rem]' },
              ].map((item, index) => (
                <div key={item.label} className="rounded-[2rem] border border-stone-100 bg-white p-4 text-center shadow-sm">
                  <div className={`mx-auto h-44 w-full max-w-[120px] ${item.shape} bg-gradient-to-b ${index === 0 ? 'from-stone-800 to-stone-950' : index === 1 ? 'from-rose-200 to-stone-100' : 'from-emerald-700 to-stone-900'} shadow-inner`} />
                  <p className="mt-4 text-xs text-stone-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          {notes.length > 0 && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              {notes.map((note) => (
                <div key={note.label} className="rounded-2xl border border-stone-100 bg-white p-5">
                  <p className="text-xs font-medium text-stone-500">{note.label}</p>
                  <p className="mt-2 text-sm text-stone-600 leading-relaxed">{note.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'card') {
    return (
      <section className="py-28 md:py-36 bg-stone-50" id="dress-code">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-7 md:p-10 shadow-xl shadow-stone-900/5">
            <div className="text-center border-b border-stone-100 pb-8 mb-8">
              {data.eyebrow && <p className="text-sm text-stone-500 font-medium mb-4">{data.eyebrow}</p>}
              <h2 className="text-4xl md:text-5xl font-light text-stone-950">{dressCodeLabel || data.headline}</h2>
              {data.description && <p className="mt-4 max-w-2xl mx-auto text-stone-500">{data.description}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <p className="text-sm text-emerald-700 font-semibold">Encouraged</p>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">Elegant outfits, polished shoes, and colors that complement the palette.</p>
              </div>
              <div>
                <p className="text-sm text-rose-700 font-semibold">Please avoid</p>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">{data.avoidNote || data.colorNote || 'White, ivory, and anything too casual for the venue.'}</p>
              </div>
              <div>
                <p className="text-sm text-stone-600 font-semibold">Note</p>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">{data.additionalNote || 'Bring layers if the celebration moves outdoors.'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'scale') {
    const level = Math.max(1, Math.min(5, data.formalityLevel));
    return (
      <section className="py-28 md:py-36 bg-white" id="dress-code">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            {data.eyebrow && <p className="text-sm text-stone-500 font-medium mb-4">{data.eyebrow}</p>}
            <h2 className="text-4xl md:text-6xl font-light text-stone-950">{data.headline}</h2>
            <p className="mt-4 text-xl font-light text-stone-500">{dressCodeLabel}</p>
          </div>
          <div className="rounded-[2rem] border border-stone-100 bg-stone-50 p-6 md:p-8">
            <div className="grid grid-cols-5 gap-2">
              {['Casual', 'Dressy', 'Cocktail', 'Formal', 'Black tie'].map((label, index) => (
                <div key={label} className="text-center">
                  <div className={`h-3 rounded-full ${index + 1 <= level ? 'bg-stone-950' : 'bg-stone-200'}`} />
                  <p className={`mt-3 text-xs ${index + 1 === level ? 'text-stone-950 font-semibold' : 'text-stone-500'}`}>{label}</p>
                </div>
              ))}
            </div>
            {data.description && <p className="mt-8 text-center text-stone-500 leading-relaxed">{data.description}</p>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-28 md:py-36 bg-gradient-to-b from-stone-50 to-white" id="dress-code">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 items-start">
          <div className="space-y-8">
            <div>
              {data.eyebrow && (
                <p className="text-sm text-stone-500 font-medium mb-4">
                  {data.eyebrow}
                </p>
              )}
              <h2 className="text-4xl md:text-6xl font-light text-stone-900 mb-4">{data.headline}</h2>
              <div className="inline-flex items-center px-5 py-2 bg-stone-900 text-white text-sm font-medium rounded-full shadow-md">
                {dressCodeLabel}
              </div>
            </div>

            {data.description && (
              <p className="text-stone-500 font-light leading-relaxed text-base">{data.description}</p>
            )}

            {data.colorPalette.length > 0 && (
              <div>
                <p className="text-sm text-stone-500 font-medium mb-4">Color Palette</p>
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

          {safeMoodImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {safeMoodImages.slice(0, 4).map((img, idx) => (
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

function dressCodeVariant(variant: string, layoutStyle: DressCodeMoodBoardData['layoutStyle'], overrides: Partial<DressCodeMoodBoardData> = {}): SectionDefinition<DressCodeMoodBoardData> {
  return {
    type: 'dressCode',
    variant,
    schema: dressCodeMoodBoardSchema,
    defaultData: { ...defaultDressCodeMoodBoardData, layoutStyle, ...overrides },
    Component: DressCodeMoodBoard,
  };
}

export const dressCodeBannerDefinition = dressCodeVariant('banner', 'banner');
export const dressCodePaletteDefinition = dressCodeVariant('palette', 'palette');
export const dressCodeIllustratedDefinition = dressCodeVariant('illustrated', 'illustrated');
export const dressCodeCardDefinition = dressCodeVariant('card', 'card');
export const dressCodeScaleDefinition = dressCodeVariant('scale', 'scale', { formalityLevel: 4 });
