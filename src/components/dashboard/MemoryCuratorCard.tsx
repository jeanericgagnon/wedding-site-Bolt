import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import type { MemoryCuratorModel } from '../../lib/memoryCurator';

interface Props {
  model: MemoryCuratorModel;
}

export const MemoryCuratorCard: React.FC<Props> = ({ model }) => {
  return (
    <Card className="border-rose-200 bg-rose-50/70 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-rose-100 p-2.5">
          <Sparkles className="h-5 w-5 text-rose-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700/80">{model.eyebrow}</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-950">{model.title}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-700">{model.detail}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Readiness</p>
              <p className="mt-1 text-sm font-medium text-neutral-800">{model.readinessLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Main focus</p>
              <p className="mt-1 text-sm font-medium text-neutral-800">{model.focusTitle}</p>
              <p className="mt-2 text-xs leading-5 text-neutral-700">{model.focusDetail}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Best next move</p>
              <p className="mt-1 text-sm font-medium text-neutral-800">{model.bestNextMove}</p>
            </div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-1">
            <div className="rounded-2xl border border-white/70 bg-white/75 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Decision rule</p>
              <p className="mt-1 text-sm font-medium text-neutral-800">{model.decisionRule}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Watchout</p>
              <p className="mt-1 text-sm text-neutral-700">{model.watchout}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {model.sequence.map((step) => (
              <div key={step.id} className="rounded-2xl border border-white/70 bg-white/75 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-neutral-900">{step.title}</p>
                  <Badge variant={step.status === 'current' ? 'primary' : 'secondary'}>
                    {getFlowStatusLabel(step.status)}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-neutral-700">{step.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-2xl border border-white/70 bg-white/75 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Curation note</p>
            <p className="mt-1 text-sm text-neutral-700">{model.curationNote}</p>
          </div>
          {model.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-600">
              {model.badges.map((badge) => (
                <span key={badge} className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                  {badge}
                </span>
              ))}
            </div>
          )}
          {model.qualitySignals.length > 0 && (
            <div className="mt-3 rounded-2xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Quality signals</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral-700">
                {model.qualitySignals.map((signal) => (
                  <span key={signal} className="rounded-full bg-rose-100/70 px-2.5 py-1">
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          )}
          {model.nextMoves.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Next best moves</p>
              <ul className="mt-2 space-y-2 text-sm text-neutral-700">
                {model.nextMoves.map((move) => (
                  <li key={move} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                    <span>{move}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
