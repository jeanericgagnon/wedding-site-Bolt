import { ChevronDown, HelpCircle } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface FAQAccordionProps {
  section: Section;
}

export default function FAQAccordion({ section }: FAQAccordionProps) {
  const faqs = [
    {
      question: 'What should I wear?',
      answer: 'The dress code is cocktail attire. We want you to feel comfortable and elegant.',
    },
    {
      question: 'Can I bring a plus one?',
      answer: 'Due to venue capacity, we can only accommodate guests formally invited on your invitation.',
    },
    {
      question: 'Will the ceremony be indoors or outdoors?',
      answer: 'The ceremony will be outdoors weather permitting, with an indoor backup option.',
    },
    {
      question: 'Is parking available?',
      answer: 'Yes, complimentary valet parking will be available at the venue.',
    },
    {
      question: 'Are children welcome?',
      answer: 'While we love your little ones, this will be an adults-only celebration.',
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <HelpCircle className="w-16 h-16 mx-auto mb-6 text-rose-500" />
          <h2 className="text-5xl font-serif mb-4 text-gray-800">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-600">Everything you need to know</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details key={index} className="group bg-gray-50 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-8 py-6 cursor-pointer hover:bg-gray-100 transition-colors">
                <span className="text-xl font-semibold text-gray-800">{faq.question}</span>
                <ChevronDown className="w-6 h-6 text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-8 pb-6 text-lg text-gray-600 leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
