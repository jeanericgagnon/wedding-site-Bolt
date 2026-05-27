import { describe, expect, it } from 'vitest';

import { buildBuilderV2ImportComparison } from './builderV2ImportComparison';

describe('builder v2 import comparison', () => {
  it('surfaces added and removed lanes when an import replaces page structure', () => {
    const comparison = buildBuilderV2ImportComparison({
      currentPages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          hidden: false,
          isHome: true,
          sections: [
            { id: 'hero', title: 'Hero', type: 'hero', enabled: true, blockCount: 3, warningCount: 0 },
            { id: 'story', title: 'Story', type: 'story', enabled: true, blockCount: 2, warningCount: 0 },
          ],
        },
      ],
      incomingPages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          hidden: false,
          isHome: true,
          sections: [
            { id: 'hero', title: 'Hero', type: 'hero', enabled: true, blockCount: 3, warningCount: 0 },
            { id: 'gallery', title: 'Gallery', type: 'gallery', enabled: true, blockCount: 4, warningCount: 0 },
          ],
        },
      ],
    });

    expect(comparison.headline).toContain('would be replaced');
    expect(comparison.entries.some((entry) => entry.status === 'added' && entry.sectionTitle === 'Gallery' && entry.pageTitle === 'Home')).toBe(true);
    expect(comparison.entries.some((entry) => entry.status === 'removed' && entry.sectionTitle === 'Story' && entry.pageTitle === 'Home')).toBe(true);
  });

  it('marks changed lanes when block counts, visibility, or page placement shift', () => {
    const comparison = buildBuilderV2ImportComparison({
      currentPages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          hidden: false,
          isHome: true,
          sections: [
            { id: 'travel', title: 'Travel', type: 'travel', enabled: true, blockCount: 2, warningCount: 0 },
          ],
        },
      ],
      incomingPages: [
        {
          id: 'weekend',
          title: 'Weekend',
          slug: 'weekend',
          hidden: false,
          isHome: false,
          sections: [
            { id: 'travel', title: 'Travel', type: 'travel', enabled: false, blockCount: 5, warningCount: 0 },
          ],
        },
      ],
    });

    expect(comparison.entries[0]).toMatchObject({
      status: 'changed',
      pageTitle: 'Weekend',
      sectionTitle: 'Travel',
    });
    expect(comparison.entries[0]?.detail).toContain('2 -> 5');
    expect(comparison.entries[0]?.detail).toContain('moves hidden');
    expect(comparison.entries[0]?.detail).toContain('moves from Home to Weekend');
  });

  it('recognizes low-risk refresh imports', () => {
    const comparison = buildBuilderV2ImportComparison({
      currentPages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          hidden: false,
          isHome: true,
          sections: [
            { id: 'hero', title: 'Hero', type: 'hero', enabled: true, blockCount: 3, warningCount: 0 },
          ],
        },
      ],
      incomingPages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          hidden: false,
          isHome: true,
          sections: [
            { id: 'hero', title: 'Hero', type: 'hero', enabled: true, blockCount: 3, warningCount: 0 },
          ],
        },
      ],
    });

    expect(comparison.headline).toContain('largely matches');
    expect(comparison.entries[0]?.status).toBe('unchanged');
    expect(comparison.incomingPageSummaries).toEqual(['Home (1 visible · 0 hidden)']);
  });
});
