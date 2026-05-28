import { describe, expect, it } from 'vitest';

import { applyBuilderV2SectionVisibility } from './builderV2SectionVisibilityState';

describe('builderV2SectionVisibilityState', () => {
  it('hides selected sections while preserving the existing block stacks', () => {
    const sections = [
      { id: 'hero', enabled: true, title: 'Hero' },
      { id: 'story', enabled: true, title: 'Story' },
      { id: 'faq', enabled: false, title: 'FAQ' },
    ];
    const sectionBlocks = {
      hero: [{ id: 'hero-1', type: 'title' }],
      story: [{ id: 'story-1', type: 'text' }],
      faq: [{ id: 'faq-1', type: 'faqItem' }],
    };

    const result = applyBuilderV2SectionVisibility({
      sections,
      sectionBlocks,
      selectedIds: ['hero', 'story'],
      enabled: false,
    });

    expect(result.changedIds).toEqual(['hero', 'story']);
    expect(result.sections.map((section) => ({ id: section.id, enabled: section.enabled }))).toEqual([
      { id: 'hero', enabled: false },
      { id: 'story', enabled: false },
      { id: 'faq', enabled: false },
    ]);
    expect(result.sectionBlocks).toBe(sectionBlocks);
    expect(result.sectionBlocks.story).toEqual([{ id: 'story-1', type: 'text' }]);
  });

  it('shows selected sections without rewriting untouched block storage', () => {
    const sections = [
      { id: 'hero', enabled: false },
      { id: 'story', enabled: false },
    ];
    const sectionBlocks = {
      hero: [{ id: 'hero-1', type: 'title' }],
      story: [{ id: 'story-1', type: 'text' }],
    };

    const result = applyBuilderV2SectionVisibility({
      sections,
      sectionBlocks,
      selectedIds: ['story'],
      enabled: true,
    });

    expect(result.changedIds).toEqual(['story']);
    expect(result.sections.map((section) => ({ id: section.id, enabled: section.enabled }))).toEqual([
      { id: 'hero', enabled: false },
      { id: 'story', enabled: true },
    ]);
    expect(result.sectionBlocks).toBe(sectionBlocks);
  });

  it('returns the original state when the visibility request changes nothing', () => {
    const sections = [{ id: 'hero', enabled: true }];
    const sectionBlocks = { hero: [{ id: 'hero-1', type: 'title' }] };

    const result = applyBuilderV2SectionVisibility({
      sections,
      sectionBlocks,
      selectedIds: ['hero'],
      enabled: true,
    });

    expect(result.changedIds).toEqual([]);
    expect(result.sections).toBe(sections);
    expect(result.sectionBlocks).toBe(sectionBlocks);
  });
});
