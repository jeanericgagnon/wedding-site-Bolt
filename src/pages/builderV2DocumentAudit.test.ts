import { describe, expect, it } from 'vitest';

import { buildBuilderV2DocumentAudit } from './builderV2DocumentAudit';

describe('builder v2 document audit', () => {
  it('marks empty visible sections as critical', () => {
    const audit = buildBuilderV2DocumentAudit({
      previewDevice: 'desktop',
      sections: [
        { id: 'hero', title: 'Hero', enabled: true, blockCount: 0, warningCount: 0 },
        { id: 'story', title: 'Story', enabled: true, blockCount: 2, warningCount: 0 },
      ],
    });

    expect(audit.criticalCount).toBe(1);
    expect(audit.headline).toContain('critical');
    expect(audit.issues[0]?.actionLabel).toBe('Add first blocks');
  });

  it('keeps warning-bearing visible sections in the cleanup lane', () => {
    const audit = buildBuilderV2DocumentAudit({
      previewDevice: 'desktop',
      sections: [
        { id: 'hero', title: 'Hero', enabled: true, blockCount: 4, warningCount: 2 },
      ],
    });

    expect(audit.warningCount).toBe(1);
    expect(audit.issues[0]?.severity).toBe('warning');
    expect(audit.issues[0]?.title).toContain('2 warnings');
  });

  it('flags dense desktop sections and hidden lanes as watch items', () => {
    const audit = buildBuilderV2DocumentAudit({
      previewDevice: 'desktop',
      sections: [
        { id: 'hero', title: 'Hero', enabled: true, blockCount: 8, warningCount: 0 },
        { id: 'gallery', title: 'Gallery', enabled: false, blockCount: 3, warningCount: 0 },
      ],
    });

    expect(audit.watchCount).toBe(2);
    expect(audit.issues.some((issue) => issue.actionLabel === 'Review on mobile')).toBe(true);
    expect(audit.issues.some((issue) => issue.actionLabel === 'Review hidden lane')).toBe(true);
  });

  it('reports a clean audit when no issues remain', () => {
    const audit = buildBuilderV2DocumentAudit({
      previewDevice: 'mobile',
      sections: [
        { id: 'hero', title: 'Hero', enabled: true, blockCount: 4, warningCount: 0 },
        { id: 'story', title: 'Story', enabled: true, blockCount: 3, warningCount: 0 },
      ],
    });

    expect(audit.issues).toHaveLength(0);
    expect(audit.headline).toContain('No active handoff issues');
  });
});
