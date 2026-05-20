import { describe, expect, it } from 'vitest';
import { builderV2ToCanonicalPageDocument, layoutConfigToCanonicalPageDocument } from './canonicalPageAdapters';

describe('canonical page adapters', () => {
  it('maps layout config pages into canonical page documents', () => {
    const canonical = layoutConfigToCanonicalPageDocument({
      version: '1',
      templateId: 'base',
      pages: [
        {
          id: 'home',
          title: 'Home',
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              variant: 'default',
              enabled: true,
              bindings: { venueIds: ['venue-1'] },
              settings: { title: 'Hello', subtitle: 'World' },
              overrides: { headline: 'Eric & Kara' },
              locked: false,
            },
          ],
        },
      ],
      meta: { createdAtISO: 'a', updatedAtISO: 'b' },
    });

    expect(canonical.pages[0].sections[0]).toEqual({
      id: 'hero-1',
      type: 'hero',
      variant: 'default',
      props: { title: 'Hello', subtitle: 'World', headline: 'Eric & Kara' },
      bindings: { venueIds: ['venue-1'] },
      visible: true,
      locked: false,
      meta: { source: 'layoutConfigV1' },
    });
  });

  it('unwraps builder value layout page titles before canonical conversion', () => {
    const canonical = layoutConfigToCanonicalPageDocument({
      version: '1',
      templateId: 'base',
      pages: [
        {
          id: 'travel-page',
          title: { value: 'Guest Travel', source: 'user-edited' } as unknown as string,
          sections: [],
        },
      ],
      meta: { createdAtISO: 'a', updatedAtISO: 'b' },
    });

    expect(canonical.pages[0].title).toBe('Guest Travel');
  });

  it('maps builder-v2 documents into canonical page documents', () => {
    const canonical = builderV2ToCanonicalPageDocument({
      version: 'v2',
      updatedAtISO: '2026-01-01T00:00:00.000Z',
      sections: [
        {
          id: 'story-1',
          type: 'story',
          variant: 'default',
          enabled: true,
          title: 'Our Story',
          subtitle: 'How it started',
          blocks: [
            { id: 'block-1', type: 'text', data: { text: 'Hello' } },
          ],
        },
      ],
    });

    expect(canonical.pages[0].sections[0]).toEqual({
      id: 'story-1',
      type: 'story',
      variant: 'default',
      props: {
        title: 'Our Story',
        subtitle: 'How it started',
        blocks: [{ id: 'block-1', type: 'text', data: { text: 'Hello' } }],
      },
      visible: true,
      meta: { source: 'builderV2' },
    });
  });
});
