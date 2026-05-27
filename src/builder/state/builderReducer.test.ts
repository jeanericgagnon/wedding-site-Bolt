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
});

describe('builderReducer — SET_MODE', () => {
  it('switches to preview mode', () => {
    const s = makeState();
    const next = builderReducer(s, { type: 'SET_MODE', payload: 'preview' });
    expect(next.mode).toBe('preview');
    expect(next.selectedSectionId).toBeNull();
  });
});

describe('builderReducer — page integrity', () => {
  it('normalizes loaded pages so home stays visible and slugs stay unique', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: 'home',
        title: 'Home',
        slug: 'travel',
        orderIndex: 2,
        meta: { isHome: true, isHidden: true },
      },
      {
        ...project.pages[0],
        id: 'travel',
        title: 'Travel',
        slug: 'travel',
        orderIndex: 8,
        meta: { isHome: false, isHidden: false },
      },
    ];

    const next = builderReducer(makeState(), { type: 'LOAD_PROJECT', payload: project });

    expect(next.project?.pages.map((page) => ({
      id: page.id,
      slug: page.slug,
      orderIndex: page.orderIndex,
      meta: page.meta,
    }))).toEqual([
      {
        id: 'home',
        slug: 'travel',
        orderIndex: 0,
        meta: { isHome: true, isHidden: false },
      },
      {
        id: 'travel',
        slug: 'travel-2',
        orderIndex: 1,
        meta: { isHome: false, isHidden: false },
      },
    ]);
  });

  it('does not let the home page be hidden through page updates', () => {
    const s = makeState();
    const pageId = s.project!.pages[0].id;

    const next = builderReducer(s, {
      type: 'UPDATE_PAGE',
      payload: {
        pageId,
        patch: {
          meta: { isHome: true, isHidden: true },
        },
      },
    });

    expect(next.project!.pages[0].meta).toEqual({ isHome: true, isHidden: false });
  });

  it('keeps edited page slugs unique when a conflicting slug is requested', () => {
    const base = makeState();
    const firstPageId = base.project!.pages[0].id;
    const withSecondPage = builderReducer(base, {
      type: 'ADD_PAGE',
      payload: { title: 'Travel' },
    });
    const secondPageId = withSecondPage.activePageId!;

    const next = builderReducer(withSecondPage, {
      type: 'UPDATE_PAGE',
      payload: {
        pageId: secondPageId,
        patch: { slug: 'home' },
      },
    });

    expect(firstPageId).not.toBe(secondPageId);
    expect(next.project!.pages.find((page) => page.id === secondPageId)?.slug).toBe('home-2');
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
});

describe('builderReducer — MARK_SAVED', () => {
  it('clears dirty flag and sets lastSavedAt', () => {
    const s = makeState({ isDirty: true });
    const ts = '2026-01-01T00:00:00Z';
    const next = builderReducer(s, { type: 'MARK_SAVED', payload: { timestamp: ts } });
    expect(next.isDirty).toBe(false);
    expect(next.isSaving).toBe(false);
    expect(next.lastSavedAt).toBe(ts);
  });

  it('syncs saved project metadata when a persisted snapshot comes back', () => {
    const s = makeState({ isDirty: true });
    const ts = '2026-01-01T00:00:00Z';
    const savedProject = {
      ...s.project!,
      draftVersion: 4,
      meta: {
        ...s.project!.meta,
        updatedAtISO: ts,
      },
    };

    const next = builderReducer(s, { type: 'MARK_SAVED', payload: { timestamp: ts, project: savedProject } });
    expect(next.project?.draftVersion).toBe(4);
    expect(next.project?.meta.updatedAtISO).toBe(ts);
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
      payload: { assetId: 'asset-1', filename: 'asset-1.jpg', progress: 20, status: 'uploading' },
    });
    const next = builderReducer(first, {
      type: 'UPDATE_UPLOAD_QUEUE',
      payload: { assetId: 'asset-1', filename: 'asset-1.jpg', progress: 100, status: 'processing' },
    });

    expect(next.uploadQueue).toHaveLength(1);
    expect(next.uploadQueue[0]).toEqual({ assetId: 'asset-1', filename: 'asset-1.jpg', progress: 100, status: 'processing' });
  });

  it('appends upload queue entries for different asset ids', () => {
    const s = makeState();
    const first = builderReducer(s, {
      type: 'UPDATE_UPLOAD_QUEUE',
      payload: { assetId: 'asset-1', filename: 'asset-1.jpg', progress: 20, status: 'uploading' },
    });
    const next = builderReducer(first, {
      type: 'UPDATE_UPLOAD_QUEUE',
      payload: { assetId: 'asset-2', filename: 'asset-2.jpg', progress: 40, status: 'uploading' },
    });

    expect(next.uploadQueue).toEqual([
      { assetId: 'asset-1', filename: 'asset-1.jpg', progress: 20, status: 'uploading' },
      { assetId: 'asset-2', filename: 'asset-2.jpg', progress: 40, status: 'uploading' },
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
