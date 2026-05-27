import { describe, it, expect } from 'vitest';
import { validateBuilderV2Document } from './validate';

describe('validateBuilderV2Document', () => {
  it('accepts a valid v2 document', () => {
    const doc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              variant: 'default',
              enabled: true,
              blocks: [{ id: 'b1', type: 'title', data: { text: 'Hi' } }],
            },
          ],
        },
      ],
    };

    const result = validateBuilderV2Document(doc);
    expect(result.ok).toBe(true);
  });

  it('rejects an invalid block type', () => {
    const doc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          sections: [
            {
              id: 'hero-1',
              type: 'hero',
              variant: 'default',
              enabled: true,
              blocks: [{ id: 'b1', type: 'not-real', data: {} }],
            },
          ],
        },
      ],
    };

    const result = validateBuilderV2Document(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('type is invalid');
    }
  });

  it('accepts legacy single-page documents for backward compatibility', () => {
    const doc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      sections: [
        {
          id: 'hero-1',
          type: 'hero',
          variant: 'default',
          enabled: true,
          blocks: [{ id: 'b1', type: 'title', data: { text: 'Hi' } }],
        },
      ],
    };

    const result = validateBuilderV2Document(doc);
    expect(result.ok).toBe(true);
  });

  it('accepts valid section bindings and rejects malformed ones', () => {
    const validDoc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          sections: [
            {
              id: 'travel-1',
              type: 'travel',
              variant: 'default',
              enabled: true,
              bindings: {
                venueIds: ['venue-1'],
                scheduleItemIds: ['event-1'],
                linkIds: ['link-1'],
                faqIds: ['faq-1'],
                mediaAssetIds: ['asset-1'],
              },
              blocks: [],
            },
          ],
        },
      ],
    };

    const invalidDoc = {
      ...validDoc,
      pages: [
        {
          ...validDoc.pages[0],
          sections: [
            {
              ...validDoc.pages[0].sections[0],
              bindings: {
                venueIds: 'venue-1',
              },
            },
          ],
        },
      ],
    };

    expect(validateBuilderV2Document(validDoc).ok).toBe(true);
    const invalidResult = validateBuilderV2Document(invalidDoc);
    expect(invalidResult.ok).toBe(false);
    if (!invalidResult.ok) {
      expect(invalidResult.error).toContain('bindings.venueIds');
    }
  });
});
