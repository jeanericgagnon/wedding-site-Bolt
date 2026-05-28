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

  it('rejects malformed page-map semantics that would break multi-page routing', () => {
    const duplicateSlugDoc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [],
        },
        {
          id: 'travel',
          title: 'Travel',
          slug: 'home',
          isHome: false,
          hidden: false,
          sections: [],
        },
      ],
    };

    const missingSingleHomeDoc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [],
        },
        {
          id: 'story',
          title: 'Story',
          slug: 'story',
          isHome: true,
          hidden: false,
          sections: [],
        },
      ],
    };

    const hiddenHomeDoc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: true,
          sections: [],
        },
      ],
    };

    const duplicateSlugResult = validateBuilderV2Document(duplicateSlugDoc);
    expect(duplicateSlugResult.ok).toBe(false);
    if (!duplicateSlugResult.ok) {
      expect(duplicateSlugResult.error).toContain('slug must be unique');
    }

    const missingSingleHomeResult = validateBuilderV2Document(missingSingleHomeDoc);
    expect(missingSingleHomeResult.ok).toBe(false);
    if (!missingSingleHomeResult.ok) {
      expect(missingSingleHomeResult.error).toContain('exactly one home page');
    }

    const hiddenHomeResult = validateBuilderV2Document(hiddenHomeDoc);
    expect(hiddenHomeResult.ok).toBe(false);
    if (!hiddenHomeResult.ok) {
      expect(hiddenHomeResult.error).toContain('home page cannot be hidden');
    }
  });

  it('rejects duplicate section or block ids and invalid timestamps', () => {
    const duplicateSectionDoc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            { id: 'hero', type: 'hero', variant: 'default', enabled: true, blocks: [] },
          ],
        },
        {
          id: 'story',
          title: 'Story',
          slug: 'story',
          isHome: false,
          hidden: false,
          sections: [
            { id: 'hero', type: 'story', variant: 'default', enabled: true, blocks: [] },
          ],
        },
      ],
    };

    const duplicateBlockDoc = {
      version: 'v2',
      updatedAtISO: new Date().toISOString(),
      sections: [
        {
          id: 'hero',
          type: 'hero',
          variant: 'default',
          enabled: true,
          blocks: [
            { id: 'b1', type: 'title', data: { text: 'Hi' } },
            { id: 'b1', type: 'text', data: { text: 'Again' } },
          ],
        },
      ],
    };

    const badDateDoc = {
      version: 'v2',
      updatedAtISO: 'preview',
      sections: [
        {
          id: 'hero',
          type: 'hero',
          variant: 'default',
          enabled: true,
          blocks: [],
        },
      ],
    };

    const duplicateSectionResult = validateBuilderV2Document(duplicateSectionDoc);
    expect(duplicateSectionResult.ok).toBe(false);
    if (!duplicateSectionResult.ok) {
      expect(duplicateSectionResult.error).toContain('id must be unique across pages');
    }

    const duplicateBlockResult = validateBuilderV2Document(duplicateBlockDoc);
    expect(duplicateBlockResult.ok).toBe(false);
    if (!duplicateBlockResult.ok) {
      expect(duplicateBlockResult.error).toContain('id must be unique');
    }

    const badDateResult = validateBuilderV2Document(badDateDoc);
    expect(badDateResult.ok).toBe(false);
    if (!badDateResult.ok) {
      expect(badDateResult.error).toContain('updatedAtISO must be a valid ISO date');
    }
  });
});
