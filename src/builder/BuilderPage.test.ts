import { describe, expect, it, vi } from 'vitest';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isDemoMode: false }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('../lib/activeSite', () => ({
  resolveActiveSiteForUser: vi.fn(),
}));

vi.mock('./services/builderProjectService', () => ({
  builderProjectService: {
    loadEntrySite: vi.fn(),
    loadProject: vi.fn(),
    createProject: vi.fn(),
    saveProject: vi.fn(),
    publishProject: vi.fn(),
  },
}));

vi.mock('./services/publishService', () => ({
  publishService: {
    publish: vi.fn(),
  },
}));

vi.mock('./components/BuilderShell', () => ({
  BuilderShell: () => null,
}));

vi.mock('./state/builderReducer', () => ({
  createInitialBuilderState: vi.fn(),
  builderReducer: vi.fn(),
}));

vi.mock('./state/builderActions', () => ({
  builderActions: {},
}));

vi.mock('./utils/setupDraftHydration', () => ({
  applySetupDraftToWeddingData: vi.fn((data) => data),
  hasMeaningfulSetupDraft: vi.fn(() => false),
}));

vi.mock('./components/ai/BuilderAssistantPanel', () => ({
  BuilderAssistantPanel: () => null,
}));

vi.mock('../lib/coupleDisplayName', async () => {
  const actual = await vi.importActual<typeof import('../lib/coupleDisplayName')>('../lib/coupleDisplayName');
  return actual;
});

import { applyTemplateDefaultsToProject, buildInitialTemplatePages, createDemoWeddingDataFromSite, withDefaultSectionAnchors } from './BuilderPage';
import { getTemplatePack } from './constants/builderTemplatePacks';
import { createEmptyBuilderProject, type BuilderProject } from '../types/builder/project';

describe('createDemoWeddingDataFromSite', () => {
  it('skips invalid demo wedding dates instead of crashing builder demo hydration', () => {
    expect(() => createDemoWeddingDataFromSite({ wedding_date: 'not-a-date' })).not.toThrow();

    const data = createDemoWeddingDataFromSite({ wedding_date: 'not-a-date' });

    expect(data.event.weddingDateISO).toBeUndefined();
    expect(data.schedule).toEqual([]);
  });
});

describe('withDefaultSectionAnchors', () => {
  it('adds default section anchors to existing builder projects without overriding explicit anchors', () => {
    const project = {
      id: 'project-1',
      weddingId: 'site-1',
      templateId: 'modern-luxe',
      themeId: 'modern-luxe',
      pages: [{
        id: 'home',
        title: 'Home',
        slug: 'home',
        orderIndex: 0,
        meta: { isHome: true, isHidden: false },
        sections: [
          {
            id: 'schedule-1',
            type: 'schedule',
            variant: 'timeline',
            enabled: true,
            locked: false,
            orderIndex: 0,
            settings: { showTitle: true },
            bindings: {},
            styleOverrides: {},
            meta: { createdAtISO: '2026-05-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
          },
          {
            id: 'rsvp-1',
            type: 'rsvp',
            variant: 'default',
            enabled: true,
            locked: false,
            orderIndex: 1,
            settings: { showTitle: true, anchorId: 'reply' },
            bindings: {},
            styleOverrides: {},
            meta: { createdAtISO: '2026-05-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
          },
        ],
      }],
      draftVersion: 1,
      publishedVersion: 0,
      publishStatus: 'draft',
      lastPublishedAt: null,
      meta: { createdAtISO: '2026-05-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
    } satisfies BuilderProject;

    const updated = withDefaultSectionAnchors(project);

    expect(updated.pages[0]?.sections.map((section) => section.settings.anchorId)).toEqual(['schedule', 'reply']);
    expect(project.pages[0]?.sections[0]?.settings.anchorId).toBeUndefined();
  });

  it('does not restore redundant anchors on dedicated pages', () => {
    const project = {
      id: 'project-1',
      weddingId: 'site-1',
      templateId: 'modern-luxe',
      themeId: 'modern-luxe',
      pages: [{
        id: 'travel-page',
        title: 'Travel',
        slug: 'travel',
        orderIndex: 0,
        meta: { isHome: false, isHidden: false },
        sections: [
          {
            id: 'travel-1',
            type: 'travel',
            variant: 'compact',
            enabled: true,
            locked: false,
            orderIndex: 0,
            settings: { showTitle: true },
            bindings: {},
            styleOverrides: {},
            meta: { createdAtISO: '2026-05-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
          },
        ],
      }],
      draftVersion: 1,
      publishedVersion: 0,
      publishStatus: 'draft',
      lastPublishedAt: null,
      meta: { createdAtISO: '2026-05-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
    } satisfies BuilderProject;

    const updated = withDefaultSectionAnchors(project);

    expect(updated.pages[0]?.sections[0]?.settings.anchorId).toBeUndefined();
  });
});

describe('buildInitialTemplatePages', () => {
  it('builds dedicated pages from multi-page template definitions', () => {
    const template = getTemplatePack('modern-luxe');
    expect(template).toBeTruthy();

    const pages = buildInitialTemplatePages(template!);

    expect(pages.map((page) => page.slug)).toEqual(['home', 'travel', 'rsvp', 'registry']);
    expect(pages[0]?.meta).toEqual({ isHome: true, isHidden: false });
    expect(pages.find((page) => page.slug === 'travel')?.sections[0]?.settings.anchorId).toBeUndefined();
  });
});

describe('applyTemplateDefaultsToProject', () => {
  it('applies multi-page template defaults to blank projects', () => {
    const project = createEmptyBuilderProject('site-1', 'classic');

    const updated = applyTemplateDefaultsToProject(project, 'modern-luxe');

    expect(updated.templateId).toBe('modern-luxe');
    expect(updated.pages.map((page) => page.slug)).toEqual(['home', 'travel', 'rsvp', 'registry']);
  });

  it('does not replace pages when the project already has content', () => {
    const project = createEmptyBuilderProject('site-1', 'classic');
    project.pages[0].sections = [{
      id: 'existing-hero',
      type: 'hero',
      variant: 'default',
      enabled: true,
      locked: false,
      orderIndex: 0,
      settings: { headline: 'Keep me' },
      bindings: {},
      styleOverrides: {},
      meta: { createdAtISO: '2026-05-01T00:00:00.000Z', updatedAtISO: '2026-05-01T00:00:00.000Z' },
    }];

    const updated = applyTemplateDefaultsToProject(project, 'modern-luxe');

    expect(updated.pages).toHaveLength(1);
    expect(updated.pages[0].sections[0].id).toBe('existing-hero');
  });
});
