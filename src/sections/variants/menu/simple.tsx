import React from 'react';
import { z } from 'zod';
import { Leaf } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  description: z.string().default(''),
  price: z.string().default(''),
});

export const menuSimpleSchema = z.object({
  eyebrow: z.string().default('Dining'),
  headline: z.string().default('Tonight\'s Menu'),
  subtitle: z.string().default(''),
  items: z.array(MenuItemSchema).default([]),
  footerNote: z.string().default(''),
  showPrices: z.boolean().default(false),
  layoutStyle: z.enum(['simple', 'printed', 'illustrated']).default('simple'),
});

export type MenuSimpleData = z.infer<typeof menuSimpleSchema>;

export const defaultMenuSimpleData: MenuSimpleData = {
  eyebrow: 'Dining',
  headline: 'Tonight\'s Menu',
  subtitle: 'A carefully curated four-course dinner.',
  showPrices: false,
  footerNote: 'Please notify us of dietary restrictions when you RSVP.',
  layoutStyle: 'simple',
  items: [
    { id: '1', name: 'Heirloom Tomato & Burrata', description: 'Fresh basil, aged balsamic, olive oil', price: '' },
    { id: '2', name: 'Wild Arugula Salad', description: 'Candied walnuts, goat cheese, champagne vinaigrette', price: '' },
    { id: '3', name: 'Herb-Crusted Salmon', description: 'Lemon butter, asparagus, fingerling potatoes', price: '' },
    { id: '4', name: 'Filet Mignon', description: 'Truffle demi-glace, roasted vegetables, garlic mashed potatoes', price: '' },
    { id: '5', name: 'Wild Mushroom Risotto', description: 'Parmesan, truffle oil, fresh herbs', price: '' },
    { id: '6', name: 'Vanilla Bean Crème Brûlée', description: 'Seasonal berries, almond tuile', price: '' },
  ],
};

const MenuSimple: React.FC<SectionComponentProps<MenuSimpleData>> = ({ data }) => {
  if (data.layoutStyle === 'printed') {
    return (
      <section className="py-28 md:py-36 bg-stone-100" id="menu">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white px-8 py-12 md:px-16 md:py-16 text-center shadow-2xl shadow-stone-900/10 outline outline-1 outline-offset-[-12px] outline-stone-200">
            {data.eyebrow && <p className="text-sm text-stone-400 font-light mb-5">{data.eyebrow}</p>}
            <h2 className="text-4xl md:text-6xl font-light text-stone-950">{data.headline}</h2>
            {data.subtitle && <p className="mt-4 text-stone-500">{data.subtitle}</p>}
            <div className="my-10 flex items-center justify-center gap-3">
              <div className="h-px w-16 bg-stone-200" />
              <Leaf size={16} className="text-stone-300" />
              <div className="h-px w-16 bg-stone-200" />
            </div>
            <div className="space-y-7">
              {data.items.map((item) => (
                <div key={item.id}>
                  <p className="text-base font-medium text-stone-950">{item.name}</p>
                  {item.description && <p className="mt-1 text-sm font-light italic text-stone-500">{item.description}</p>}
                </div>
              ))}
            </div>
            {data.footerNote && <p className="mt-12 text-sm text-stone-400">{data.footerNote}</p>}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'illustrated') {
    return (
      <section className="py-28 md:py-36 bg-gradient-to-b from-emerald-50/50 to-white" id="menu">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-12 items-start">
            <div className="lg:sticky lg:top-10">
              {data.eyebrow && <p className="text-sm text-emerald-700/70 font-light mb-4">{data.eyebrow}</p>}
              <h2 className="text-4xl md:text-6xl font-light text-stone-950">{data.headline}</h2>
              {data.subtitle && <p className="mt-5 text-stone-500 leading-relaxed">{data.subtitle}</p>}
              <div className="mt-8 grid grid-cols-3 gap-3">
                {['Starter', 'Dinner', 'Dessert'].map((label, index) => (
                  <div key={label} className="rounded-[1.5rem] border border-emerald-100 bg-white p-4 text-center shadow-sm">
                    <div className={`mx-auto h-12 w-12 rounded-full ${index === 0 ? 'bg-rose-200' : index === 1 ? 'bg-emerald-700' : 'bg-amber-200'}`} />
                    <p className="mt-3 text-xs text-stone-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.items.map((item, index) => (
                <div key={item.id} className="rounded-[1.5rem] border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-sm font-medium text-emerald-700">{String(index + 1).padStart(2, '0')}</div>
                  <h3 className="font-medium text-stone-950">{item.name}</h3>
                  {item.description && <p className="mt-2 text-sm text-stone-500 leading-relaxed">{item.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-28 md:py-36 bg-gradient-to-b from-amber-50/30 via-white to-white" id="menu">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-sm text-stone-400 font-light mb-4">{data.eyebrow}</p>
          )}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-stone-200" />
            <Leaf size={14} className="text-stone-300" />
            <div className="w-8 h-px bg-stone-200" />
          </div>
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-4">{data.headline}</h2>
          {data.subtitle && (
            <p className="text-stone-500 leading-relaxed">{data.subtitle}</p>
          )}
        </div>

        <div className="space-y-10">
          {data.items.map((item, idx) => (
            <div key={item.id} className="border-b border-stone-100 last:border-0 pb-6 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-stone-900 font-medium mb-1.5 flex items-center gap-2">
                    {item.name}
                    {data.showPrices && item.price && (
                      <span className="text-stone-400 text-sm font-light">{item.price}</span>
                    )}
                  </h3>
                  {item.description && (
                    <p className="text-stone-500 text-sm leading-relaxed">{item.description}</p>
                  )}
                </div>
                {!data.showPrices && (
                  <span className="text-stone-300 text-xs font-light shrink-0 mt-1">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {data.footerNote && (
          <div className="mt-12 pt-8 border-t border-stone-100 text-center">
            <p className="text-stone-400 text-sm italic">{data.footerNote}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export const menuSimpleDefinition: SectionDefinition<MenuSimpleData> = {
  type: 'menu',
  variant: 'simple',
  schema: menuSimpleSchema,
  defaultData: defaultMenuSimpleData,
  Component: MenuSimple,
};

function menuSimpleVariant(variant: string, layoutStyle: MenuSimpleData['layoutStyle'], overrides: Partial<MenuSimpleData> = {}): SectionDefinition<MenuSimpleData> {
  return {
    type: 'menu',
    variant,
    schema: menuSimpleSchema,
    defaultData: { ...defaultMenuSimpleData, layoutStyle, ...overrides },
    Component: MenuSimple,
  };
}

export const menuPrintedDefinition = menuSimpleVariant('printed', 'printed');
export const menuIllustratedDefinition = menuSimpleVariant('illustrated', 'illustrated');
