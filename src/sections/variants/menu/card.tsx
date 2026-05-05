import React from 'react';
import { z } from 'zod';
import { Utensils, Leaf, Wine } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { getSafePublicImageUrl } from '../../publicLinks';

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
  layoutStyle: z.enum(['card', 'cocktailDinner']).default('card'),
});

export type MenuCardData = z.infer<typeof menuCardSchema>;

export const defaultMenuCardData: MenuCardData = {
  eyebrow: 'Dining',
  headline: 'An Evening to Remember',
  subtitle: 'Join us for an exceptional culinary experience as we celebrate our special day.',
  note: 'Dietary requirements can be noted on your RSVP.',
  showDietaryKey: true,
  backgroundImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=85',
  layoutStyle: 'card',
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
  const backgroundImage = getSafePublicImageUrl(data.backgroundImage);

  if (data.layoutStyle === 'cocktailDinner') {
    const cocktailSections = data.sections.filter((section) => /cocktail|start|hour|drink|wine/i.test(section.label));
    const dinnerSections = data.sections.filter((section) => !cocktailSections.some((candidate) => candidate.id === section.id));
    const columns = [
      { label: 'Cocktail hour', sections: cocktailSections.length ? cocktailSections : data.sections.slice(0, 1) },
      { label: 'Dinner service', sections: dinnerSections.length ? dinnerSections : data.sections.slice(1) },
    ];

    return (
      <section className="relative overflow-hidden py-28 md:py-36 bg-stone-950" id="menu">
        {backgroundImage && <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url("${backgroundImage}")` }} />}
        <div className="relative max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-14">
            {data.eyebrow && <p className="text-sm text-white/45 font-light mb-4">{data.eyebrow}</p>}
            <h2 className="text-4xl md:text-6xl font-light text-white">{data.headline}</h2>
            {data.subtitle && <p className="mt-4 text-white/60">{data.subtitle}</p>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {columns.map((column) => (
              <div key={column.label} className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 md:p-8 backdrop-blur">
                <p className="text-sm text-white/45 mb-6">{column.label}</p>
                <div className="space-y-8">
                  {column.sections.flatMap((section) => section.items).map((item) => (
                    <div key={item.id} className="border-b border-white/10 pb-5 last:border-0 last:pb-0">
                      <h3 className="font-medium text-white">{item.name}</h3>
                      {item.description && <p className="mt-1 text-sm leading-relaxed text-white/55">{item.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {data.note && <p className="mt-8 text-center text-sm italic text-white/45">{data.note}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden py-28 md:py-36 bg-stone-900" id="menu">
      {backgroundImage && (
        <div
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: `url("${backgroundImage}")` }}
        />
      )}
      <div className="relative max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          {data.eyebrow && (
            <p className="text-sm text-stone-300 font-light mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-white">{data.headline}</h2>
          {data.subtitle && (
            <p className="text-stone-300 mt-4 max-w-xl mx-auto leading-relaxed">{data.subtitle}</p>
          )}
        </div>

        <div className={`grid grid-cols-1 gap-8 ${data.sections.length >= 3 ? 'md:grid-cols-3' : data.sections.length === 2 ? 'md:grid-cols-2' : ''}`}>
          {data.sections.map(sec => {
            const Icon = iconMap[sec.icon] ?? Utensils;
            return (
              <div key={sec.id} className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-xl border border-white/50">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                    <Icon size={14} className="text-stone-500" />
                  </div>
                  <h3 className="text-stone-900 font-medium text-sm">{sec.label}</h3>
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

export const menuCocktailDinnerDefinition: SectionDefinition<MenuCardData> = {
  type: 'menu',
  variant: 'cocktailDinner',
  schema: menuCardSchema,
  defaultData: { ...defaultMenuCardData, layoutStyle: 'cocktailDinner' },
  Component: MenuCard,
};
