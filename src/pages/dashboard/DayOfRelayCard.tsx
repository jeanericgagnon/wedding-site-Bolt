import React from 'react';
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle } from '../../components/ui';
import { getFlowStatusLabel } from '../../lib/flowLabels';
import type { DayOfRelayModel, DayOfRelayStep } from './dayOfRelay';

interface DayOfRelayCardProps {
  relay: DayOfRelayModel;
  onAction: (step: DayOfRelayStep) => void;
}

function getStepTone(status: DayOfRelayStep['status']) {
  switch (status) {
    case 'current':
      return 'border-primary/25 bg-primary/5';
    case 'next':
      return 'border-amber-300/60 bg-amber-50/70';
    case 'then':
      return 'border-border/50 bg-surface-subtle/40';
    case 'steady':
    default:
      return 'border-emerald-200/70 bg-emerald-50/70';
  }
}

export const DayOfRelayCard: React.FC<DayOfRelayCardProps> = ({ relay, onAction }) => (
  <Card variant="bordered" padding="lg" className="shadow-sm">
    <div className="space-y-4">
      <CardHeader className="mb-0">
        <p className="text-xs uppercase tracking-[0.22em] text-text-tertiary">Day-of relay</p>
        <CardTitle className="mt-1">{relay.headline}</CardTitle>
        <CardDescription>{relay.summary}</CardDescription>
      </CardHeader>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-surface-subtle/35 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Main focus</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{relay.focusTitle}</p>
          <p className="mt-2 text-sm text-text-secondary">{relay.focusDetail}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface-subtle/35 px-3 py-3">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Decision rule</p>
          <p className="mt-2 text-sm text-text-secondary">{relay.decisionRule}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {relay.steps.map((step) => (
          <div key={step.id} className={`rounded-xl border px-4 py-4 ${getStepTone(step.status)}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={step.status === 'current' ? 'primary' : step.status === 'steady' ? 'success' : 'secondary'}>
                    {step.status === 'steady' ? 'Steady' : getFlowStatusLabel(step.status)}
                  </Badge>
                  <p className="text-sm font-semibold text-text-primary">{step.title}</p>
                </div>
                <p className="text-sm text-text-secondary">{step.detail}</p>
              </div>

              <div className="lg:pl-4">
                <Button size="sm" variant={step.status === 'current' ? 'accent' : 'outline'} onClick={() => onAction(step)}>
                  {step.ctaLabel}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);
