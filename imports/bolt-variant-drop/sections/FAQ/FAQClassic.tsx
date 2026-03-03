import { HelpCircle } from 'lucide-react';
import { Section } from '../../types/layoutConfig';

interface FAQClassicProps {
  section: Section;
}

export default function FAQClassic({ section }: FAQClassicProps) {
  const faqs = [
    { question: 'What should I wear?', answer: 'The dress code is formal attire. Please no jeans or casual wear.' },
    { question: 'Can I bring a plus one?', answer: 'Please refer to your invitation. If you have a plus one, it will be noted there.' },
    { question: 'Will there be parking?', answer: 'Yes, complimentary valet parking will be available at the venue.' },
    { question: 'Is the wedding indoors or outdoors?', answer: 'The ceremony will be outdoors weather permitting, with the reception indoors.' },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-5xl font-serif text-center mb-16 text-gray-800">Frequently Asked Questions</h2>
        <div className="space-y-8">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 pb-8">
              <div className="flex items-start gap-4 mb-3">
                <HelpCircle className="w-6 h-6 text-rose-400 mt-1 flex-shrink-0" />
                <h3 className="text-xl font-semibold text-gray-800">{faq.question}</h3>
              </div>
              <p className="text-gray-600 ml-10">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
