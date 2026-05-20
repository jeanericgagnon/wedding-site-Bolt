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

  it('unwraps builder value page titles when importing legacy layout config', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout({
      pages: [
        {
          id: 'travel',
          title: { value: 'Guest Travel', source: 'user-edited' } as unknown as string,
          sections: [],
        },
      ],
    }));

    expect(project.pages[0].title).toBe('Guest Travel');
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

  it('preserves full section style overrides when rebuilding builder project state from layout truth', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout({
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
              overrides: {
                backgroundColor: '#ffffff',
                textColor: '#111827',
                paddingTop: '96px',
                paddingBottom: '48px',
                sideImage: 'https://example.com/hero.jpg',
                sideImagePosition: 'left',
                sideImageSize: 'lg',
                sideImageFit: 'contain',
                animationPreset: 'fade-up',
              },
            },
          ],
        },
      ],
    }));

    expect(project.pages[0].sections[0].styleOverrides).toMatchObject({
      backgroundColor: '#ffffff',
      textColor: '#111827',
      paddingTop: '96px',
      paddingBottom: '48px',
      sideImage: 'https://example.com/hero.jpg',
      sideImagePosition: 'left',
      sideImageSize: 'lg',
      sideImageFit: 'contain',
      animationPreset: 'fade-up',
    });
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

  it('sorts pages and sections without mutating the builder project', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout({
      pages: [
        {
          id: 'travel',
          title: 'Travel',
          sections: [
            { id: 'travel-b', type: 'travel', variant: 'default', enabled: true, bindings: {}, settings: {} },
            { id: 'travel-a', type: 'travel', variant: 'default', enabled: true, bindings: {}, settings: {} },
          ],
        },
        {
          id: 'home',
          title: 'Home',
          sections: [],
        },
      ],
    }));
    project.pages[0].orderIndex = 1;
    project.pages[1].orderIndex = 0;
    project.pages[0].sections[0].orderIndex = 2;
    project.pages[0].sections[1].orderIndex = '1' as unknown as number;

    const result = fromBuilderProjectToExistingLayout(project);

    expect(result.pages.map((page) => page.id)).toEqual(['home', 'travel']);
    expect(result.pages[1].sections.map((section) => section.id)).toEqual(['travel-a', 'travel-b']);
    expect(project.pages.map((page) => page.id)).toEqual(['travel', 'home']);
    expect(project.pages[0].sections.map((section) => section.id)).toEqual(['travel-b', 'travel-a']);
  });

  it('unwraps builder value page titles when exporting legacy layout config', () => {
    const project = fromExistingLayoutToBuilderProject('w1', makeLayout({
      pages: [
        {
          id: 'travel',
          title: 'Travel',
          sections: [],
        },
      ],
    }));
    project.pages[0].title = { value: 'Guest Travel', source: 'user-edited' } as unknown as string;

    const result = fromBuilderProjectToExistingLayout(project);

    expect(result.pages[0].title).toBe('Guest Travel');
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
