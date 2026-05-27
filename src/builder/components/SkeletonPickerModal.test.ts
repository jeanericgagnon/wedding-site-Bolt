import { describe, expect, it } from 'vitest';
import { getSkeletonPickerSummary } from './skeletonPickerSummary';

describe('getSkeletonPickerSummary', () => {
  it('filters by category and keeps the selected layout detail', () => {
    const summary = getSkeletonPickerSummary({
      activeCategory: 'stats',
      search: '',
      selectedId: 'stat-trio',
    });

    expect(summary.selectedCategoryLabel).toBe('Stats');
    expect(summary.filteredCount).toBeGreaterThan(1);
    expect(summary.selectedSkeleton.id).toBe('stat-trio');
    expect(summary.actionText).toContain('section');
  });

  it('matches search against description and block content', () => {
    const summary = getSkeletonPickerSummary({
      activeCategory: 'all',
      search: 'supporting text',
      selectedId: 'metric-split',
    });

    expect(summary.filtered.map((skeleton) => skeleton.id)).toContain('metric-split');
  });

  it('falls back safely when search narrows the set', () => {
    const summary = getSkeletonPickerSummary({
      activeCategory: 'blank',
      search: 'scratch',
      selectedId: 'missing-id',
    });

    expect(summary.filtered.map((skeleton) => skeleton.id)).toEqual(['blank']);
    expect(summary.selectedSkeleton.id).toBe('blank');
    expect(summary.actionText).toContain('Blank');
  });
});
