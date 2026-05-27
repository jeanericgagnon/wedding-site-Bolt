import React from 'react';
import { Button, Card, CardDescription, CardHeader, CardTitle, Badge } from '../../components/ui';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import type { DayOfBrainAction, DayOfBrainBriefing } from './dayOfBrain';

interface DayOfBrainCardProps {
  briefing: DayOfBrainBriefing;
  onAction: (action: DayOfBrainAction) => void;
}

export const DayOfBrainCard: React.FC<DayOfBrainCardProps> = ({ briefing, onAction }) => (
  <Card variant="bordered" padding="lg" className="shadow-sm">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-4">
        <CardHeader className="mb-0">
          <p className="text-xs uppercase tracking-[0.22em] text-text-tertiary">{briefing.eyebrow}</p>
          <CardTitle className="mt-1">{briefing.title}</CardTitle>
          <CardDescription>{briefing.detail}</CardDescription>
        </CardHeader>

        <div className="flex flex-wrap gap-2">
          {briefing.badges.map((badge) => (
            <Badge key={badge} variant="secondary">{badge}</Badge>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-surface-subtle/35 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Main focus</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{briefing.focusTitle}</p>
            <p className="mt-2 text-sm text-text-secondary">{briefing.focusDetail}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-surface-subtle/35 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Best next move</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{briefing.bestNextMove}</p>
            <div className="mt-3 border-t border-border/50 pt-3">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Decision rule</p>
              <p className="mt-2 text-sm text-text-secondary">{briefing.decisionRule}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-text-tertiary">Watchout</p>
              <p className="mt-2 text-sm text-text-secondary">{briefing.watchout}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {briefing.signals.map((signal) => (
            <div key={signal.label} className="rounded-xl border border-border/40 bg-surface-subtle/35 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-text-secondary">{signal.label}</p>
                <Badge variant={signal.variant}>{signal.value}</Badge>
              </div>
              <p className="mt-2 text-xs text-text-tertiary">{signal.detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {briefing.sequence.map((step) => (
            <div key={step.id} className="rounded-xl border border-border/40 bg-white px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-text-primary">{step.title}</p>
                <Badge variant={step.status === 'current' ? 'primary' : 'secondary'}>
                  {getFlowStatusLabel(step.status)}
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
        {briefing.primaryAction && (
          <Button size="sm" variant="accent" onClick={() => onAction(briefing.primaryAction!)}>
            {briefing.primaryAction.label}
          </Button>
        )}
        {briefing.secondaryAction && (
          <Button size="sm" variant="outline" onClick={() => onAction(briefing.secondaryAction!)}>
            {briefing.secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  </Card>
);
