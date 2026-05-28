import { describe, expect, it } from 'vitest';

import { buildBuilderV2HandoffPacket } from './builderV2HandoffPacket';

describe('builder v2 handoff packet', () => {
  it('captures visible order and hidden backlog together', () => {
    const packet = buildBuilderV2HandoffPacket({
      pages: [
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
        {
          id: 'weekend',
          title: 'Weekend',
          slug: 'weekend',
          hidden: true,
          isHome: false,
          sections: [
            { id: 'gallery', title: 'Gallery', type: 'gallery', enabled: true, blockCount: 4, warningCount: 0 },
          ],
        },
      ],
    });

    expect(packet.visibleTitles).toEqual(['Hero', 'Story']);
    expect(packet.hiddenTitles).toEqual(['Gallery']);
    expect(packet.pageSummaries).toEqual(['Home (2 visible · 0 hidden)', 'Weekend (hidden page)']);
    expect(packet.headline).toContain('hidden page');
    expect(packet.summaryText).toContain('Pages: Home (2 visible · 0 hidden) | Weekend (hidden page)');
    expect(packet.summaryText).toContain('Visible order: Hero -> Story');
    expect(packet.summaryText).toContain('Hidden lanes: Gallery');
    expect(packet.headline).toContain('visible section');
  });

  it('flags empty visible sections in the packet headline and entries', () => {
    const packet = buildBuilderV2HandoffPacket({
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          hidden: false,
          isHome: true,
          sections: [
            { id: 'hero', title: 'Hero', type: 'hero', enabled: true, blockCount: 0, warningCount: 0 },
          ],
        },
      ],
    });

    expect(packet.headline).toContain('still need structure');
    expect(packet.entries[0]).toMatchObject({
      pageTitle: 'Home',
      sectionTitle: 'Hero',
      status: 'empty',
    });
  });

  it('summarizes warning-bearing visible sections cleanly', () => {
    const packet = buildBuilderV2HandoffPacket({
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          hidden: false,
          isHome: true,
          sections: [
            { id: 'schedule', title: 'Schedule', type: 'schedule', enabled: true, blockCount: 5, warningCount: 2 },
          ],
        },
      ],
    });

    expect(packet.entries[0]?.status).toBe('warning');
    expect(packet.entries[0]?.summary).toContain('2 warnings');
    expect(packet.summaryText).toContain('Home / Schedule [warning]');
  });

  it('uses visible packet status and wording for healthy sections', () => {
    const packet = buildBuilderV2HandoffPacket({
      pages: [
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

    expect(packet.entries[0]?.status).toBe('visible');
    expect(packet.entries[0]?.summary).toContain('visible flow');
    expect(packet.summaryText).toContain('Home / Hero [visible]');
  });
});
