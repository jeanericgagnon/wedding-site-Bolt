import React from 'react';
import { z } from 'zod';
import { Utensils, Leaf, Wine } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  description: z.string().default(''),
  dietary: z.array(z.string()).default([]),
});

const MenuSectionSchema = z.object({
  id: z.string(),
  label: z.string().default(''),
  icon: z.enum(['utensils', 'wine', 'leaf']).default('utensils'),
  items: z.array(MenuItemSchema).default([]),
});

export const menuCardSchema = z.object({
  eyebrow: z.string().default('Dining'),
  headline: z.string().default('An Evening to Remember'),
  subtitle: z.string().default('Join us for an exceptional culinary experience.'),
  note: z.string().default(''),
  showDietaryKey: z.boolean().default(true),
  backgroundImage: z.string().default(''),
  sections: z.array(MenuSectionSchema).default([]),
});

export type MenuCardData = z.infer<typeof menuCardSchema>;

export const defaultMenuCardData: MenuCardData = {
  eyebrow: 'Dining',
  headline: 'An Evening to Remember',
  subtitle: 'Join us for an exceptional culinary experience as we celebrate our special day.',
  note: 'Dietary requirements can be noted on your RSVP.',
  showDietaryKey: true,
  backgroundImage: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200',
  sections: [
    {
      id: '1',
      label: 'To Start',
      icon: 'wine',
      items: [
        { id: '1a', name: 'Charcuterie Board', description: 'Artisan meats, cheeses, seasonal accompaniments', dietary: [] },
        { id: '1b', name: 'Garden Bruschetta', description: 'Heirloom tomatoes, basil, aged balsamic', dietary: ['vegan'] },
      ],
    },
    {
      id: '2',
      label: 'Main Course',
      icon: 'utensils',
      items: [
        { id: '2a', name: 'Prime Filet Mignon', description: 'Truffle butter, roasted garlic potatoes, seasonal vegetables', dietary: ['gluten-free'] },
        { id: '2b', name: 'Atlantic Salmon', description: 'Lemon beurre blanc, asparagus, wild rice pilaf', dietary: ['gluten-free'] },
        { id: '2c', name: 'Mushroom Risotto', description: 'Wild mushrooms, aged parmesan, truffle oil', dietary: ['vegetarian'] },
      ],
    },
    {
      id: '3',
      label: 'Sweet Endings',
      icon: 'leaf',
      items: [
        { id: '3a', name: 'Wedding Cake', description: 'Champagne vanilla cake with fresh floral decoration', dietary: [] },
        { id: '3b', name: 'Dessert Display', description: 'Macarons, truffles, sorbets, and seasonal sweets', dietary: [] },
      ],
    },
  ],
};

const DIETARY_LABELS: Record<string, string> = {
  vegetarian: 'V',
  vegan: 'VG',
  'gluten-free': 'GF',
};

const iconMap = { utensils: Utensils, wine: Wine, leaf: Leaf };

const MenuCard: React.FC<SectionComponentProps<MenuCardData>> = ({ data }) => {
  return (
    <section className="py-24 md:py-32 bg-stone-50" id="menu">
      {data.backgroundImage && (
        <div
          className="absolute inset-0 opacity-5 bg-cover bg-center"
          style={{ backgroundImage: `url(${data.backgroundImage})` }}
        />
      )}
      <div className="relative max-w-5xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900">{data.headline}</h2>
          {data.subtitle && (
            <p className="text-stone-500 mt-4 max-w-xl mx-auto leading-relaxed">{data.subtitle}</p>
          )}
        </div>

        <div className={`grid grid-cols-1 gap-8 ${data.sections.length >= 3 ? 'md:grid-cols-3' : data.sections.length === 2 ? 'md:grid-cols-2' : ''}`}>
          {data.sections.map(sec => {
            const Icon = iconMap[sec.icon] ?? Utensils;
            return (
              <div key={sec.id} className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                    <Icon size={14} className="text-stone-500" />
                  </div>
                  <h3 className="text-stone-900 font-medium tracking-wide text-sm uppercase">{sec.label}</h3>
                </div>
                <div className="space-y-5">
                  {sec.items.map(item => (
                    <div key={item.id}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-stone-900 font-medium text-sm">{item.name}</p>
                        {item.dietary.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {item.dietary.map(d => DIETARY_LABELS[d] && (
                              <span key={d} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">{DIETARY_LABELS[d]}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-stone-400 text-xs mt-1 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {(data.note || data.showDietaryKey) && (
          <div className="mt-10 text-center space-y-3">
            {data.showDietaryKey && (
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-stone-400">
                <span className="font-medium text-stone-500">Key:</span>
                {Object.entries(DIETARY_LABELS).map(([k, v]) => (
                  <span key={k}><strong>{v}</strong> = {k.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                ))}
              </div>
            )}
            {data.note && <p className="text-stone-400 text-sm italic">{data.note}</p>}
          </div>
        )}
      </div>
    </section>
  );
};

export const menuCardDefinition: SectionDefinition<MenuCardData> = {
  type: 'menu',
  variant: 'card',
  schema: menuCardSchema,
  defaultData: defaultMenuCardData,
  Component: MenuCard,
};
