import React, { useState } from 'react';
import { z } from 'zod';
import { Utensils, Leaf, AlertCircle } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  description: z.string().default(''),
  dietary: z.array(z.string()).default([]),
});

const MenuCourseSchema = z.object({
  id: z.string(),
  label: z.string().default(''),
  items: z.array(MenuItemSchema).default([]),
});

export const menuTabsSchema = z.object({
  eyebrow: z.string().default('Dining'),
  headline: z.string().default('The Menu'),
  subtitle: z.string().default(''),
  note: z.string().default('Please let us know of any dietary restrictions when you RSVP.'),
  showDietaryIcons: z.boolean().default(true),
  courses: z.array(MenuCourseSchema).default([]),
});

export type MenuTabsData = z.infer<typeof menuTabsSchema>;

export const defaultMenuTabsData: MenuTabsData = {
  eyebrow: 'Dining',
  headline: 'The Menu',
  subtitle: 'A carefully curated dining experience for our celebration.',
  note: 'Please inform us of any dietary restrictions when you RSVP.',
  showDietaryIcons: true,
  courses: [
    {
      id: '1',
      label: 'Cocktail Hour',
      items: [
        { id: '1a', name: 'Charcuterie & Cheese Board', description: 'Artisan cheeses, cured meats, seasonal fruits, and house-made crackers', dietary: [] },
        { id: '1b', name: 'Bruschetta', description: 'Heirloom tomatoes, fresh basil, garlic, aged balsamic', dietary: ['vegan'] },
        { id: '1c', name: 'Shrimp Cocktail', description: 'Chilled jumbo shrimp with classic cocktail sauce and lemon', dietary: ['gluten-free'] },
      ],
    },
    {
      id: '2',
      label: 'First Course',
      items: [
        { id: '2a', name: 'Baby Greens Salad', description: 'Mixed greens, candied walnuts, dried cranberries, champagne vinaigrette', dietary: ['vegetarian', 'gluten-free'] },
        { id: '2b', name: 'Lobster Bisque', description: 'Velvety cream-based soup with tender lobster and a touch of sherry', dietary: ['gluten-free'] },
      ],
    },
    {
      id: '3',
      label: 'Main Course',
      items: [
        { id: '3a', name: 'Filet Mignon', description: '8oz prime tenderloin with truffle butter, roasted garlic mashed potatoes', dietary: ['gluten-free'] },
        { id: '3b', name: 'Pan-Seared Salmon', description: 'Wild-caught salmon with lemon beurre blanc, asparagus, and wild rice', dietary: ['gluten-free'] },
        { id: '3c', name: 'Wild Mushroom Risotto', description: 'Creamy arborio, porcini & shiitake mushrooms, aged parmesan, truffle oil', dietary: ['vegetarian'] },
      ],
    },
    {
      id: '4',
      label: 'Dessert',
      items: [
        { id: '4a', name: 'Wedding Cake', description: 'Layered vanilla sponge with champagne buttercream and fresh florals', dietary: [] },
        { id: '4b', name: 'Dessert Station', description: 'Macarons, chocolate truffles, mini crème brûlée, and seasonal sorbets', dietary: [] },
      ],
    },
  ],
};

const DIETARY_LABELS: Record<string, { label: string; color: string }> = {
  vegetarian: { label: 'V', color: 'bg-green-100 text-green-700' },
  vegan: { label: 'VG', color: 'bg-emerald-100 text-emerald-700' },
  'gluten-free': { label: 'GF', color: 'bg-amber-100 text-amber-700' },
  'nut-free': { label: 'NF', color: 'bg-orange-100 text-orange-700' },
  halal: { label: 'H', color: 'bg-teal-100 text-teal-700' },
  kosher: { label: 'K', color: 'bg-blue-100 text-blue-700' },
};

const MenuTabs: React.FC<SectionComponentProps<MenuTabsData>> = ({ data }) => {
  const [activeTab, setActiveTab] = useState(0);
  const activeCourse = data.courses[activeTab];

  return (
    <section className="py-28 md:py-36 bg-stone-50" id="menu">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-stone-200" />
            <Utensils size={16} className="text-stone-300" />
            <div className="w-8 h-px bg-stone-200" />
          </div>
          <h2 className="text-4xl md:text-5xl font-light text-stone-900">{data.headline}</h2>
          {data.subtitle && (
            <p className="text-stone-500 mt-4 text-lg font-light">{data.subtitle}</p>
          )}
        </div>

        {data.courses.length > 0 && (
          <>
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {data.courses.map((course, i) => (
                <button
                  key={course.id}
                  onClick={() => setActiveTab(i)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    i === activeTab
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white text-stone-600 hover:bg-rose-50'
                  }`}
                >
                  {course.label}
                </button>
              ))}
            </div>

            {activeCourse && (
              <div className="space-y-4">
                {activeCourse.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 py-5 border-b border-stone-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <h3 className="text-stone-900 font-medium">{item.name}</h3>
                        {data.showDietaryIcons && item.dietary.map(d => {
                          const info = DIETARY_LABELS[d];
                          return info ? (
                            <span key={d} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${info.color}`}>
                              {info.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                      {item.description && (
                        <p className="text-stone-500 text-sm leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {data.note && (
          <div className="mt-10 flex items-start gap-3 p-4 bg-stone-50 rounded-xl border border-stone-100">
            <AlertCircle size={16} className="text-stone-400 shrink-0 mt-0.5" />
            <p className="text-stone-500 text-sm leading-relaxed">{data.note}</p>
          </div>
        )}

        {data.showDietaryIcons && (
          <div className="mt-6 flex flex-wrap items-center gap-3 justify-center">
            {Object.entries(DIETARY_LABELS).map(([key, { label, color }]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-stone-500">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color}`}>{label}</span>
                {key.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const menuTabsDefinition: SectionDefinition<MenuTabsData> = {
  type: 'menu',
  variant: 'tabs',
  schema: menuTabsSchema,
  defaultData: defaultMenuTabsData,
  Component: MenuTabs,
};
