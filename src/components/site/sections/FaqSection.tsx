import React from 'react';
import { HelpCircle } from 'lucide-react';
import type { FaqContent } from '../../../types/siteConfig';

interface FaqSectionProps {
  content: FaqContent;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ content }) => {
  return (
    <section className="py-16 px-8 bg-surface">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <HelpCircle className="w-12 h-12 text-accent mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-text-primary">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-6">
          {content.items.map((item) => (
            <div key={item.id} className="bg-background rounded-lg p-6">
              <h3 className="font-semibold text-text-primary mb-3 text-lg">
                {item.question}
              </h3>
              <p className="text-text-secondary">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
