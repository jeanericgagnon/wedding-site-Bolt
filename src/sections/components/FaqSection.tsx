import React, { useState } from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { ChevronDown, HelpCircle, Calendar, MapPin, Shirt, Gift } from 'lucide-react';

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
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-6">{settings.title || 'FAQ'}</h2>
          )}
          <p className="text-text-secondary">FAQs will appear here once you add common guest questions</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 px-4 bg-surface">
      <div className="max-w-4xl mx-auto">
        {settings.showTitle && (
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text-primary text-center mb-10 md:mb-12">{settings.title || 'FAQ'}</h2>
        )}
        <div className="space-y-7">
          {faqsToShow.map(item => (
            <div key={item.id} className="border-b border-border pb-6">
              <h3 className="text-lg md:text-xl font-semibold tracking-tight text-text-primary mb-3">{item.q}</h3>
              <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FaqAccordion: React.FC<Props> = ({ data, instance }) => {
  const { faq } = data;
  const { settings, bindings } = instance;
  const faqsToShow = bindings.faqIds && bindings.faqIds.length > 0
    ? faq.filter(f => bindings.faqIds!.includes(f.id))
    : faq;
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'travel' | 'attire' | 'logistics' | 'gifts'>('all');

  const categoryForQuestion = (q: string): 'travel' | 'attire' | 'logistics' | 'gifts' => {
    const norm = q.toLowerCase();
    if (norm.includes('hotel') || norm.includes('travel') || norm.includes('parking') || norm.includes('shuttle')) return 'travel';
    if (norm.includes('wear') || norm.includes('dress') || norm.includes('attire')) return 'attire';
    if (norm.includes('registry') || norm.includes('gift')) return 'gifts';
    return 'logistics';
  };

  const filteredFaqs = faqsToShow.filter((item) => {
    const matchesSearch = search.trim().length === 0
      || item.q.toLowerCase().includes(search.toLowerCase())
      || item.a.toLowerCase().includes(search.toLowerCase());
    const qCategory = categoryForQuestion(item.q);
    const matchesCategory = category === 'all' || qCategory === category;
    return matchesSearch && matchesCategory;
  });

  if (faqsToShow.length === 0) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-3xl mx-auto text-center">
          {settings.showTitle && (
            <h2 className="text-4xl font-light text-text-primary mb-8">{settings.title || 'FAQ'}</h2>
          )}
          <p className="text-text-secondary">FAQs will appear here once you add common guest questions</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-3xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.32em] text-primary mb-3 font-medium">Good to know</p>
            <h2 className="text-4xl font-light tracking-tight text-text-primary">{settings.title || 'FAQ'}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}
        <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions"
            className="w-full sm:max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
          />
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All' },
              { id: 'logistics', label: 'Logistics' },
              { id: 'travel', label: 'Travel' },
              { id: 'attire', label: 'Attire' },
              { id: 'gifts', label: 'Gifts' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setCategory(opt.id as typeof category)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${category === opt.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-secondary hover:bg-surface-subtle'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredFaqs.length === 0 && (
            <div className="rounded-xl border border-border bg-surface px-4 py-6 text-sm text-text-secondary text-center">
              No FAQ results for that search/filter yet.
            </div>
          )}
          {filteredFaqs.map(item => (
            <div key={item.id} className="border border-border rounded-xl overflow-hidden bg-surface shadow-sm">
              <button
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-subtle ui-motion-standard"
                aria-expanded={openId === item.id}
              >
                <span className="font-medium text-text-primary pr-4 leading-relaxed">{item.q}</span>
                <ChevronDown
                  className={"w-5 h-5 text-primary flex-shrink-0 transition-transform duration-200 " + (openId === item.id ? "rotate-180" : "")}
                  aria-hidden="true"
                />
              </button>
              {openId === item.id && (
                <div className="px-5 pb-5 text-text-secondary leading-relaxed whitespace-pre-wrap border-t border-border pt-4">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FaqIconGrid: React.FC<Props> = ({ data, instance }) => {
  const { faq } = data;
  const { settings, bindings } = instance;
  const faqsToShow = bindings.faqIds && bindings.faqIds.length > 0
    ? faq.filter(f => bindings.faqIds!.includes(f.id))
    : faq;

  const icons = [HelpCircle, Calendar, MapPin, Shirt, Gift];

  if (faqsToShow.length === 0) {
    return (
      <section className="py-20 px-4 bg-surface-subtle">
        <div className="max-w-3xl mx-auto text-center">
          {settings.showTitle && <h2 className="text-4xl font-light text-text-primary mb-8">{settings.title || 'FAQ'}</h2>}
          <p className="text-text-secondary">FAQs will appear here once you add common guest questions</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-5xl mx-auto">
        {settings.showTitle && (
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.32em] text-primary mb-3 font-medium">Good to know</p>
            <h2 className="text-4xl font-light tracking-tight text-text-primary">{settings.title || 'FAQ'}</h2>
            <div className="w-10 h-px bg-primary mx-auto mt-6" />
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {faqsToShow.map((item, idx) => {
            const Icon = icons[idx % icons.length];
            return (
              <div key={item.id} className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold tracking-tight text-text-primary mb-2">{item.q}</h3>
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{item.a}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
