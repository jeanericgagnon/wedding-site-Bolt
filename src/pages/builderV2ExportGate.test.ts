import { describe, expect, it } from 'vitest';

import { buildBuilderV2ExportGate } from './builderV2ExportGate';
import type { BuilderV2LaunchGateSummary } from './builderV2LaunchGate';

const createLaunchGate = (overrides: Partial<BuilderV2LaunchGateSummary> = {}): BuilderV2LaunchGateSummary => ({
  status: 'review',
  headline: 'Review needed',
  detail: 'Still needs a pass.',
  bestNextMove: 'Open the missing page and review it on mobile.',
  decisionRule: 'Review before export.',
  watchout: 'Do not skip review.',
  keyStats: ['2 visible pages'],
  checklistItems: [],
  primaryAction: { kind: 'switch-preview-device', label: 'Switch to mobile', device: 'mobile' },
  ...overrides,
});

describe('buildBuilderV2ExportGate', () => {
  it('allows direct JSON handoff once launch review is ready', () => {
    const summary = buildBuilderV2ExportGate({
      launchGate: createLaunchGate({
        status: 'ready',
        bestNextMove: 'Open export handoff.',
        primaryAction: { kind: 'open-export', label: 'Open export handoff' },
      }),
      intent: 'download',
    });

    expect(summary.ready).toBe(true);
    expect(summary.ctaLabel).toBe('Download JSON');
    expect(summary.primaryActionLabel).toBe('Download JSON');
  });

  it('keeps copy behind launch review when the draft still needs a page pass', () => {
    const summary = buildBuilderV2ExportGate({
      launchGate: createLaunchGate(),
      intent: 'copy',
    });

    expect(summary.ready).toBe(false);
    expect(summary.ctaLabel).toBe('Review before copy');
    expect(summary.primaryActionLabel).toBe('Switch to mobile');
    expect(summary.detail).toContain('Open the missing page and review it on mobile.');
  });

  it('keeps JSON handoff behind repairs when launch basics are blocked', () => {
    const summary = buildBuilderV2ExportGate({
      launchGate: createLaunchGate({
        status: 'blocked',
        bestNextMove: 'Add first blocks to the home page before exporting.',
        primaryAction: {
          kind: 'review-audit-issue',
          label: 'Add first blocks',
          issue: {
            severity: 'critical',
            pageId: 'home',
            pageTitle: 'Home',
            sectionId: 'hero',
            sectionTitle: 'Hero',
            title: 'Hero is empty',
            detail: 'Add a first content block.',
            actionLabel: 'Add first blocks',
          },
        },
      }),
      intent: 'download',
    });

    expect(summary.ready).toBe(false);
    expect(summary.ctaLabel).toBe('Fix before download');
    expect(summary.primaryActionLabel).toBe('Add first blocks');
    expect(summary.detail).toContain('Add first blocks to the home page before exporting.');
  });
});
