import { describe, expect, it } from 'vitest';

import { buildBuilderV2StructureGuidance } from './builderV2StructureGuidance';

describe('builderV2StructureGuidance', () => {
  it('pushes hidden-section recovery when preview has no visible lanes', () => {
    const guidance = buildBuilderV2StructureGuidance({
      sections: [
        { id: 'hero', title: 'Hero', type: 'hero', enabled: false },
        { id: 'schedule', title: 'Schedule', type: 'schedule', enabled: false },
      ],
      selectedSectionId: 'hero',
      addQuery: '',
      filteredAddableCount: 6,
      previewDevice: 'desktop',
      previewScale: 100,
      showMinimap: false,
    });

    expect(guidance.title).toContain('hidden from preview');
    expect(guidance.bestNextMove).toContain('Restore Hero');
    expect(guidance.previewHeadline).toContain('visible anchor lane');
  });

  it('prioritizes resolving hidden lanes before expansion', () => {
    const guidance = buildBuilderV2StructureGuidance({
      sections: [
        { id: 'hero', title: 'Hero', type: 'hero', enabled: true },
        { id: 'travel', title: 'Travel', type: 'travel', enabled: false },
        { id: 'rsvp', title: 'RSVP', type: 'rsvp', enabled: true },
      ],
      selectedSectionId: 'hero',
      addQuery: '',
      filteredAddableCount: 4,
      previewDevice: 'desktop',
      previewScale: 100,
      showMinimap: false,
    });

    expect(guidance.title).toContain('hidden lanes');
    expect(guidance.decisionRule).toContain('Resolve hidden sections before adding fresh structure');
    expect(guidance.keyStats).toContain('1 hidden');
  });

  it('warns when add-section search is too narrow', () => {
    const guidance = buildBuilderV2StructureGuidance({
      sections: [
        { id: 'hero', title: 'Hero', type: 'hero', enabled: true },
        { id: 'story', title: 'Story', type: 'story', enabled: true },
      ],
      selectedSectionId: 'hero',
      addQuery: 'hotel lounge',
      filteredAddableCount: 0,
      previewDevice: 'mobile',
      previewScale: 90,
      showMinimap: false,
    });

    expect(guidance.title).toContain('search is too narrow');
    expect(guidance.addSectionHeadline).toContain('Widen the picker search');
    expect(guidance.bestNextMove).toContain('Broaden the section search');
  });

  it('builds a healthy preview-driven structure review state', () => {
    const guidance = buildBuilderV2StructureGuidance({
      sections: [
        { id: 'hero', title: 'Hero', type: 'hero', enabled: true },
        { id: 'story', title: 'Story', type: 'story', enabled: true },
        { id: 'schedule', title: 'Schedule', type: 'schedule', enabled: true },
      ],
      selectedSectionId: 'schedule',
      addQuery: '',
      filteredAddableCount: 5,
      previewDevice: 'mobile',
      previewScale: 80,
      showMinimap: true,
    });

    expect(guidance.title).toContain('healthy review state');
    expect(guidance.previewDetail).toContain('Mobile preview is active at 80%');
    expect(guidance.keyStats).toContain('mini-map on');
  });
});
