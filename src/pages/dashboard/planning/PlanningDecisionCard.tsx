import React from 'react';
import { Brain, ArrowRight } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { PlanningDecisionCardModel } from './planningDecisionAssistant';

interface Props {
  model: PlanningDecisionCardModel;
  onAction?: (target: PlanningDecisionCardModel['primaryAction'] extends infer T ? T extends { target: infer U } ? U : never : never) => void;
}

export const PlanningDecisionCard: React.FC<Props> = ({ model, onAction }) => {
  const handleAction = (target: Props['onAction'] extends (...args: infer A) => unknown ? A[0] : never) => {
    onAction?.(target);
  };

  return (
    <Card padding="md" className="border-primary/20 bg-primary/[0.04]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">{model.eyebrow}</p>
          <h3 className="mt-1 text-base font-semibold text-text-primary">{model.title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-text-secondary">{model.detail}</p>
          {model.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
              {model.badges.map((badge) => (
                <span key={badge} className="rounded-full bg-white px-2.5 py-1 shadow-sm">
                  {badge}
                </span>
              ))}
            </div>
          )}
          {(model.primaryAction || model.secondaryAction) && onAction && (
            <div className="mt-4 flex flex-wrap gap-2">
              {model.primaryAction ? (
                <button
                  type="button"
                  onClick={() => handleAction(model.primaryAction?.target)}
                  className="inline-flex min-h-[38px] items-center rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
                >
                  {model.primaryAction.label}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </button>
              ) : null}
              {model.secondaryAction ? (
                <button
                  type="button"
                  onClick={() => handleAction(model.secondaryAction?.target)}
                  className="inline-flex min-h-[38px] items-center rounded-full border border-border bg-white px-3.5 py-2 text-sm font-medium text-text-primary transition hover:border-primary/40 hover:text-primary"
                >
                  {model.secondaryAction.label}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
