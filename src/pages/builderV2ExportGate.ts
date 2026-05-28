import type { BuilderV2LaunchGateSummary } from './builderV2LaunchGate';

export type BuilderV2ExportIntent = 'copy' | 'download';

export type BuilderV2ExportGateSummary = {
  intent: BuilderV2ExportIntent;
  ready: boolean;
  ctaLabel: string;
  detail: string;
  primaryActionLabel: string;
};

export const buildBuilderV2ExportGate = ({
  launchGate,
  intent,
}: {
  launchGate: BuilderV2LaunchGateSummary;
  intent: BuilderV2ExportIntent;
}): BuilderV2ExportGateSummary => {
  const readyLabel = intent === 'download' ? 'Download JSON' : 'Copy JSON';
  const reviewLabel = intent === 'download' ? 'Review before download' : 'Review before copy';
  const blockedLabel = intent === 'download' ? 'Fix before download' : 'Fix before copy';

  if (launchGate.status === 'ready') {
    return {
      intent,
      ready: true,
      ctaLabel: readyLabel,
      detail: 'Launch review is clean, so this JSON handoff can move forward from the current document revision.',
      primaryActionLabel: readyLabel,
    };
  }

  if (launchGate.status === 'review') {
    return {
      intent,
      ready: false,
      ctaLabel: reviewLabel,
      detail: `JSON handoff is still waiting on launch review. ${launchGate.bestNextMove}`,
      primaryActionLabel: launchGate.primaryAction.label,
    };
  }

  return {
    intent,
    ready: false,
    ctaLabel: blockedLabel,
    detail: `JSON handoff is blocked until the launch basics are repaired. ${launchGate.bestNextMove}`,
    primaryActionLabel: launchGate.primaryAction.label,
  };
};
