import React from 'react';
import { Brain, ArrowRight } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import type { PlanningDecisionAction, PlanningDecisionCardModel } from './planningDecisionAssistant';

interface Props {
  model: PlanningDecisionCardModel;
  onAction?: (target: PlanningDecisionAction['target']) => void;
}

export const PlanningDecisionCard: React.FC<Props> = ({ model, onAction }) => {
  const handleAction = (target: PlanningDecisionAction['target']) => {
    onAction?.(target);
  };
  const primaryAction = model.primaryAction;
  const secondaryAction = model.secondaryAction;

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
          {(primaryAction || secondaryAction) && onAction && (
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryAction ? (
                <button
                  type="button"
                  onClick={() => handleAction(primaryAction.target)}
                  className="inline-flex min-h-[38px] items-center rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
                >
                  {primaryAction.label}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </button>
              ) : null}
              {secondaryAction ? (
                <button
                  type="button"
                  onClick={() => handleAction(secondaryAction.target)}
                  className="inline-flex min-h-[38px] items-center rounded-full border border-border bg-white px-3.5 py-2 text-sm font-medium text-text-primary transition hover:border-primary/40 hover:text-primary"
                >
                  {secondaryAction.label}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
