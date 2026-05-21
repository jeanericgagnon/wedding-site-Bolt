import { describe, expect, it, vi } from 'vitest';
import { getPublicSectionAnchorNavItems } from './siteViewSectionAnchors';

vi.mock('../builder/registry/sectionManifests', () => ({
  getSectionManifest: (type: string) => {
    if (type === 'unknown-section') throw new Error('missing section manifest');
    return { label: type === 'travel' ? 'Travel & Hotels' : type.toUpperCase() };
  },
}));

describe('getPublicSectionAnchorNavItems', () => {
  it('sorts legacy numeric-string section order values for one-page anchor nav', () => {
    expect(
      getPublicSectionAnchorNavItems([
        {
          id: 'rsvp',
          type: 'rsvp',
          variant: 'default',
          enabled: true,
          orderIndex: '2' as unknown as number,
          settings: { anchorId: 'RSVP' },
          bindings: {},
          styleOverrides: {},
        },
        {
          id: 'travel',
          type: 'travel',
          variant: 'default',
          enabled: true,
          orderIndex: '1' as unknown as number,
          settings: { anchorId: 'Travel' },
          bindings: {},
          styleOverrides: {},
        },
      ]),
    ).toEqual([
      expect.objectContaining({ id: 'travel', anchorId: 'travel', title: 'Travel & Hotels', orderIndex: 1 }),
      expect.objectContaining({ id: 'rsvp', anchorId: 'rsvp', title: 'RSVP', orderIndex: 2 }),
    ]);
  });

  it('skips disabled or anchorless sections and falls back to a readable title for unknown section manifests', () => {
    expect(
      getPublicSectionAnchorNavItems([
        {
          id: 'hidden',
          type: 'travel',
          variant: 'default',
          enabled: false,
          orderIndex: 0,
          settings: { anchorId: 'Hidden' },
          bindings: {},
          styleOverrides: {},
        },
        {
          id: 'plain',
          type: 'travel',
          variant: 'default',
          enabled: true,
          orderIndex: 1,
          settings: {},
          bindings: {},
          styleOverrides: {},
        },
        {
          id: 'custom',
          type: 'unknown-section' as 'travel',
          variant: 'default',
          enabled: true,
          orderIndex: 2,
          settings: { anchorId: 'Weekend Details' },
          bindings: {},
          styleOverrides: {},
        },
      ]),
    ).toEqual([
      expect.objectContaining({ id: 'custom', anchorId: 'weekend-details', title: 'weekend details', orderIndex: 2 }),
    ]);
  });
});
