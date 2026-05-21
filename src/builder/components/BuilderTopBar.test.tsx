import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildPublicPagePath,
  buildPublicSectionAnchorPath,
  formatPublishedAt,
  formatSavedAt,
  getPublicSectionAnchorLinks,
  getPublishBlockerUiState,
  getSuggestedBuilderPages,
  summarizeBuilderPageStructure,
} from './BuilderTopBar';

describe('getPublishBlockerUiState', () => {
  it('treats unsaved changes as auto-saveable instead of a hard go-live blocker', () => {
    expect(
      getPublishBlockerUiState({
        publishValidationError: 'Save your latest draft changes before sharing with guests.',
        publishIssueKind: 'unsaved-changes',
      }),
    ).toEqual({
      hasHardPublishBlocker: false,
      effectivePublishValidationError: null,
      canAutoSaveBeforePublish: true,
    });
  });

  it('keeps real publish blockers blocking', () => {
    expect(
      getPublishBlockerUiState({
        publishValidationError: 'Add both names exactly how you want them shown before sharing with guests.',
        publishIssueKind: 'missing-couple-names',
      }),
    ).toEqual({
      hasHardPublishBlocker: true,
      effectivePublishValidationError: 'Add both names exactly how you want them shown before sharing with guests.',
      canAutoSaveBeforePublish: false,
    });
  });
});

describe('builder top bar public link copying', () => {
  it('uses the shared copy/download fallback for page and anchor links', () => {
    const source = readFileSync(join(process.cwd(), 'src/builder/components/BuilderTopBar.tsx'), 'utf8');

    expect(source).toContain("import { copyTextOrDownload } from '../../lib/copyText';");
    expect(source).toContain('const copyBuilderPublicLink = async (url: string, filename: string) => {');
    expect(source).toContain("dispatch(builderActions.setError('Couldn’t copy that public link right now.'));");
    expect(source).toContain("'Downloaded'");
    expect(source).not.toContain('navigator.clipboard?.writeText');
  });
});

describe('builder top bar page manager accessibility', () => {
  it('labels page and navigation controls for keyboard and screen reader users', () => {
    const source = readFileSync(join(process.cwd(), 'src/builder/components/BuilderTopBar.tsx'), 'utf8');

    expect(source).toContain('aria-label={`Manage pages: ${pageStructureSummary.label}`}');
    expect(source).toContain('aria-label="New page name"');
    expect(source).toContain('aria-label={`Page title for ${pageActionLabel}`}');
    expect(source).toContain('aria-label={`Public URL slug for ${pageActionLabel}`}');
    expect(source).toContain('aria-label={page.meta.isHome ?');
    expect(source).toContain('Quick add');
    expect(source).toContain('aria-label={`Quick add ${page.title} page');
    expect(source).toContain('title={`Create /${page.slug}');
  });
});

describe('builder top bar time formatting', () => {
  it('falls back cleanly for invalid persisted save timestamps', () => {
    expect(formatSavedAt('not-a-date')).toBe('Saved time unknown');
  });

  it('falls back cleanly for invalid persisted publish timestamps', () => {
    expect(formatPublishedAt('not-a-date')).toBe('Live since unknown time');
  });
});

describe('buildPublicPagePath', () => {
  it('builds home and dedicated page paths from the public site slug', () => {
    expect(buildPublicPagePath('maya-leo', { slug: 'home', meta: { isHome: true } })).toBe('/site/maya-leo');
    expect(buildPublicPagePath('maya-leo', { slug: 'travel', meta: { isHome: false } })).toBe('/site/maya-leo/travel');
  });

  it('normalizes older or imported page slugs before building public paths', () => {
    expect(buildPublicPagePath('maya-leo', { slug: 'Travel Details!', meta: { isHome: false } })).toBe('/site/maya-leo/travel-details');
  });

  it('unwraps builder value page slugs before building public paths', () => {
    expect(buildPublicPagePath('maya-leo', {
      slug: { value: 'Travel Details!', source: 'user-edited' },
      meta: { isHome: false },
    })).toBe('/site/maya-leo/travel-details');
  });

  it('falls back to the page id when an imported page slug is empty', () => {
    expect(buildPublicPagePath('maya-leo', { id: 'travel-page', slug: '', meta: { isHome: false } })).toBe('/site/maya-leo/travel-page');
  });

  it('returns null before the public slug is known', () => {
    expect(buildPublicPagePath(null, { slug: 'travel', meta: { isHome: false } })).toBeNull();
  });

  it('does not advertise public paths for hidden pages', () => {
    expect(buildPublicPagePath('maya-leo', { slug: 'after-party', meta: { isHome: false, isHidden: true } })).toBeNull();
  });
});

describe('buildPublicSectionAnchorPath', () => {
  it('builds public anchor paths for home and dedicated pages', () => {
    expect(buildPublicSectionAnchorPath(
      'maya-leo',
      { slug: 'home', meta: { isHome: true, isHidden: false } },
      { settings: { anchorId: 'Travel Info' } },
    )).toBe('/site/maya-leo#travel-info');
    expect(buildPublicSectionAnchorPath(
      'maya-leo',
      { slug: 'rsvp', meta: { isHome: false, isHidden: false } },
      { settings: { anchorId: { value: 'Meal Choice' } } },
    )).toBe('/site/maya-leo/rsvp#meal-choice');
  });

  it('skips redundant anchors that match dedicated page slugs', () => {
    expect(buildPublicSectionAnchorPath(
      'maya-leo',
      { slug: 'travel', meta: { isHome: false, isHidden: false } },
      { settings: { anchorId: 'Travel' } },
    )).toBeNull();
  });

  it('returns null when there is no public slug or anchor id', () => {
    expect(buildPublicSectionAnchorPath(null, { slug: 'home', meta: { isHome: true } }, { settings: { anchorId: 'travel' } })).toBeNull();
    expect(buildPublicSectionAnchorPath('maya-leo', { slug: 'home', meta: { isHome: true } }, { settings: {} })).toBeNull();
  });
});

describe('getPublicSectionAnchorLinks', () => {
  it('builds labeled absolute anchor links and filters sections without anchors', () => {
    const links = getPublicSectionAnchorLinks(
      'maya-leo',
      {
        slug: 'home',
        meta: { isHome: true, isHidden: false },
        sections: [
          { id: 'section-1', type: 'hero', settings: { anchorId: 'Welcome' } },
          { id: 'section-2', type: 'travel', displayName: 'Hotel details', settings: { anchorId: 'Travel Info' } },
          { id: 'section-3', type: 'faq', settings: {} },
        ],
      },
      'https://dayof.love',
    );

    expect(links).toEqual([
      expect.objectContaining({
        path: '/site/maya-leo#welcome',
        url: 'https://dayof.love/site/maya-leo#welcome',
        label: 'Hero',
      }),
      expect.objectContaining({
        path: '/site/maya-leo#travel-info',
        url: 'https://dayof.love/site/maya-leo#travel-info',
        label: 'Hotel details',
      }),
    ]);
  });

  it('keeps dedicated page anchors on the dedicated page path', () => {
    expect(
      getPublicSectionAnchorLinks('maya-leo', {
        slug: 'rsvp',
        meta: { isHome: false, isHidden: false },
        sections: [{ id: 'section-1', type: 'rsvp', settings: { anchorId: 'Meal Choice' } }],
      })[0]?.path,
    ).toBe('/site/maya-leo/rsvp#meal-choice');
  });

  it('uses the page link instead of listing same-slug section anchors on dedicated pages', () => {
    expect(
      getPublicSectionAnchorLinks('maya-leo', {
        slug: 'travel',
        meta: { isHome: false, isHidden: false },
        sections: [
          { id: 'section-1', type: 'travel', settings: { anchorId: 'Travel' } },
          { id: 'section-2', type: 'faq', settings: { anchorId: 'Travel FAQ' } },
        ],
      }).map((link) => link.path),
    ).toEqual(['/site/maya-leo/travel#travel-faq']);
  });

  it('checks redundant anchors against wrapped dedicated page titles', () => {
    expect(
      getPublicSectionAnchorLinks('maya-leo', {
        slug: 'guest-travel',
        title: { value: 'Guest Travel', source: 'user-edited' },
        meta: { isHome: false, isHidden: false },
        sections: [
          { id: 'section-1', type: 'travel', settings: { anchorId: 'Guest Travel' } },
          { id: 'section-2', type: 'faq', settings: { anchorId: 'Travel FAQ' } },
        ],
      }).map((link) => link.path),
    ).toEqual(['/site/maya-leo/guest-travel#travel-faq']);
  });

  it('uses the page id fallback when checking redundant anchors for imported blank slugs', () => {
    expect(
      getPublicSectionAnchorLinks('maya-leo', {
        id: 'travel-page',
        slug: '   ',
        meta: { isHome: false, isHidden: false },
        sections: [
          { id: 'section-1', type: 'travel', settings: { anchorId: 'Travel Page' } },
          { id: 'section-2', type: 'faq', settings: { anchorId: 'Travel FAQ' } },
        ],
      }).map((link) => link.path),
    ).toEqual(['/site/maya-leo/travel-page#travel-faq']);
  });

  it('filters anchors on hidden pages because they are not guest-visible links', () => {
    expect(
      getPublicSectionAnchorLinks('maya-leo', {
        slug: 'after-party',
        meta: { isHome: false, isHidden: true },
        sections: [{ id: 'section-1', type: 'faq', settings: { anchorId: 'After Party' } }],
      }),
    ).toEqual([]);
  });

  it('filters disabled sections because they are not guest-visible anchor links', () => {
    expect(
      getPublicSectionAnchorLinks('maya-leo', {
        slug: 'home',
        meta: { isHome: true, isHidden: false },
        sections: [
          { id: 'section-1', type: 'travel', enabled: false, settings: { anchorId: 'Travel Info' } },
          { id: 'section-2', type: 'faq', enabled: true, settings: { anchorId: 'FAQ' } },
        ],
      }).map((link) => link.path),
    ).toEqual(['/site/maya-leo#faq']);
  });
});

describe('summarizeBuilderPageStructure', () => {
  it('summarizes visible pages and usable anchors', () => {
    expect(
      summarizeBuilderPageStructure([
        {
          slug: 'home',
          meta: { isHome: true, isHidden: false },
          sections: [
            { id: 'section-1', type: 'hero', settings: { anchorId: 'Welcome' } },
            { id: 'section-2', type: 'story', settings: {} },
            { id: 'section-disabled', type: 'faq', enabled: false, settings: { anchorId: 'Private FAQ' } },
          ],
        },
        {
          slug: 'travel',
          meta: { isHome: false, isHidden: false },
          sections: [
            { id: 'section-3', type: 'travel', settings: { anchorId: { value: 'Travel' } } },
            { id: 'section-4', type: 'faq', settings: { anchorId: { value: 'Travel Info' } } },
          ],
        },
        {
          slug: 'after-party',
          meta: { isHome: false, isHidden: true },
          sections: [{ id: 'section-5', type: 'rsvp', settings: { anchorId: 'Private RSVP' } }],
        },
      ]),
    ).toEqual({
      pageCount: 3,
      visiblePageCount: 2,
      hiddenPageCount: 1,
      anchorLinkCount: 2,
      mode: 'multi-page',
      label: 'Multi-page · 2 visible pages · 2 anchors · 1 hidden',
    });
  });
});

describe('getSuggestedBuilderPages', () => {
  it('suggests missing guest-facing page types from the shared template taxonomy', () => {
    expect(
      getSuggestedBuilderPages([
        { id: 'home', slug: 'home', title: 'Home', meta: { isHome: true, isHidden: false } },
        { id: 'travel-page', slug: 'travel', title: 'Travel', meta: { isHome: false, isHidden: false } },
        { id: 'rsvp-page', slug: '', title: { value: 'RSVP' }, meta: { isHome: false, isHidden: false } },
      ]),
    ).toEqual([
      { title: 'Schedule', slug: 'schedule', initialSectionType: 'schedule' },
      { title: 'Details', slug: 'details', initialSectionType: 'wedding-party' },
      { title: 'Registry', slug: 'registry', initialSectionType: 'registry' },
    ]);
  });

  it('does not suggest hidden pages that already exist', () => {
    expect(
      getSuggestedBuilderPages([
        { id: 'home', slug: 'home', title: 'Home', meta: { isHome: true, isHidden: false } },
        { id: 'schedule', slug: 'schedule', title: 'Schedule', meta: { isHome: false, isHidden: true } },
        { id: 'travel', slug: 'travel', title: 'Travel', meta: { isHome: false, isHidden: false } },
        { id: 'details', slug: 'details', title: 'Details', meta: { isHome: false, isHidden: false } },
        { id: 'rsvp', slug: 'rsvp', title: 'RSVP', meta: { isHome: false, isHidden: false } },
        { id: 'registry', slug: 'registry', title: 'Registry', meta: { isHome: false, isHidden: false } },
      ]),
    ).toEqual([]);
  });
});
