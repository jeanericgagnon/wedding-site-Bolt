import { describe, expect, it } from 'vitest';

import { buildBuilderV2HandoffPacket } from './builderV2HandoffPacket';

describe('builder v2 handoff packet', () => {
  it('captures live order and hidden backlog together', () => {
    const packet = buildBuilderV2HandoffPacket({
      sections: [
        { id: 'hero', title: 'Hero', enabled: true, blockCount: 3, warningCount: 0 },
        { id: 'story', title: 'Story', enabled: true, blockCount: 2, warningCount: 0 },
        { id: 'gallery', title: 'Gallery', enabled: false, blockCount: 4, warningCount: 0 },
      ],
    });

    expect(packet.visibleTitles).toEqual(['Hero', 'Story']);
    expect(packet.hiddenTitles).toEqual(['Gallery']);
    expect(packet.headline).toContain('parked');
    expect(packet.summaryText).toContain('Visible order: Hero -> Story');
    expect(packet.summaryText).toContain('Hidden lanes: Gallery');
  });

  it('flags empty visible sections in the packet headline and entries', () => {
    const packet = buildBuilderV2HandoffPacket({
      sections: [
        { id: 'hero', title: 'Hero', enabled: true, blockCount: 0, warningCount: 0 },
      ],
    });

    expect(packet.headline).toContain('still need structure');
    expect(packet.entries[0]).toMatchObject({
      sectionTitle: 'Hero',
      status: 'empty',
    });
  });

  it('summarizes warning-bearing visible sections cleanly', () => {
    const packet = buildBuilderV2HandoffPacket({
      sections: [
        { id: 'schedule', title: 'Schedule', enabled: true, blockCount: 5, warningCount: 2 },
      ],
    });

    expect(packet.entries[0]?.status).toBe('warning');
    expect(packet.entries[0]?.summary).toContain('2 warnings');
    expect(packet.summaryText).toContain('Schedule [warning]');
  });
});
