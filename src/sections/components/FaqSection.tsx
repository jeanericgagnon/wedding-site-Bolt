import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

export const FaqSection: React.FC<Props> = ({ data, instance }) => {
  const { faq } = data;
  const { settings, bindings } = instance;
  
  const faqsToShow = bindings.faqIds && bindings.faqIds.length > 0
    ? faq.filter(f => bindings.faqIds!.includes(f.id))
    : faq;

  if (faqsToShow.length === 0) {
    return (
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-bold text-text-primary mb-8">
              {settings.title || 'FAQ'}
            </h2>
          )}
          <p className="text-text-secondary">FAQ coming soon</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-4xl font-bold text-text-primary text-center mb-12">
            {settings.title || 'FAQ'}
          </h2>
        )}
        <div className="space-y-8">
          {faqsToShow.map(item => (
            <div key={item.id} className="border-b border-border pb-6">
              <h3 className="text-xl font-semibold text-text-primary mb-3">
                {item.q}
              </h3>
              <p className="text-text-secondary whitespace-pre-wrap">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
