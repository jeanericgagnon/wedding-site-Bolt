import React, { useState } from 'react';
import { z } from 'zod';
import { Plus, Minus } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const FaqItemSchema = z.object({
  id: z.string(),
  question: z.string().default(''),
  answer: z.string().default(''),
});

export const faqAccordionSchema = z.object({
  eyebrow: z.string().default('Questions'),
  headline: z.string().default('Frequently Asked Questions'),
  subheadline: z.string().default(''),
  items: z.array(FaqItemSchema).default([]),
  expandFirstByDefault: z.boolean().default(false),
});

export type FaqAccordionData = z.infer<typeof faqAccordionSchema>;

export const defaultFaqAccordionData: FaqAccordionData = {
  eyebrow: 'Questions',
  headline: 'Frequently Asked Questions',
  subheadline: 'Have a question not answered here? Reach out and we\'ll be happy to help.',
  expandFirstByDefault: false,
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

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <section className="py-28 md:py-36 bg-gradient-to-b from-stone-50 to-white" id="faq">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-4 tracking-tight text-balance">{data.headline}</h2>
          {data.subheadline && (
            <p className="text-stone-500 font-light leading-relaxed">{data.subheadline}</p>
          )}
        </div>

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
