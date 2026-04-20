import { describe, expect, it } from 'vitest';
import { getIsPublishedFromSiteRow, getPublicBuilderProject } from './publicSiteProject';

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
});
