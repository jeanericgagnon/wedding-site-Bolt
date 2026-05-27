import React from 'react';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import type { PlannerHandoffModel } from '../../lib/plannerHandoffState';

interface PlannerHandoffCardProps {
  tone: 'planner' | 'coordinator' | 'viewer';
  handoff: PlannerHandoffModel;
}

export const PlannerHandoffCard: React.FC<PlannerHandoffCardProps> = ({ tone, handoff }) => {
  const toneClassName = tone === 'planner'
    ? 'border-primary/20 bg-primary/5 text-primary'
    : tone === 'coordinator'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-border/40 bg-surface-subtle text-text-tertiary';

  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClassName}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Main focus</p>
      <p className="mt-1 text-sm font-semibold">{handoff.focusTitle}</p>
      <p className="mt-1 text-xs leading-5 opacity-90">{handoff.focusDetail}</p>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]">Best next move</p>
      <p className="mt-1 text-xs leading-5 opacity-90">{handoff.nextMove}</p>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]">Decision rule</p>
      <p className="mt-1 text-xs leading-5 opacity-90">{handoff.decisionRule}</p>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]">Watchout</p>
      <p className="mt-1 text-xs leading-5 opacity-90">{handoff.watchout}</p>
      <div className="mt-3 space-y-2">
        {handoff.sequence.map((step) => (
          <div key={step.id} className="rounded-lg border border-current/15 bg-white/70 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold">{step.title}</p>
              <span className="rounded-full border border-current/15 bg-white/80 px-2 py-0.5 text-[10px] font-medium">
                {getFlowStatusLabel(step.status)}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-5 opacity-90">{step.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
