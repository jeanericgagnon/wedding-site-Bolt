import { describe, expect, it } from 'vitest';

import { buildBuilderV2HandoffGuidance } from './builderV2HandoffGuidance';

describe('builder v2 handoff guidance', () => {
  it('pushes hidden-lane recovery when nothing is visible', () => {
    const summary = buildBuilderV2HandoffGuidance({
      previewDevice: 'desktop',
      sections: [
        { id: 'hero', title: 'Hero', enabled: false, blockCount: 3, warningCount: 0 },
        { id: 'story', title: 'Story', enabled: false, blockCount: 2, warningCount: 0 },
      ],
    });

    expect(summary.tone).toBe('caution');
    expect(summary.primaryAction).toBe('review-hidden');
    expect(summary.focusSectionId).toBe('hero');
    expect(summary.bestNextMove).toContain('Hero');
  });

  it('prioritizes empty visible lanes before export', () => {
    const summary = buildBuilderV2HandoffGuidance({
      previewDevice: 'desktop',
      sections: [
        { id: 'hero', title: 'Hero', enabled: true, blockCount: 0, warningCount: 0 },
        { id: 'story', title: 'Story', enabled: true, blockCount: 2, warningCount: 0 },
      ],
    });

    expect(summary.tone).toBe('repair');
    expect(summary.primaryAction).toBe('review-empty');
    expect(summary.keyStats).toContain('1 empty visible');
  });

  it('forces a mobile review when dense sections are only checked on desktop', () => {
    const summary = buildBuilderV2HandoffGuidance({
      previewDevice: 'desktop',
      sections: [
        { id: 'hero', title: 'Hero', enabled: true, blockCount: 8, warningCount: 0 },
        { id: 'story', title: 'Story', enabled: true, blockCount: 3, warningCount: 0 },
      ],
    });

    expect(summary.tone).toBe('caution');
    expect(summary.primaryAction).toBe('review-mobile');
    expect(summary.primaryActionLabel).toBe('Run mobile review');
  });

  it('marks the document ready when visible lanes are healthy', () => {
    const summary = buildBuilderV2HandoffGuidance({
      previewDevice: 'mobile',
      sections: [
        { id: 'hero', title: 'Hero', enabled: true, blockCount: 4, warningCount: 0 },
        { id: 'story', title: 'Story', enabled: true, blockCount: 3, warningCount: 0 },
        { id: 'gallery', title: 'Gallery', enabled: false, blockCount: 2, warningCount: 0 },
      ],
    });

    expect(summary.tone).toBe('ready');
    expect(summary.primaryAction).toBe('ready-to-export');
    expect(summary.exportHeadline).toContain('ready');
    expect(summary.keyStats).toContain('2 visible');
  });
});
