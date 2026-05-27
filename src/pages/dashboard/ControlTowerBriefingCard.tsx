import React from 'react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import type { ControlTowerAction, ControlTowerBriefing } from './controlTowerIntelligence';

interface ControlTowerBriefingCardProps {
  briefing: ControlTowerBriefing;
  onAction: (action: ControlTowerAction) => void;
}

export const ControlTowerBriefingCard: React.FC<ControlTowerBriefingCardProps> = ({ briefing, onAction }) => (
  <Card variant="bordered" padding="lg" className="shadow-sm">
    <CardHeader>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-tertiary">{briefing.eyebrow}</p>
          <CardTitle className="mt-2">{briefing.title}</CardTitle>
          <CardDescription>{briefing.detail}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {briefing.badges.map((badge) => (
            <Badge key={badge} variant="secondary">
              {badge}
            </Badge>
          ))}
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-surface-secondary/20 px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Main focus</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{briefing.focusTitle}</p>
          <p className="mt-2 text-sm text-text-secondary">{briefing.focusDetail}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-secondary/20 px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Best next move</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{briefing.bestNextMove}</p>
          <div className="mt-3 border-t border-border-subtle pt-3">
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Decision rule</p>
            <p className="mt-2 text-sm text-text-secondary">{briefing.decisionRule}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {briefing.signals.map((signal) => (
          <div key={signal.label} className="rounded-xl border border-border-subtle bg-surface-secondary/20 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">{signal.label}</p>
              <Badge variant={signal.variant}>{signal.value}</Badge>
            </div>
            <p className="mt-3 text-sm text-text-secondary">{signal.detail}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {briefing.sequence.map((step) => (
          <div key={`${step.status}-${step.label}`} className="rounded-xl border border-border-subtle bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-text-primary">{step.label}</p>
              <Badge variant={step.status === 'current' ? 'primary' : 'secondary'}>
                {getFlowStatusLabel(step.status)}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-text-secondary">{step.detail}</p>
          </div>
        ))}
      </div>
      {(briefing.primaryAction || briefing.secondaryAction) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {briefing.primaryAction && (
            <Button variant="accent" size="sm" onClick={() => onAction(briefing.primaryAction!)}>
              {briefing.primaryAction.label}
            </Button>
          )}
          {briefing.secondaryAction && (
            <Button variant="outline" size="sm" onClick={() => onAction(briefing.secondaryAction!)}>
              {briefing.secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);
