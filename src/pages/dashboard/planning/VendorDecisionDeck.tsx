import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { VendorDecisionDeckModel } from './vendorDecisionSupport';

interface Props {
  model: VendorDecisionDeckModel;
  onSelectVendor?: (vendorId: string) => void;
}

export const VendorDecisionDeck: React.FC<Props> = ({ model, onSelectVendor }) => {
  const toneClass = (tone: 'urgent' | 'watch' | 'ready') => {
    if (tone === 'urgent') return 'border-amber-200 bg-amber-50/70';
    if (tone === 'ready') return 'border-emerald-200 bg-emerald-50/70';
    return 'border-slate-200 bg-white';
  };

  return (
    <Card padding="md" className="border-primary/15 bg-primary/[0.03]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">{model.heading}</p>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{model.summary}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-white/70 bg-white/75 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Main focus</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{model.focusTitle}</p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">{model.focusDetail}</p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/75 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Best next move</p>
              <p className="mt-1 text-sm text-text-secondary">{model.bestNextMove}</p>
              <div className="mt-3 h-px bg-black/5" />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Decision rule</p>
              <p className="mt-1 text-sm text-text-secondary">{model.decisionRule}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
            {model.badges.map((badge) => (
              <span key={badge} className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                {badge}
              </span>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {model.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectVendor?.(item.id)}
                className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${toneClass(item.tone)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.vendorName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-text-tertiary">{item.title}</p>
                  </div>
                  {onSelectVendor ? <ArrowRight className="h-4 w-4 text-text-tertiary" /> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{item.detail}</p>
                <div className="mt-3 rounded-xl border border-white/70 bg-white/75 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Best next move</p>
                  <p className="mt-1 text-sm text-text-secondary">{item.nextBestMove}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                  {item.badges.map((badge) => (
                    <span key={badge} className="rounded-full bg-white/80 px-2.5 py-1">
                      {badge}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
