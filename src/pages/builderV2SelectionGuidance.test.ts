import { describe, expect, it } from 'vitest';

import { buildBuilderV2SelectionGuidance } from './builderV2SelectionGuidance';

describe('builderV2SelectionGuidance', () => {
  it('flags mixed visible and hidden selections first', () => {
    const guidance = buildBuilderV2SelectionGuidance({
      selectedSections: [
        { id: 'hero', title: 'Hero', enabled: true, density: 'comfortable' },
        { id: 'story', title: 'Story', enabled: false, density: 'comfortable' },
      ],
    });

    expect(guidance.title).toContain('mixes visible and hidden');
    expect(guidance.bestNextMove).toContain('show or hide it consistently');
  });

  it('flags mixed density when visibility is already aligned', () => {
    const guidance = buildBuilderV2SelectionGuidance({
      selectedSections: [
        { id: 'hero', title: 'Hero', enabled: true, density: 'comfortable' },
        { id: 'story', title: 'Story', enabled: true, density: 'compact' },
        { id: 'travel', title: 'Travel', enabled: true, density: 'comfortable' },
      ],
    });

    expect(guidance.title).toContain('mixed density');
    expect(guidance.keyStats).toContain('1 compact');
    expect(guidance.keyStats).toContain('2 open');
  });

  it('builds a healthy batch cleanup state for aligned selections', () => {
    const guidance = buildBuilderV2SelectionGuidance({
      selectedSections: [
        { id: 'hero', title: 'Hero', enabled: true, density: 'comfortable' },
        { id: 'story', title: 'Story', enabled: true, density: 'comfortable' },
        { id: 'schedule', title: 'Schedule', enabled: true, density: 'comfortable' },
      ],
    });

    expect(guidance.title).toContain('ready for a coordinated cleanup pass');
    expect(guidance.bestNextMove).toContain('shared cleanup move');
    expect(guidance.keyStats).toContain('3 selected');
  });
});
