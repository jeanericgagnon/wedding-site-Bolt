import { describe, it, expect } from 'vitest';
import { builderReducer } from './builderReducer';
import { initialBuilderState, BuilderState } from './builderStore';
import { createEmptyBuilderProject } from '../../types/builder/project';
import { BuilderSectionInstance } from '../../types/builder/section';

function makeSection(overrides?: Partial<BuilderSectionInstance>): BuilderSectionInstance {
  const now = new Date().toISOString();
  return {
    id: `s_${Math.random().toString(36).slice(2)}`,
    type: 'hero',
    variant: 'default',
    enabled: true,
    locked: false,
    orderIndex: 0,
    settings: {},
    bindings: {},
    styleOverrides: {},
    meta: { createdAtISO: now, updatedAtISO: now },
    ...overrides,
  };
}

function makeState(overrides?: Partial<BuilderState>): BuilderState {
  const project = createEmptyBuilderProject('w1', 'classic');
  return {
    ...initialBuilderState,
    project,
    activePageId: project.pages[0].id,
    ...overrides,
  };
}

describe('builderReducer — LOAD_PROJECT', () => {
  it('sets project and clears error', () => {
    const s = makeState({ error: 'old error' });
    const project = createEmptyBuilderProject('w2', 'modern');
    const next = builderReducer(s, { type: 'LOAD_PROJECT', payload: project });
    expect(next.project?.weddingId).toBe('w2');
    expect(next.error).toBeNull();
    expect(next.isDirty).toBe(false);
  });

  it('sets activePageId to first page', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    const next = builderReducer(makeState(), { type: 'LOAD_PROJECT', payload: project });
    expect(next.activePageId).toBe(project.pages[0].id);
  });

  it('normalizes loaded project pages without marking the project dirty', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        id: 'travel-page',
        title: 'Travel',
        slug: 'Travel%20Info',
        orderIndex: 0,
        sections: [
          makeSection({ id: 'travel-b', type: 'travel', orderIndex: 5 }),
          makeSection({ id: 'travel-a', type: 'travel', orderIndex: '1' as unknown as number, settings: { anchorId: 'Travel Info' } }),
        ],
        meta: { isHome: false, isHidden: true },
      },
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        orderIndex: 1,
        sections: [],
        meta: { isHome: true, isHidden: true },
      },
      {
        id: 'travel-copy',
        title: 'Travel Copy',
        slug: '/travel_info/',
        orderIndex: 2,
        sections: [],
        meta: { isHome: false, isHidden: false },
      },
    ];

    const next = builderReducer(makeState(), { type: 'LOAD_PROJECT', payload: project });

    expect(next.isDirty).toBe(false);
    expect(next.activePageId).toBe('home');
    expect(next.project!.pages.map((page) => ({
      slug: page.slug,
      orderIndex: page.orderIndex,
      meta: page.meta,
    }))).toEqual([
      { slug: 'home', orderIndex: 0, meta: { isHome: true, isHidden: false } },
      { slug: 'travel-info', orderIndex: 1, meta: { isHome: false, isHidden: true } },
      { slug: 'travel-info-2', orderIndex: 2, meta: { isHome: false, isHidden: false } },
    ]);
    expect(next.project!.pages[1].sections.map((section) => `${section.id}:${section.orderIndex}`)).toEqual([
      'travel-a:0',
      'travel-b:1',
    ]);
    expect(next.project!.pages[1].sections[0].settings.anchorId).toBeUndefined();
  });

  it('unwraps builder value page titles while normalizing loaded projects', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        orderIndex: 0,
        sections: [],
        meta: { isHome: true, isHidden: false },
      },
      {
        id: 'guest-travel-page',
        title: { value: 'Guest Travel', source: 'user-edited' } as unknown as string,
        slug: '',
        orderIndex: 1,
        sections: [makeSection({ id: 'travel', type: 'travel', settings: { anchorId: 'Guest Travel' } })],
        meta: { isHome: false, isHidden: false },
      },
    ];

    const next = builderReducer(makeState(), { type: 'LOAD_PROJECT', payload: project });

    expect(next.project!.pages[1]).toMatchObject({
      title: 'Guest Travel',
      slug: 'guest-travel-page',
    });
    expect(next.project!.pages[1].sections[0].settings.anchorId).toBeUndefined();
  });
});

describe('builderReducer — SET_MODE', () => {
  it('switches to preview mode', () => {
    const s = makeState();
    const next = builderReducer(s, { type: 'SET_MODE', payload: 'preview' });
    expect(next.mode).toBe('preview');
    expect(next.selectedSectionId).toBeNull();
  });
});

describe('builderReducer — ADD_PAGE', () => {
  it('unwraps builder value titles when creating pages and slugs', () => {
    const s = makeState();

    const next = builderReducer(s, {
      type: 'ADD_PAGE',
      payload: {
        title: { value: 'Guest Travel', source: 'user-edited' } as unknown as string,
      },
    });

    expect(next.project!.pages[1]).toMatchObject({
      title: 'Guest Travel',
      slug: 'guest-travel',
      orderIndex: 1,
      meta: { isHome: false, isHidden: false },
    });
  });

  it('can scaffold a suggested guest-facing page with its starter section', () => {
    const s = makeState();

    const next = builderReducer(s, {
      type: 'ADD_PAGE',
      payload: {
        title: 'Schedule',
        initialSectionType: 'schedule',
      },
    });

    expect(next.project!.pages[1]).toMatchObject({
      title: 'Schedule',
      slug: 'schedule',
      orderIndex: 1,
      meta: { isHome: false, isHidden: false },
    });
    expect(next.project!.pages[1].sections).toHaveLength(1);
    expect(next.project!.pages[1].sections[0]).toMatchObject({
      type: 'schedule',
      orderIndex: 0,
    });
    expect(next.project!.pages[1].sections[0].settings.anchorId).toBeUndefined();
  });
});

describe('builderReducer — DUPLICATE_PAGE', () => {
  it('normalizes copied page slugs before making them unique', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const withImportedSlug = {
      ...s,
      project: {
        ...s.project!,
        pages: [{
          ...s.project!.pages[0],
          slug: 'Travel Details!',
        }],
      },
    };

    const next = builderReducer(withImportedSlug, {
      type: 'DUPLICATE_PAGE',
      payload: { pageId },
    });

    expect(next.project!.pages[1].slug).toBe('travel-details-copy');
  });

  it('avoids slug collisions with existing page ids', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const withIdOnlyPage = {
      ...s,
      project: {
        ...s.project!,
        pages: [
          {
            ...s.project!.pages[0],
            title: 'Travel',
            slug: 'travel',
          },
          {
            id: 'travel-copy',
            title: 'Legacy Travel Copy',
            slug: '',
            orderIndex: 1,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
        ],
      },
    };

    const next = builderReducer(withIdOnlyPage, {
      type: 'DUPLICATE_PAGE',
      payload: { pageId },
    });

    expect(next.project!.pages[2].slug).toBe('travel-copy-2');
  });
});

describe('builderReducer — UPDATE_PAGE', () => {
  it('normalizes edited page slugs and avoids collisions with other pages', () => {
    const s = makeState();
    const withTravelPage = {
      ...s,
      project: {
        ...s.project!,
        pages: [
          s.project!.pages[0],
          {
            id: 'travel-page',
            title: 'Travel',
            slug: 'travel',
            orderIndex: 1,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
          {
            id: 'details-page',
            title: 'Details',
            slug: 'details',
            orderIndex: 2,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
        ],
      },
    };

    const next = builderReducer(withTravelPage, {
      type: 'UPDATE_PAGE',
      payload: { pageId: 'travel-page', patch: { slug: '/Travel%20Info/' } },
    });
    const collision = builderReducer(next, {
      type: 'UPDATE_PAGE',
      payload: { pageId: 'details-page', patch: { slug: 'Travel Info!' } },
    });

    expect(next.project!.pages[1].slug).toBe('travel-info');
    expect(collision.project!.pages[2].slug).toBe('travel-info-2');
  });

  it('allows a page to keep its own slug when updating other page fields', () => {
    const s = makeState();
    const withSlug = {
      ...s,
      project: {
        ...s.project!,
        pages: [
          s.project!.pages[0],
          {
            id: 'travel-page',
            title: 'Travel',
            slug: 'travel-info',
            orderIndex: 1,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
        ],
      },
    };

    const next = builderReducer(withSlug, {
      type: 'UPDATE_PAGE',
      payload: { pageId: 'travel-page', patch: { title: 'Travel Info', slug: 'travel-info' } },
    });

    expect(next.project!.pages[1].slug).toBe('travel-info');
  });

  it('unwraps builder value page titles and slugs when updating pages', () => {
    const s = makeState();
    const withTravelPage = {
      ...s,
      project: {
        ...s.project!,
        pages: [
          s.project!.pages[0],
          {
            id: 'travel-page',
            title: 'Travel',
            slug: 'travel',
            orderIndex: 1,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
        ],
      },
    };

    const next = builderReducer(withTravelPage, {
      type: 'UPDATE_PAGE',
      payload: {
        pageId: 'travel-page',
        patch: {
          title: { value: 'Guest Travel', source: 'user-edited' } as unknown as string,
          slug: { value: 'Guest Travel!', source: 'user-edited' } as unknown as string,
        },
      },
    });

    expect(next.project!.pages[1].title).toBe('Guest Travel');
    expect(next.project!.pages[1].slug).toBe('guest-travel');
  });

  it('keeps the home page slug rooted at home', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;

    const next = builderReducer(s, {
      type: 'UPDATE_PAGE',
      payload: { pageId, patch: { title: 'Maya & Leo', slug: 'Maya and Leo' } },
    });

    expect(next.project!.pages[0].title).toBe('Maya & Leo');
    expect(next.project!.pages[0].slug).toBe('home');
  });

  it('keeps the home page visible and prevents secondary pages from becoming home', () => {
    const s = makeState();
    const homePageId = s.project!.pages[0].id;
    const withTravelPage = {
      ...s,
      project: {
        ...s.project!,
        pages: [
          s.project!.pages[0],
          {
            id: 'travel-page',
            title: 'Travel',
            slug: 'travel',
            orderIndex: 1,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
        ],
      },
    };

    const hiddenHome = builderReducer(withTravelPage, {
      type: 'UPDATE_PAGE',
      payload: { pageId: homePageId, patch: { meta: { isHome: false, isHidden: true } } },
    });
    const promotedTravel = builderReducer(hiddenHome, {
      type: 'UPDATE_PAGE',
      payload: { pageId: 'travel-page', patch: { meta: { isHome: true, isHidden: false } } },
    });

    expect(hiddenHome.project!.pages[0].meta).toEqual({ isHome: true, isHidden: false });
    expect(promotedTravel.project!.pages[1].meta).toEqual({ isHome: false, isHidden: false });
  });
});

describe('builderReducer — REORDER_PAGES', () => {
  it('keeps home first while appending omitted pages from partial reorder payloads', () => {
    const s = makeState();
    const withPages = {
      ...s,
      project: {
        ...s.project!,
        pages: [
          s.project!.pages[0],
          {
            id: 'travel-page',
            title: 'Travel',
            slug: 'travel',
            orderIndex: 1,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
          {
            id: 'rsvp-page',
            title: 'RSVP',
            slug: 'rsvp',
            orderIndex: 2,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
        ],
      },
    };

    const next = builderReducer(withPages, {
      type: 'REORDER_PAGES',
      payload: { orderedIds: ['rsvp-page', 'missing-page', 'rsvp-page'] },
    });

    expect(next.project!.pages.map((page) => page.id)).toEqual([s.project!.pages[0].id, 'rsvp-page', 'travel-page']);
    expect(next.project!.pages.map((page) => page.orderIndex)).toEqual([0, 1, 2]);
  });
});

describe('builderReducer — ADD_SECTION', () => {
  it('adds section to page', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const section = makeSection({ id: 's1' });
    const next = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section } });
    expect(next.project!.pages[0].sections).toHaveLength(1);
    expect(next.project!.pages[0].sections[0].id).toBe('s1');
  });

  it('inserts at correct index when insertAfterIndex provided', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const s1 = makeSection({ id: 's1' });
    const s2 = makeSection({ id: 's2' });
    const after1 = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section: s1 } });
    const after2 = builderReducer(after1, { type: 'ADD_SECTION', payload: { pageId, section: s2, insertAfterIndex: 0 } });
    expect(after2.project!.pages[0].sections[1].id).toBe('s2');
  });

  it('marks state as dirty', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const next = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section: makeSection() } });
    expect(next.isDirty).toBe(true);
  });

  it('adds default anchors to manually added task sections without overwriting explicit anchors', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const afterSchedule = builderReducer(s, {
      type: 'ADD_SECTION',
      payload: { pageId, section: makeSection({ id: 'schedule-1', type: 'schedule' }) },
    });
    const afterExplicit = builderReducer(afterSchedule, {
      type: 'ADD_SECTION',
      payload: { pageId, section: makeSection({ id: 'rsvp-1', type: 'rsvp', settings: { anchorId: 'reply' } }) },
    });

    expect(afterExplicit.project!.pages[0].sections.map((section) => section.settings.anchorId)).toEqual(['schedule', 'reply']);
  });
});

describe('builderReducer — ADD_SECTION_TYPE', () => {
  it('adds default anchors when adding sections from the library', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;

    const afterFirst = builderReducer(s, { type: 'ADD_SECTION_TYPE', payload: { pageId, sectionType: 'travel' } });
    const afterSecond = builderReducer(afterFirst, { type: 'ADD_SECTION_TYPE', payload: { pageId, sectionType: 'travel' } });

    expect(afterSecond.project!.pages[0].sections.map((section) => section.settings.anchorId)).toEqual(['travel', 'travel-2']);
  });
});

describe('builderReducer — REMOVE_SECTION', () => {
  it('removes section by id', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const section = makeSection({ id: 'toRemove' });
    const withSec = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section } });
    const next = builderReducer(withSec, { type: 'REMOVE_SECTION', payload: { pageId, sectionId: 'toRemove' } });
    expect(next.project!.pages[0].sections).toHaveLength(0);
  });
});

describe('builderReducer — DUPLICATE_SECTION', () => {
  it('creates a copy of the section', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const section = makeSection({ id: 'orig' });
    const withSec = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section } });
    const next = builderReducer(withSec, { type: 'DUPLICATE_SECTION', payload: { pageId, sectionId: 'orig' } });
    expect(next.project!.pages[0].sections).toHaveLength(2);
    expect(next.project!.pages[0].sections[1].id).not.toBe('orig');
  });

  it('keeps duplicated section anchors unique on the page', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const section = makeSection({ id: 'rsvp-original', type: 'rsvp', settings: { anchorId: 'rsvp' } });
    const withSec = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section } });
    const next = builderReducer(withSec, { type: 'DUPLICATE_SECTION', payload: { pageId, sectionId: 'rsvp-original' } });

    expect(next.project!.pages[0].sections.map((item) => item.settings.anchorId)).toEqual(['rsvp', 'rsvp-2']);
  });

  it('preserves intentionally cleared anchors when duplicating a section', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const section = makeSection({ id: 'faq-original', type: 'faq', settings: { anchorId: '' } });
    const withSec = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section } });
    const next = builderReducer(withSec, { type: 'DUPLICATE_SECTION', payload: { pageId, sectionId: 'faq-original' } });

    expect(next.project!.pages[0].sections.map((item) => item.settings.anchorId)).toEqual(['', '']);
  });
});

describe('builderReducer — REORDER_SECTIONS', () => {
  it('reorders sections by id array', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const s1 = makeSection({ id: 'a' });
    const s2 = makeSection({ id: 'b' });
    const with2 = builderReducer(
      builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section: s1 } }),
      { type: 'ADD_SECTION', payload: { pageId, section: s2 } }
    );
    const next = builderReducer(with2, { type: 'REORDER_SECTIONS', payload: { pageId, orderedIds: ['b', 'a'] } });
    expect(next.project!.pages[0].sections[0].id).toBe('b');
    expect(next.project!.pages[0].sections[1].id).toBe('a');
  });

  it('appends omitted sections and ignores duplicate or unknown section ids', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const withSections = {
      ...s,
      project: {
        ...s.project!,
        pages: [{
          ...s.project!.pages[0],
          sections: [
            makeSection({ id: 'a', orderIndex: 0 }),
            makeSection({ id: 'b', orderIndex: 1 }),
            makeSection({ id: 'c', orderIndex: 2 }),
          ],
        }],
      },
    };

    const next = builderReducer(withSections, {
      type: 'REORDER_SECTIONS',
      payload: { pageId, orderedIds: ['c', 'missing', 'c'] },
    });

    expect(next.project!.pages[0].sections.map((section) => section.id)).toEqual(['c', 'a', 'b']);
    expect(next.project!.pages[0].sections.map((section) => section.orderIndex)).toEqual([0, 1, 2]);
  });
});

describe('builderReducer — UPDATE_SECTION', () => {
  it('patches section settings', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const section = makeSection({ id: 's1', settings: { title: 'old' } });
    const withSec = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section } });
    const next = builderReducer(withSec, {
      type: 'UPDATE_SECTION',
      payload: { pageId, sectionId: 's1', patch: { settings: { title: 'new' } } },
    });
    expect(next.project!.pages[0].sections[0].settings.title).toBe('new');
  });

  it('normalizes edited section anchors and keeps them unique on the page', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const withSections = {
      ...s,
      project: {
        ...s.project!,
        pages: [{
          ...s.project!.pages[0],
          sections: [
            makeSection({ id: 'travel-a', type: 'travel', settings: { anchorId: 'travel' } }),
            makeSection({ id: 'travel-b', type: 'travel', settings: { anchorId: 'hotels' } }),
          ],
        }],
      },
    };

    const next = builderReducer(withSections, {
      type: 'UPDATE_SECTION',
      payload: { pageId, sectionId: 'travel-b', patch: { settings: { anchorId: 'Travel!' } } },
    });

    expect(next.project!.pages[0].sections.map((section) => section.settings.anchorId)).toEqual(['travel', 'travel-2']);
  });

  it('allows edited section anchors to be cleared', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const withSection = builderReducer(s, {
      type: 'ADD_SECTION',
      payload: { pageId, section: makeSection({ id: 'rsvp', type: 'rsvp', settings: { anchorId: 'rsvp' } }) },
    });

    const next = builderReducer(withSection, {
      type: 'UPDATE_SECTION',
      payload: { pageId, sectionId: 'rsvp', patch: { settings: { anchorId: '' } } },
    });

    expect(next.project!.pages[0].sections[0].settings.anchorId).toBe('');
  });
});

describe('builderReducer — TOGGLE_SECTION_VISIBILITY', () => {
  it('toggles enabled flag', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const section = makeSection({ id: 's1', enabled: true });
    const withSec = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section } });
    const next = builderReducer(withSec, { type: 'TOGGLE_SECTION_VISIBILITY', payload: { pageId, sectionId: 's1' } });
    expect(next.project!.pages[0].sections[0].enabled).toBe(false);
  });
});

describe('builderReducer — UNDO / REDO', () => {
  it('does not undo when at index 0', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const withSec = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section: makeSection({ id: 's1' }) } });
    expect(withSec.history.currentIndex).toBe(0);
    const unchanged = builderReducer(withSec, { type: 'UNDO' });
    expect(unchanged.history.currentIndex).toBe(0);
  });

  it('undoes most recent mutation (history stores pre-mutation snapshots)', () => {
    const base = makeState();
    const pageId = base.project!.pages[0].id;
    const s1 = makeSection({ id: 's1' });
    const s2 = makeSection({ id: 's2' });
    const s3 = makeSection({ id: 's3' });

    const after1 = builderReducer(base, { type: 'ADD_SECTION', payload: { pageId, section: s1 } });
    const after2 = builderReducer(after1, { type: 'ADD_SECTION', payload: { pageId, section: s2 } });
    const after3 = builderReducer(after2, { type: 'ADD_SECTION', payload: { pageId, section: s3 } });

    expect(after3.history.currentIndex).toBe(2);
    expect(after3.project!.pages[0].sections).toHaveLength(3);

    const undone = builderReducer(after3, { type: 'UNDO' });
    expect(undone.history.currentIndex).toBe(1);
    expect(undone.project!.pages[0].sections).toHaveLength(1);
  });

  it('redoes after undo', () => {
    const base = makeState();
    const pageId = base.project!.pages[0].id;
    const s1 = makeSection({ id: 's1' });
    const s2 = makeSection({ id: 's2' });
    const s3 = makeSection({ id: 's3' });

    const after1 = builderReducer(base, { type: 'ADD_SECTION', payload: { pageId, section: s1 } });
    const after2 = builderReducer(after1, { type: 'ADD_SECTION', payload: { pageId, section: s2 } });
    const after3 = builderReducer(after2, { type: 'ADD_SECTION', payload: { pageId, section: s3 } });
    const undone = builderReducer(after3, { type: 'UNDO' });
    const redone = builderReducer(undone, { type: 'REDO' });

    expect(redone.project!.pages[0].sections).toHaveLength(2);
    expect(redone.history.currentIndex).toBe(2);
  });

  it('does not redo when already at latest', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;
    const withSec = builderReducer(s, { type: 'ADD_SECTION', payload: { pageId, section: makeSection({ id: 's1' }) } });
    const noOp = builderReducer(withSec, { type: 'REDO' });
    expect(noOp.history.currentIndex).toBe(withSec.history.currentIndex);
  });
});

describe('builderReducer — APPLY_TEMPLATE', () => {
  it('replaces first page sections', () => {
    const s = makeState();
    const sections = [makeSection({ id: 'tmpl-s1', type: 'hero' })];
    const next = builderReducer(s, { type: 'APPLY_TEMPLATE', payload: { templateId: 'modern', sections } });
    expect(next.project!.templateId).toBe('modern');
    expect(next.project!.pages[0].sections).toHaveLength(1);
    expect(next.project!.pages[0].sections[0].id).toBe('tmpl-s1');
  });

  it('can replace the project with template-defined pages', () => {
    const s = makeState();
    const pages = [
      {
        id: 'home',
        title: 'Home',
        slug: 'home',
        orderIndex: 0,
        sections: [makeSection({ id: 'hero-home', type: 'hero' })],
        meta: { isHome: true, isHidden: false },
      },
      {
        id: 'travel',
        title: 'Travel',
        slug: 'travel',
        orderIndex: 1,
        sections: [makeSection({ id: 'travel-section', type: 'travel' })],
        meta: { isHome: false, isHidden: false },
      },
    ];

    const next = builderReducer(s, {
      type: 'APPLY_TEMPLATE',
      payload: { templateId: 'destination', sections: pages[0].sections, pages },
    });

    expect(next.project!.templateId).toBe('destination');
    expect(next.project!.pages.map((page) => page.slug)).toEqual(['home', 'travel']);
    expect(next.project!.pages[1].sections[0].type).toBe('travel');
    expect(next.activePageId).toBe('home');
    expect(next.selectedSectionId).toBeNull();
  });

  it('normalizes incoming template pages before replacing the project', () => {
    const s = makeState();
    const pages = [
      {
        id: 'travel-one',
        title: 'Travel One',
        slug: 'Travel%20Info',
        orderIndex: 1,
        sections: [
          makeSection({ id: 'travel-b', type: 'travel', orderIndex: '4' as unknown as number }),
          makeSection({ id: 'travel-a', type: 'travel', orderIndex: 1, settings: { anchorId: 'Travel Info' } }),
        ],
        meta: { isHome: false, isHidden: false },
      },
      {
        id: 'welcome',
        title: 'Welcome',
        slug: 'Welcome',
        orderIndex: 0,
        sections: [makeSection({ id: 'hero-welcome', type: 'hero', orderIndex: 8 })],
        meta: { isHome: false, isHidden: true },
      },
      {
        id: 'travel-two',
        title: 'Travel Two',
        slug: '/travel_info/',
        orderIndex: 2,
        sections: [],
        meta: { isHome: false, isHidden: true },
      },
      {
        id: 'legacy-home',
        title: 'Legacy Home',
        slug: 'home',
        orderIndex: 3,
        sections: [],
        meta: { isHome: true, isHidden: false },
      },
    ];

    const next = builderReducer(s, {
      type: 'APPLY_TEMPLATE',
      payload: { templateId: 'messy-import', sections: pages[0].sections, pages },
    });

    expect(next.project!.pages.map((page) => ({
      slug: page.slug,
      orderIndex: page.orderIndex,
      meta: page.meta,
    }))).toEqual([
      { slug: 'home', orderIndex: 0, meta: { isHome: true, isHidden: false } },
      { slug: 'travel-info', orderIndex: 1, meta: { isHome: false, isHidden: false } },
      { slug: 'travel-info-2', orderIndex: 2, meta: { isHome: false, isHidden: true } },
      { slug: 'home-2', orderIndex: 3, meta: { isHome: false, isHidden: false } },
    ]);
    expect(next.project!.pages[1].sections.map((section) => `${section.id}:${section.orderIndex}`)).toEqual([
      'travel-a:0',
      'travel-b:1',
    ]);
    expect(next.project!.pages[1].sections[0].settings.anchorId).toBeUndefined();
    expect(next.activePageId).toBe('welcome');
  });
});

describe('builderReducer — CREATE_PAGE_FROM_SECTION', () => {
  it('moves a section onto a new dedicated page', () => {
    const base = makeState();
    const homeId = base.project!.pages[0].id;
    const withSections = {
      ...base,
      project: {
        ...base.project!,
        pages: [{
          ...base.project!.pages[0],
          sections: [
            makeSection({ id: 'hero', type: 'hero', orderIndex: 0 }),
            makeSection({ id: 'travel', type: 'travel', orderIndex: 1, settings: { anchorId: 'Travel' } }),
          ],
        }],
      },
    };

    const next = builderReducer(withSections, {
      type: 'CREATE_PAGE_FROM_SECTION',
      payload: { pageId: homeId, sectionId: 'travel', title: 'Travel' },
    });

    expect(next.project!.pages).toHaveLength(2);
    expect(next.project!.pages[0].sections.map((section) => section.id)).toEqual(['hero']);
    expect(next.project!.pages[1].title).toBe('Travel');
    expect(next.project!.pages[1].slug).toBe('travel');
    expect(next.project!.pages[1].sections.map((section) => section.id)).toEqual(['travel']);
    expect(next.project!.pages[1].sections[0].settings.anchorId).toBeUndefined();
    expect(next.activePageId).toBe(next.project!.pages[1].id);
    expect(next.selectedSectionId).toBe('travel');
  });

  it('preserves custom anchors when moving a section onto a dedicated page', () => {
    const base = makeState();
    const homeId = base.project!.pages[0].id;
    const withSections = {
      ...base,
      project: {
        ...base.project!,
        pages: [{
          ...base.project!.pages[0],
          sections: [
            makeSection({ id: 'hero', type: 'hero', orderIndex: 0 }),
            makeSection({ id: 'rsvp', type: 'rsvp', orderIndex: 1, settings: { anchorId: 'Meal Choice' } }),
          ],
        }],
      },
    };

    const next = builderReducer(withSections, {
      type: 'CREATE_PAGE_FROM_SECTION',
      payload: { pageId: homeId, sectionId: 'rsvp', title: 'RSVP' },
    });

    expect(next.project!.pages[1].slug).toBe('rsvp');
    expect(next.project!.pages[1].sections[0].settings.anchorId).toBe('Meal Choice');
  });

  it('keeps dedicated page slugs unique', () => {
    const base = makeState();
    const homeId = base.project!.pages[0].id;
    const withExistingTravelPage = {
      ...base,
      project: {
        ...base.project!,
        pages: [
          {
            ...base.project!.pages[0],
            sections: [
              makeSection({ id: 'hero', type: 'hero', orderIndex: 0 }),
              makeSection({ id: 'travel', type: 'travel', orderIndex: 1 }),
            ],
          },
          {
            id: 'existing-travel',
            title: 'Travel',
            slug: 'travel',
            orderIndex: 1,
            sections: [],
            meta: { isHome: false, isHidden: false },
          },
        ],
      },
    };

    const next = builderReducer(withExistingTravelPage, {
      type: 'CREATE_PAGE_FROM_SECTION',
      payload: { pageId: homeId, sectionId: 'travel', title: 'Travel' },
    });

    expect(next.project!.pages[2].slug).toBe('travel-2');
  });

  it('does not move the last source page section into a dedicated page', () => {
    const base = makeState();
    const homeId = base.project!.pages[0].id;
    const withOneSection = {
      ...base,
      project: {
        ...base.project!,
        pages: [{
          ...base.project!.pages[0],
          sections: [makeSection({ id: 'travel', type: 'travel', orderIndex: 0 })],
        }],
      },
    };

    const next = builderReducer(withOneSection, {
      type: 'CREATE_PAGE_FROM_SECTION',
      payload: { pageId: homeId, sectionId: 'travel', title: 'Travel' },
    });

    expect(next).toBe(withOneSection);
  });
});

describe('builderReducer — MARK_SAVED', () => {
  it('clears dirty flag and sets lastSavedAt', () => {
    const s = makeState({ isDirty: true });
    const ts = '2026-01-01T00:00:00Z';
    const next = builderReducer(s, { type: 'MARK_SAVED', payload: ts });
    expect(next.isDirty).toBe(false);
    expect(next.isSaving).toBe(false);
    expect(next.lastSavedAt).toBe(ts);
  });
});

describe('builderReducer — MARK_PUBLISHED', () => {
  it('sets publishedVersion and status', () => {
    const s = makeState();
    const next = builderReducer(s, {
      type: 'MARK_PUBLISHED',
      payload: { version: 3, publishedAt: '2026-01-01T00:00:00Z' },
    });
    expect(next.project!.publishedVersion).toBe(3);
    expect(next.project!.publishStatus).toBe('published');
  });
});

describe('builderReducer — SET_ERROR', () => {
  it('sets error message', () => {
    const next = builderReducer(makeState(), { type: 'SET_ERROR', payload: 'oops' });
    expect(next.error).toBe('oops');
  });

  it('clears error when null', () => {
    const s = makeState({ error: 'old' });
    const next = builderReducer(s, { type: 'SET_ERROR', payload: null });
    expect(next.error).toBeNull();
  });
});

function makeAsset(id = 'a1') {
  return {
    id,
    weddingId: 'w1',
    filename: 'a.jpg',
    originalFilename: 'a.jpg',
    mimeType: 'image/jpeg',
    assetType: 'image' as const,
    status: 'ready' as const,
    url: 'http://x.com/a.jpg',
    sizeBytes: 100,
    tags: [],
    attachedSectionIds: [],
    meta: { uploadedAtISO: '2026-01-01T00:00:00Z', updatedAtISO: '2026-01-01T00:00:00Z' },
  };
}

describe('builderReducer — MEDIA actions', () => {
  it('sets media assets', () => {
    const s = makeState();
    const next = builderReducer(s, { type: 'SET_MEDIA_ASSETS', payload: [makeAsset()] });
    expect(next.mediaAssets).toHaveLength(1);
  });

  it('prepends new media asset', () => {
    const s = makeState();
    const next = builderReducer(s, { type: 'ADD_MEDIA_ASSET', payload: makeAsset() });
    expect(next.mediaAssets[0].id).toBe('a1');
  });

  it('removes media asset by id', () => {
    const s = builderReducer(makeState(), { type: 'ADD_MEDIA_ASSET', payload: makeAsset() });
    const next = builderReducer(s, { type: 'REMOVE_MEDIA_ASSET', payload: 'a1' });
    expect(next.mediaAssets).toHaveLength(0);
  });

  it('preserves the targeted image setting when opening the media picker', () => {
    const s = makeState();
    const next = builderReducer(s, {
      type: 'OPEN_MEDIA_LIBRARY',
      payload: { sectionId: 'section-1', targetField: 'settings', targetSettingKey: 'backgroundImage' },
    });
    expect(next.mediaLibraryOpen).toBe(true);
    expect(next.mediaPickerTargetSectionId).toBe('section-1');
    expect(next.mediaPickerTargetField).toBe('settings');
    expect(next.mediaPickerTargetSettingKey).toBe('backgroundImage');
  });

  it('clears the targeted image setting when closing the media picker', () => {
    const opened = builderReducer(makeState(), {
      type: 'OPEN_MEDIA_LIBRARY',
      payload: { sectionId: 'section-1', targetField: 'settings', targetSettingKey: 'backgroundImage' },
    });
    const next = builderReducer(opened, { type: 'CLOSE_MEDIA_LIBRARY' });
    expect(next.mediaLibraryOpen).toBe(false);
    expect(next.mediaPickerTargetSectionId).toBeNull();
    expect(next.mediaPickerTargetField).toBeNull();
    expect(next.mediaPickerTargetSettingKey).toBeNull();
  });

  it('replaces existing upload queue entries for the same asset id', () => {
    const s = makeState();
    const first = builderReducer(s, {
      type: 'UPDATE_UPLOAD_QUEUE',
      payload: { assetId: 'asset-1', progress: 20, status: 'uploading' },
    });
    const next = builderReducer(first, {
      type: 'UPDATE_UPLOAD_QUEUE',
      payload: { assetId: 'asset-1', progress: 100, status: 'processing' },
    });

    expect(next.uploadQueue).toHaveLength(1);
    expect(next.uploadQueue[0]).toEqual({ assetId: 'asset-1', progress: 100, status: 'processing' });
  });

  it('appends upload queue entries for different asset ids', () => {
    const s = makeState();
    const first = builderReducer(s, {
      type: 'UPDATE_UPLOAD_QUEUE',
      payload: { assetId: 'asset-1', progress: 20, status: 'uploading' },
    });
    const next = builderReducer(first, {
      type: 'UPDATE_UPLOAD_QUEUE',
      payload: { assetId: 'asset-2', progress: 40, status: 'uploading' },
    });

    expect(next.uploadQueue).toEqual([
      { assetId: 'asset-1', progress: 20, status: 'uploading' },
      { assetId: 'asset-2', progress: 40, status: 'uploading' },
    ]);
  });
});

describe('builderReducer — default', () => {
  it('returns state unchanged for unknown action', () => {
    const s = makeState();
    // @ts-expect-error intentional unknown action
    const next = builderReducer(s, { type: 'UNKNOWN_ACTION' });
    expect(next).toBe(s);
  });
});
