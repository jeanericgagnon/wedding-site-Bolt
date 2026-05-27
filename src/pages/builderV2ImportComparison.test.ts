import { describe, expect, it } from 'vitest';

import { buildBuilderV2ImportComparison } from './builderV2ImportComparison';

describe('builder v2 import comparison', () => {
  it('surfaces added and removed lanes when an import replaces page structure', () => {
    const comparison = buildBuilderV2ImportComparison({
      currentSections: [
        { id: 'hero', title: 'Hero', type: 'hero', enabled: true, blockCount: 3 },
        { id: 'story', title: 'Story', type: 'story', enabled: true, blockCount: 2 },
      ],
      incomingSections: [
        { id: 'hero', title: 'Hero', type: 'hero', enabled: true, blockCount: 3 },
        { id: 'gallery', title: 'Gallery', type: 'gallery', enabled: true, blockCount: 4 },
      ],
    });

    expect(comparison.headline).toContain('would be replaced');
    expect(comparison.entries.some((entry) => entry.status === 'added' && entry.sectionTitle === 'Gallery')).toBe(true);
    expect(comparison.entries.some((entry) => entry.status === 'removed' && entry.sectionTitle === 'Story')).toBe(true);
  });

  it('marks changed lanes when block counts or visibility shift', () => {
    const comparison = buildBuilderV2ImportComparison({
      currentSections: [
        { id: 'travel', title: 'Travel', type: 'travel', enabled: true, blockCount: 2 },
      ],
      incomingSections: [
        { id: 'travel', title: 'Travel', type: 'travel', enabled: false, blockCount: 5 },
      ],
    });

    expect(comparison.entries[0]).toMatchObject({
      status: 'changed',
      sectionTitle: 'Travel',
    });
    expect(comparison.entries[0]?.detail).toContain('2 -> 5');
    expect(comparison.entries[0]?.detail).toContain('moves hidden');
  });

  it('recognizes low-risk refresh imports', () => {
    const comparison = buildBuilderV2ImportComparison({
      currentSections: [
        { id: 'hero', title: 'Hero', type: 'hero', enabled: true, blockCount: 3 },
      ],
      incomingSections: [
        { id: 'hero', title: 'Hero', type: 'hero', enabled: true, blockCount: 3 },
      ],
    });

    expect(comparison.headline).toContain('largely matches');
    expect(comparison.entries[0]?.status).toBe('unchanged');
  });
});
