import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { Car, Gift, HelpCircle, MapPin, Minus, Plus, Shirt, UtensilsCrossed, Users } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const FaqItemSchema = z.object({
  id: z.string(),
  question: z.string().default(''),
  answer: z.string().default(''),
});

export const faqAccordionSchema = z.object({
  eyebrow: z.string().default('Questions'),
  headline: z.string().default('Frequently asked questions'),
  subheadline: z.string().default(''),
  items: z.array(FaqItemSchema).default([]),
  expandFirstByDefault: z.boolean().default(false),
  layoutStyle: z.enum(['accordion', 'openList', 'iconGrid', 'twoColumn', 'tabbed', 'chat', 'numbered']).default('accordion'),
});

export type FaqAccordionData = z.infer<typeof faqAccordionSchema>;

export const defaultFaqAccordionData: FaqAccordionData = {
  eyebrow: 'Questions',
  headline: 'Frequently asked questions',
  subheadline: 'Have a question not answered here? Reach out and we\'ll be happy to help.',
  expandFirstByDefault: false,
  layoutStyle: 'accordion',
  items: [
    {
      id: '1',
      question: 'Is the venue child-friendly?',
      answer: 'While we love your little ones, we have chosen to make our reception an adults-only event. We hope you\'ll enjoy this as a chance for a night out!',
    },
    {
      id: '2',
      question: 'What is the dress code?',
      answer: 'Cocktail attire. We ask that guests wear formal or semi-formal attire. Please avoid white, ivory, or cream.',
    },
    {
      id: '3',
      question: 'Can I bring a plus one?',
      answer: 'Due to limited capacity, we can only accommodate guests who are formally invited. Your invitation will indicate whether a plus one is included.',
    },
    {
      id: '4',
      question: 'Is there parking at the venue?',
      answer: 'Yes! Valet parking is available at the venue entrance for $40. There are also several parking garages within a short walking distance.',
    },
    {
      id: '5',
      question: 'What if I have dietary restrictions?',
      answer: 'Please note any dietary restrictions in your RSVP. We will do our best to accommodate all needs. The caterer can accommodate vegetarian, vegan, and gluten-free options.',
    },
  ],
};

const FaqAccordion: React.FC<SectionComponentProps<FaqAccordionData>> = ({ data }) => {
  const [openId, setOpenId] = useState<string | null>(
    data.expandFirstByDefault && data.items[0] ? data.items[0].id : null
  );
  const categorizedItems = data.items.map((item) => ({ ...item, category: getFaqCategory(item.question, item.answer) }));
  const categories = Array.from(new Set(categorizedItems.map((item) => item.category)));
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? 'Details');
  useEffect(() => {
    setOpenId(data.expandFirstByDefault && data.items[0] ? data.items[0].id : null);
    setActiveCategory(categories[0] ?? 'Details');
  }, [categories, data.expandFirstByDefault, data.items]);

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  const header = (
    <div className="text-center mb-14">
      {data.eyebrow && (
        <p className="text-sm text-stone-400 font-light mb-4">
          {data.eyebrow}
        </p>
      )}
      <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-4 text-balance">{data.headline}</h2>
      {data.subheadline && (
        <p className="text-stone-500 font-light leading-relaxed">{data.subheadline}</p>
      )}
    </div>
  );

  if (data.layoutStyle === 'tabbed') {
    const visibleItems = categorizedItems.filter((item) => item.category === activeCategory);
    return (
      <section className="py-28 md:py-36 bg-white" id="faq">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[0.7fr_1.3fr] gap-10 lg:gap-14 items-start">
            <div className="lg:sticky lg:top-8">
              {data.eyebrow && <p className="text-sm text-stone-400 font-light mb-4">{data.eyebrow}</p>}
              <h2 className="text-4xl md:text-6xl font-light text-stone-950 text-balance">{data.headline}</h2>
              {data.subheadline && <p className="mt-5 text-stone-500 leading-relaxed">{data.subheadline}</p>}
              <div className="mt-8 flex flex-wrap lg:flex-col gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      activeCategory === category
                        ? 'border-stone-950 bg-stone-950 text-white'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-stone-200 bg-stone-50 p-3 md:p-4">
              <div className="space-y-3">
                {visibleItems.map((item) => (
                  <article key={item.id} className="rounded-[1.5rem] bg-white p-5 md:p-6 shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <FaqIcon category={item.category} />
                      <p className="text-xs text-stone-400">{item.category}</p>
                    </div>
                    <h3 className="text-lg font-medium leading-snug text-stone-950">{item.question}</h3>
                    <p className="mt-3 text-sm md:text-base font-light leading-[1.75] text-stone-600">{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'openList' || data.layoutStyle === 'twoColumn' || data.layoutStyle === 'iconGrid' || data.layoutStyle === 'numbered') {
    const gridClass = data.layoutStyle === 'openList' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
    const sectionClass = data.layoutStyle === 'numbered' ? 'bg-white' : data.layoutStyle === 'iconGrid' ? 'bg-stone-950 text-white' : 'bg-[#fbfaf7]';
    return (
      <section className={`py-28 md:py-36 ${sectionClass}`} id="faq">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          {data.layoutStyle === 'iconGrid' ? (
            <div className="mx-auto mb-14 max-w-3xl text-center">
              {data.eyebrow && <p className="text-sm text-white/40 font-light mb-4">{data.eyebrow}</p>}
              <h2 className="text-4xl md:text-5xl font-light text-white mb-4 text-balance">{data.headline}</h2>
              {data.subheadline && <p className="text-white/55 font-light leading-relaxed">{data.subheadline}</p>}
            </div>
          ) : header}
          <div className={`grid ${gridClass} gap-4 ${data.layoutStyle === 'numbered' ? 'md:gap-0' : ''}`}>
            {categorizedItems.map((item, index) => (
              <article
                key={item.id}
                className={
                  data.layoutStyle === 'numbered'
                    ? 'grid grid-cols-[4rem_1fr] gap-4 border-t border-stone-200 py-7 md:grid-cols-[7rem_1fr]'
                    : data.layoutStyle === 'iconGrid'
                      ? 'rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 md:p-7 shadow-2xl shadow-black/10'
                      : 'rounded-3xl border border-stone-200 bg-white p-6 md:p-7 shadow-sm'
                }
              >
                {data.layoutStyle === 'numbered' ? (
                  <>
                    <span className="text-4xl md:text-6xl font-light tabular-nums text-stone-300">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h3 className="font-medium leading-snug text-stone-950">{item.question}</h3>
                      <p className="mt-3 text-sm md:text-base font-light leading-[1.75] text-stone-600">{item.answer}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-3">
                      {data.layoutStyle === 'iconGrid' ? <FaqIcon category={item.category} dark /> : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xs text-white">?</span>
                      )}
                      <h3 className={`font-medium leading-snug ${data.layoutStyle === 'iconGrid' ? 'text-white' : 'text-stone-950'}`}>{item.question}</h3>
                    </div>
                    <p className={`text-sm md:text-base font-light leading-[1.75] ${data.layoutStyle === 'iconGrid' ? 'text-white/62' : 'text-stone-600'}`}>{item.answer}</p>
                  </>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'chat') {
    return (
      <section className="py-28 md:py-36 bg-stone-950" id="faq">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <div className="mb-12 text-center">
            {data.eyebrow && <p className="mb-4 text-sm text-white/40">{data.eyebrow}</p>}
            <h2 className="text-4xl md:text-5xl font-light text-white">{data.headline}</h2>
            {data.subheadline && <p className="mt-4 text-white/55">{data.subheadline}</p>}
          </div>
          <div className="space-y-5">
            {data.items.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="max-w-[82%] rounded-3xl rounded-bl-md bg-white px-5 py-4 text-stone-950">{item.question}</div>
                <div className="ml-auto max-w-[82%] rounded-3xl rounded-br-md bg-white/10 px-5 py-4 text-white/72">{item.answer}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-32 md:py-40 bg-gradient-to-b from-stone-50 to-white" id="faq">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        {header}

        <div className="space-y-3.5">
          {data.items.map(item => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isOpen ? 'border-stone-200 shadow-sm' : 'border-stone-100'
                }`}
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="flex items-center justify-between w-full text-left px-7 py-5.5 group"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-stone-900 text-base leading-snug pr-4 group-hover:text-stone-700 transition-colors">
                    {item.question}
                  </span>
                  <span className="flex-shrink-0">
                    {isOpen
                      ? <Minus size={16} className="text-stone-400" />
                      : <Plus size={16} className="text-stone-400 group-hover:text-stone-600 transition-colors" />
                    }
                  </span>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5">
                    <p className="text-stone-500 leading-relaxed text-sm md:text-base font-light">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const faqAccordionDefinition: SectionDefinition<FaqAccordionData> = {
  type: 'faq',
  variant: 'accordion',
  schema: faqAccordionSchema,
  defaultData: defaultFaqAccordionData,
  Component: FaqAccordion,
};

const makeFaqDefinition = (variant: string, layoutStyle: FaqAccordionData['layoutStyle']): SectionDefinition<FaqAccordionData> => ({
  type: 'faq',
  variant,
  schema: faqAccordionSchema,
  defaultData: { ...defaultFaqAccordionData, layoutStyle },
  Component: FaqAccordion,
});

export const faqDefaultDefinition = makeFaqDefinition('default', 'openList');
export const faqIconGridDefinition = makeFaqDefinition('iconGrid', 'iconGrid');
export const faqTwoColumnDefinition = makeFaqDefinition('twoColumn', 'twoColumn');
export const faqTabbedDefinition = makeFaqDefinition('tabbed', 'tabbed');
export const faqChatDefinition = makeFaqDefinition('chat', 'chat');
export const faqNumberedDefinition = makeFaqDefinition('numbered', 'numbered');

function getFaqCategory(question: string, answer: string): string {
  const text = `${question} ${answer}`.toLowerCase();
  if (/(dress|attire|wear|black tie|cocktail)/.test(text)) return 'Attire';
  if (/(park|parking|drive|shuttle|transport|rideshare|car|airport|hotel)/.test(text)) return 'Travel';
  if (/(rsvp|plus one|guest|invite|invitation|children|kids|child)/.test(text)) return 'Guest List';
  if (/(meal|diet|food|allerg|vegetarian|vegan|gluten)/.test(text)) return 'Dining';
  if (/(gift|registry|cash|honeymoon)/.test(text)) return 'Gifts';
  if (/(venue|location|address|where|when|time|arrive)/.test(text)) return 'Logistics';
  return 'Details';
}

const FaqIcon: React.FC<{ category: string; dark?: boolean }> = ({ category, dark = false }) => {
  const iconClass = dark ? 'text-white' : 'text-stone-950';
  const wrapClass = dark ? 'bg-white/10 border-white/10' : 'bg-stone-100 border-stone-200';
  const Icon = category === 'Attire'
    ? Shirt
    : category === 'Travel'
      ? Car
      : category === 'Guest List'
        ? Users
        : category === 'Dining'
          ? UtensilsCrossed
          : category === 'Gifts'
            ? Gift
            : category === 'Logistics'
              ? MapPin
              : HelpCircle;
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${wrapClass}`}>
      <Icon size={17} className={iconClass} />
    </span>
  );
};
