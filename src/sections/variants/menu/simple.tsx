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
});

export type MenuSimpleData = z.infer<typeof menuSimpleSchema>;

export const defaultMenuSimpleData: MenuSimpleData = {
  eyebrow: 'Dining',
  headline: 'Tonight\'s Menu',
  subtitle: 'A carefully curated four-course dinner.',
  showPrices: false,
  footerNote: 'Please notify us of dietary restrictions when you RSVP.',
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
  return (
    <section className="py-24 md:py-32 bg-white" id="menu">
      <div className="max-w-2xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
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

        <div className="space-y-8">
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
