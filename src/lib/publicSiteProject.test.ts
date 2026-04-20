import { describe, expect, it } from 'vitest';
import { getIsPublishedFromSiteRow, getPublicBuilderProject, getPublicWeddingData } from './publicSiteProject';

const draftProject = {
  id: 'draft',
  weddingId: 'w1',
  templateId: 'modern-luxe',
  themeId: 'romantic',
  pages: [{ id: 'home', title: 'Home', slug: 'home', orderIndex: 0, sections: [{ id: 's1', type: 'hero', variant: 'default', enabled: true, orderIndex: 0, settings: { headline: 'Draft headline' }, styleOverrides: {}, bindings: {} }], meta: { isHome: true, isHidden: false } }],
  draftVersion: 2,
  publishedVersion: null,
  publishStatus: 'draft',
  lastPublishedAt: null,
  meta: { createdAtISO: '2026-04-19T00:00:00.000Z', updatedAtISO: '2026-04-19T01:30:00.000Z' },
};

const publishedProject = {
  ...draftProject,
  id: 'published',
  pages: [{ ...draftProject.pages[0], sections: [{ ...draftProject.pages[0].sections[0], settings: { headline: 'Published headline' } }] }],
  publishStatus: 'published',
};

const liveWeddingData = {
  version: '1',
  couple: { partner1Name: 'Draft', partner2Name: 'Names', displayName: 'Draft Names' },
  event: {},
  venues: [],
  schedule: [],
  rsvp: { enabled: true },
  travel: {},
  registry: { links: [] },
  faq: [],
  theme: {},
  media: { gallery: [], heroImageUrl: 'https://example.com/draft-hero.jpg' },
  meta: { createdAtISO: '2026-04-19T00:00:00.000Z', updatedAtISO: '2026-04-19T01:30:00.000Z' },
};

const publishedWeddingData = {
  ...liveWeddingData,
  couple: { partner1Name: 'Published', partner2Name: 'Names', displayName: 'Published Names' },
  media: { gallery: [], heroImageUrl: 'https://example.com/published-hero.jpg' },
};

describe('publicSiteProject', () => {
  it('prefers published_json for guest-facing render when site is published', () => {
    const row = {
      is_published: true,
      site_json: draftProject,
      published_json: publishedProject,
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(true);
    expect(getPublicBuilderProject(row)?.pages[0].sections[0].settings.headline).toBe('Published headline');
  });

  it('falls back to site_json when no published snapshot exists', () => {
    const row = {
      is_published: false,
      site_json: draftProject,
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(false);
    expect(getPublicBuilderProject(row)?.pages[0].sections[0].settings.headline).toBe('Draft headline');
  });

  it('recognizes published state from published_json metadata even without is_published', () => {
    const row = {
      site_json: draftProject,
      published_json: publishedProject,
    };

    expect(getIsPublishedFromSiteRow(row)).toBe(true);
  });

  it('prefers published wedding data snapshot for guest-facing content', () => {
    const row = {
      is_published: true,
      site_json: draftProject,
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: publishedWeddingData,
      },
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Published Names');
    expect(getPublicWeddingData(row)?.media.heroImageUrl).toBe('https://example.com/published-hero.jpg');
  });

  it('falls back to live wedding_data when no published snapshot exists', () => {
    const row = {
      is_published: false,
      site_json: draftProject,
      wedding_data: liveWeddingData,
    };

    expect(getPublicWeddingData(row)?.couple.displayName).toBe('Draft Names');
  });

  it('rewrites signed media urls for public builder project parity', () => {
    const row = {
      is_published: true,
      published_json: {
        ...publishedProject,
        pages: [{
          ...publishedProject.pages[0],
          sections: [{
            ...publishedProject.pages[0].sections[0],
            settings: {
              heroImage: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/foo.jpg?token=abc',
            },
          }],
        }],
      },
    };

    expect(getPublicBuilderProject(row)?.pages[0].sections[0].settings.heroImage).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/site-media/foo.jpg',
    );
  });

  it('rewrites signed media urls for public wedding data parity', () => {
    const row = {
      is_published: true,
      published_json: {
        ...publishedProject,
        weddingDataSnapshot: {
          ...publishedWeddingData,
          media: {
            gallery: [],
            heroImageUrl: 'https://xyz.supabase.co/storage/v1/object/sign/site-media/bar.jpg?token=abc',
          },
        },
      },
    };

    expect(getPublicWeddingData(row)?.media.heroImageUrl).toBe(
      'https://xyz.supabase.co/storage/v1/object/public/site-media/bar.jpg',
    );
  });
});
