import { describe, expect, it } from 'vitest';

import { buildBuilderV2DocumentAudit } from './builderV2DocumentAudit';
import { buildBuilderV2LaunchGate } from './builderV2LaunchGate';
import type { BuilderV2ReviewPageSnapshot } from './builderV2DocumentReviewState';

const createPages = (): BuilderV2ReviewPageSnapshot[] => [
  {
    id: 'home',
    title: 'Home',
    slug: 'home',
    hidden: false,
    isHome: true,
    sections: [
      {
        id: 'hero',
        title: 'Hero',
        type: 'hero',
        enabled: true,
        blockCount: 2,
        warningCount: 0,
      },
    ],
  },
];

describe('buildBuilderV2LaunchGate', () => {
  it('routes critical blockers through the exact audit issue', () => {
    const pages: BuilderV2ReviewPageSnapshot[] = [
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        hidden: false,
        isHome: true,
        sections: [
          {
            id: 'hero',
            title: 'Hero',
            type: 'hero',
            enabled: true,
            blockCount: 0,
            warningCount: 0,
          },
        ],
      },
    ];
    const audit = buildBuilderV2DocumentAudit({ pages, previewDevice: 'desktop' });

    const summary = buildBuilderV2LaunchGate({
      pages,
      audit,
      previewDevice: 'desktop',
      previewReviewed: { desktop: false, mobile: false },
    });

    expect(summary.status).toBe('blocked');
    expect(summary.primaryAction).toMatchObject({
      kind: 'review-audit-issue',
      label: 'Add first blocks',
    });
    expect(summary.checklistItems.find((item) => item.id === 'critical')?.done).toBe(false);
  });

  it('asks for a mobile check once structure is healthy but mobile is stale', () => {
    const pages = createPages();
    const audit = buildBuilderV2DocumentAudit({ pages, previewDevice: 'desktop' });

    const summary = buildBuilderV2LaunchGate({
      pages,
      audit,
      previewDevice: 'desktop',
      previewReviewed: { desktop: true, mobile: false },
    });

    expect(summary.status).toBe('review');
    expect(summary.primaryAction).toEqual({
      kind: 'switch-preview-device',
      label: 'Switch to mobile',
      device: 'mobile',
    });
    expect(summary.checklistItems.find((item) => item.id === 'desktop')?.done).toBe(true);
    expect(summary.checklistItems.find((item) => item.id === 'mobile')?.done).toBe(false);
  });

  it('asks to mark the current preview as checked when already on that device', () => {
    const pages = createPages();
    const audit = buildBuilderV2DocumentAudit({ pages, previewDevice: 'mobile' });

    const summary = buildBuilderV2LaunchGate({
      pages,
      audit,
      previewDevice: 'mobile',
      previewReviewed: { desktop: true, mobile: false },
    });

    expect(summary.primaryAction).toEqual({
      kind: 'mark-preview-reviewed',
      label: 'Mark mobile checked',
      device: 'mobile',
    });
  });

  it('opens export once audit and preview checks are fully clean', () => {
    const pages = createPages();
    const audit = buildBuilderV2DocumentAudit({ pages, previewDevice: 'mobile' });

    const summary = buildBuilderV2LaunchGate({
      pages,
      audit,
      previewDevice: 'mobile',
      previewReviewed: { desktop: true, mobile: true },
    });

    expect(summary.status).toBe('ready');
    expect(summary.primaryAction).toEqual({
      kind: 'open-export',
      label: 'Open export handoff',
    });
    expect(summary.checklistItems.every((item) => item.done)).toBe(true);
  });
});
