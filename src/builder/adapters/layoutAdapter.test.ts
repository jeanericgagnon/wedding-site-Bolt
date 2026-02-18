import { describe, it, expect } from 'vitest';
import {
  fromExistingLayoutToBuilderProject,
  fromBuilderProjectToExistingLayout,
  createBuilderSectionFromLibrary,
} from './layoutAdapter';
import { LayoutConfigV1 } from '../../types/layoutConfig';

function makeLayout(overrides?: Partial<LayoutConfigV1>): LayoutConfigV1 {
  return {
    version: '1',
    templateId: 'classic',
    pages: [
      {
        id: 'page-1',
        title: 'Main',
        sections: [
          {
            id: 's1',
            type: 'hero',
            variant: 'default',
            enabled: true,
            bindings: {},
            settings: { title: 'Hello' },
          },
        ],
      },
    ],
    meta: {
      createdAtISO: '2026-01-01T00:00:00Z',
      updatedAtISO: '2026-01-01T00:00:00Z',
    },
    ...overrides,
  };
}

describe('fromExistingLayoutToBuilderProject', () => {
  it('sets weddingId', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout());
    expect(project.weddingId).toBe('w1');
  });

  it('maps pages from layout', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout());
    expect(project.pages).toHaveLength(1);
    expect(project.pages[0].id).toBe('page-1');
  });

  it('maps sections from page', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout());
    expect(project.pages[0].sections).toHaveLength(1);
    expect(project.pages[0].sections[0].type).toBe('hero');
  });

  it('marks first page as home', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout());
    expect(project.pages[0].meta.isHome).toBe(true);
  });

  it('preserves meta timestamps', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout());
    expect(project.meta.createdAtISO).toBe('2026-01-01T00:00:00Z');
  });
});

describe('fromBuilderProjectToExistingLayout', () => {
  it('round-trips through both adapters', () => {
    const layout = makeLayout();
    const project = fromExistingLayoutToBuilderProject('w1', layout);
    const result = fromBuilderProjectToExistingLayout(project);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].sections).toHaveLength(1);
    expect(result.pages[0].sections[0].type).toBe('hero');
  });

  it('sets version to 1', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout());
    const result = fromBuilderProjectToExistingLayout(project);
    expect(result.version).toBe('1');
  });
});

describe('createBuilderSectionFromLibrary', () => {
  it('creates a section with the given type', () => {
    const sec = createBuilderSectionFromLibrary('hero');
    expect(sec.type).toBe('hero');
  });

  it('defaults to enabled', () => {
    expect(createBuilderSectionFromLibrary('story').enabled).toBe(true);
  });

  it('uses provided variant', () => {
    const sec = createBuilderSectionFromLibrary('gallery', 'masonry');
    expect(sec.variant).toBe('masonry');
  });

  it('sets orderIndex', () => {
    const sec = createBuilderSectionFromLibrary('rsvp', 'default', 3);
    expect(sec.orderIndex).toBe(3);
  });
});
