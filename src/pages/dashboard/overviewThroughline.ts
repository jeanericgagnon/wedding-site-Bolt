import type { AnalyticsNextMove } from './analyticsBaseline';
import type { ControlTowerBriefing } from './controlTowerIntelligence';
import type { CoupleFocusModel } from './coupleFocus';

export interface OverviewThroughlineStep {
  status: 'current' | 'next' | 'then';
  title: string;
  detail: string;
}

export interface OverviewThroughline {
  eyebrow: string;
  title: string;
  detail: string;
  steps: OverviewThroughlineStep[];
}

export function buildOverviewThroughline(input: {
  coupleFocus: CoupleFocusModel;
  analyticsNextMove: AnalyticsNextMove;
  controlTowerBriefing: ControlTowerBriefing;
}): OverviewThroughline {
  const currentStep = input.coupleFocus.steps[0];
  const handoffStep = input.controlTowerBriefing.sequence[0];

  return {
    eyebrow: 'One calm plan',
    title: input.coupleFocus.headline,
    detail: 'This is the shortest honest path through the product right now: start with the main couple focus, use the measured next move to keep momentum real, then let the wider board confirm the handoff.',
    steps: [
      {
        status: 'current',
        title: currentStep?.title ?? input.coupleFocus.headline,
        detail: currentStep?.detail ?? input.coupleFocus.summary,
      },
      {
        status: 'next',
        title: input.analyticsNextMove.title,
        detail: input.analyticsNextMove.detail,
      },
      {
        status: 'then',
        title: handoffStep?.label ?? input.controlTowerBriefing.primaryAction?.label ?? 'Re-check the wider board',
        detail: input.controlTowerBriefing.detail,
      },
    ],
  };
}
