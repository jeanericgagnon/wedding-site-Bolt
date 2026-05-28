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

const createCoverage = ({
  reviewedPageCount,
  totalPageCount = 1,
  currentPageReviewed = reviewedPageCount >= totalPageCount,
  nextPageId = currentPageReviewed ? null : 'home',
  nextPageTitle = currentPageReviewed ? null : 'Home',
}: {
  reviewedPageCount: number;
  totalPageCount?: number;
  currentPageReviewed?: boolean;
  nextPageId?: string | null;
  nextPageTitle?: string | null;
}) => ({
  reviewedPageCount,
  totalPageCount,
  currentPageReviewed,
  nextPageId,
  nextPageTitle,
});

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
      activePageId: 'home',
      previewReviewed: {
        desktop: createCoverage({ reviewedPageCount: 0, currentPageReviewed: false }),
        mobile: createCoverage({ reviewedPageCount: 0, currentPageReviewed: false }),
      },
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
      activePageId: 'home',
      previewReviewed: {
        desktop: createCoverage({ reviewedPageCount: 1 }),
        mobile: createCoverage({ reviewedPageCount: 0, currentPageReviewed: false }),
      },
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
      activePageId: 'home',
      previewReviewed: {
        desktop: createCoverage({ reviewedPageCount: 1 }),
        mobile: createCoverage({ reviewedPageCount: 0, currentPageReviewed: false }),
      },
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
      activePageId: 'home',
      previewReviewed: {
        desktop: createCoverage({ reviewedPageCount: 1 }),
        mobile: createCoverage({ reviewedPageCount: 1 }),
      },
    });

    expect(summary.status).toBe('ready');
    expect(summary.primaryAction).toEqual({
      kind: 'open-export',
      label: 'Open export handoff',
    });
    expect(summary.checklistItems.every((item) => item.done)).toBe(true);
  });

  it('keeps launch review in caution mode when watch-level audit debt remains', () => {
    const pages: BuilderV2ReviewPageSnapshot[] = [
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        hidden: false,
        isHome: true,
        sections: [
          {
            id: 'story',
            title: 'Story',
            type: 'story',
            enabled: true,
            blockCount: 8,
            warningCount: 0,
          },
        ],
      },
    ];
    const audit = buildBuilderV2DocumentAudit({ pages, previewDevice: 'desktop' });

    const summary = buildBuilderV2LaunchGate({
      pages,
      audit,
      previewDevice: 'mobile',
      activePageId: 'home',
      previewReviewed: {
        desktop: createCoverage({ reviewedPageCount: 1 }),
        mobile: createCoverage({ reviewedPageCount: 1 }),
      },
    });

    expect(summary.status).toBe('review');
    expect(summary.primaryAction).toMatchObject({
      kind: 'review-audit-issue',
      label: 'Review on mobile',
    });
  });

  it('routes review to the next unreviewed visible page on the missing device', () => {
    const pages: BuilderV2ReviewPageSnapshot[] = [
      ...createPages(),
      {
        id: 'travel',
        title: 'Travel',
        slug: 'travel',
        hidden: false,
        isHome: false,
        sections: [
          {
            id: 'travel-section',
            title: 'Travel',
            type: 'travel',
            enabled: true,
            blockCount: 3,
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
      activePageId: 'home',
      previewReviewed: {
        desktop: createCoverage({
          reviewedPageCount: 1,
          totalPageCount: 2,
          currentPageReviewed: true,
          nextPageId: 'travel',
          nextPageTitle: 'Travel',
        }),
        mobile: createCoverage({
          reviewedPageCount: 1,
          totalPageCount: 2,
          currentPageReviewed: true,
          nextPageId: 'travel',
          nextPageTitle: 'Travel',
        }),
      },
    });

    expect(summary.status).toBe('review');
    expect(summary.primaryAction).toEqual({
      kind: 'review-preview-page',
      label: 'Review Travel on desktop',
      device: 'desktop',
      pageId: 'travel',
      pageTitle: 'Travel',
    });
    expect(summary.checklistItems.find((item) => item.id === 'desktop')?.done).toBe(false);
  });
});
