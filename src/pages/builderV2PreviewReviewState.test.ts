import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2PreviewCoverage,
  buildBuilderV2PreviewReviewKey,
} from './builderV2PreviewReviewState';
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
  {
    id: 'travel',
    title: 'Travel',
    slug: 'travel',
    hidden: false,
    isHome: false,
    sections: [
      {
        id: 'travel-notes',
        title: 'Travel notes',
        type: 'travel',
        enabled: true,
        blockCount: 3,
        warningCount: 0,
      },
    ],
  },
];

describe('builderV2PreviewReviewState', () => {
  it('keeps review credit for untouched pages when another page changes', () => {
    const beforePages = createPages();
    const afterPages = [
      beforePages[0],
      {
        ...beforePages[1],
        sections: beforePages[1]!.sections.map((section) => ({
          ...section,
          blockCount: section.blockCount + 1,
        })),
      },
    ];

    const reviewedPages = {
      home: buildBuilderV2PreviewReviewKey(beforePages[0]!),
      travel: buildBuilderV2PreviewReviewKey(beforePages[1]!),
    };

    const coverage = buildBuilderV2PreviewCoverage({
      pages: afterPages,
      reviewedPages,
      activePageId: 'travel',
    });

    expect(coverage.reviewedPageCount).toBe(1);
    expect(coverage.currentPageReviewed).toBe(false);
    expect(coverage.nextPageId).toBe('travel');
  });

  it('drops hidden and section-empty pages from review coverage', () => {
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
            enabled: false,
            blockCount: 2,
            warningCount: 0,
          },
        ],
      },
      {
        id: 'travel',
        title: 'Travel',
        slug: 'travel',
        hidden: true,
        isHome: false,
        sections: [
          {
            id: 'travel-notes',
            title: 'Travel notes',
            type: 'travel',
            enabled: true,
            blockCount: 3,
            warningCount: 0,
          },
        ],
      },
    ];

    const coverage = buildBuilderV2PreviewCoverage({
      pages,
      reviewedPages: {},
      activePageId: 'home',
    });

    expect(coverage).toEqual({
      reviewedPageCount: 0,
      totalPageCount: 0,
      currentPageReviewed: false,
      nextPageId: null,
      nextPageTitle: null,
    });
  });
});
