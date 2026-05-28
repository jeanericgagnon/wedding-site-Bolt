import { describe, expect, it } from 'vitest';

import {
  buildBuilderV2SectionLifecycleSummary,
  removeBuilderV2Sections,
} from './builderV2SectionLifecycle';

describe('builderV2SectionLifecycle', () => {
  it('guides full-page retirement sets toward archive instead of removal', () => {
    const summary = buildBuilderV2SectionLifecycleSummary({
      sections: [
        { id: 'hero', title: 'Hero', enabled: true },
        { id: 'story', title: 'Story', enabled: true },
      ],
      selectedSections: [
        { id: 'hero', title: 'Hero', enabled: true },
        { id: 'story', title: 'Story', enabled: true },
      ],
    });

    expect(summary.allowRemoval).toBe(false);
    expect(summary.allowArchive).toBe(true);
    expect(summary.bestNextMove).toContain('Archive');
    expect(summary.keyStats).toContain('2 visible total');
    expect(summary.decisionRule).toContain('visible lane');
  });

  it('marks hidden-only batches as clean removal candidates', () => {
    const summary = buildBuilderV2SectionLifecycleSummary({
      sections: [
        { id: 'faq', title: 'FAQ', enabled: false },
        { id: 'gallery', title: 'Gallery', enabled: false },
        { id: 'hero', title: 'Hero', enabled: true },
      ],
      selectedSections: [
        { id: 'faq', title: 'FAQ', enabled: false },
        { id: 'gallery', title: 'Gallery', enabled: false },
      ],
    });

    expect(summary.allowRemoval).toBe(true);
    expect(summary.allowArchive).toBe(false);
    expect(summary.title).toContain('already archived');
    expect(summary.steps[0]?.detail).toContain('visible page');
  });

  it('frames mixed retirement sets around visible and hidden lanes', () => {
    const summary = buildBuilderV2SectionLifecycleSummary({
      sections: [
        { id: 'hero', title: 'Hero', enabled: true },
        { id: 'story', title: 'Story', enabled: false },
        { id: 'faq', title: 'FAQ', enabled: true },
      ],
      selectedSections: [
        { id: 'hero', title: 'Hero', enabled: true },
        { id: 'story', title: 'Story', enabled: false },
      ],
    });

    expect(summary.title).toContain('mixes visible and archived lanes');
    expect(summary.detail).toContain('still visible');
    expect(summary.decisionRule).toContain('visible and hidden sections');
    expect(summary.steps[0]?.detail).toContain('visible and already hidden lanes');
  });

  it('removes selected sections and their blocks while preserving a valid next selection', () => {
    const result = removeBuilderV2Sections({
      sections: [
        { id: 'hero', title: 'Hero', enabled: true },
        { id: 'story', title: 'Story', enabled: true },
        { id: 'faq', title: 'FAQ', enabled: false },
      ],
      sectionBlocks: {
        hero: [{ id: 'hero-1', type: 'title' }],
        story: [{ id: 'story-1', type: 'text' }],
        faq: [{ id: 'faq-1', type: 'faqItem' }],
      },
      selectedIds: ['story', 'faq'],
      selectedId: 'story',
    });

    expect(result.removedIds).toEqual(['story', 'faq']);
    expect(result.sections.map((section) => section.id)).toEqual(['hero']);
    expect(result.sectionBlocks).toEqual({
      hero: [{ id: 'hero-1', type: 'title' }],
    });
    expect(result.nextSelectedId).toBe('hero');
  });

  it('refuses to remove the entire page structure in one action', () => {
    const result = removeBuilderV2Sections({
      sections: [
        { id: 'hero', title: 'Hero', enabled: true },
      ],
      sectionBlocks: {
        hero: [{ id: 'hero-1', type: 'title' }],
      },
      selectedIds: ['hero'],
      selectedId: 'hero',
    });

    expect(result.removedIds).toEqual([]);
    expect(result.sections.map((section) => section.id)).toEqual(['hero']);
    expect(result.nextSelectedId).toBe('hero');
  });
});
