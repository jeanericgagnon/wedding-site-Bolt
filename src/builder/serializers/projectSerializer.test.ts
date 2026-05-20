import { describe, expect, it } from 'vitest';
import { createEmptyBuilderProject } from '../../types/builder/project';
import { BuilderSectionInstance } from '../../types/builder/section';
import { serializeBuilderProject } from './projectSerializer';

function makeSection(overrides?: Partial<BuilderSectionInstance>): BuilderSectionInstance {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 'section',
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

describe('serializeBuilderProject', () => {
  it('normalizes page slugs, home metadata, order, and redundant dedicated-page anchors', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        id: 'travel-one',
        title: 'Travel One',
        slug: 'Travel%20Info',
        orderIndex: 0,
        sections: [
          makeSection({ id: 'travel-b', type: 'travel', orderIndex: 5 }),
          makeSection({ id: 'travel-a', type: 'travel', orderIndex: '1' as unknown as number, settings: { anchorId: 'Travel Info' } }),
        ],
        meta: { isHome: false, isHidden: false },
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
        id: 'travel-two',
        title: 'Travel Two',
        slug: '/travel_info/',
        orderIndex: 2,
        sections: [],
        meta: { isHome: false, isHidden: true },
      },
    ];

    const serialized = serializeBuilderProject(project);

    expect(serialized.pages.map((page) => ({
      slug: page.slug,
      orderIndex: page.orderIndex,
      meta: page.meta,
    }))).toEqual([
      { slug: 'home', orderIndex: 0, meta: { isHome: true, isHidden: false } },
      { slug: 'travel-info', orderIndex: 1, meta: { isHome: false, isHidden: false } },
      { slug: 'travel-info-2', orderIndex: 2, meta: { isHome: false, isHidden: true } },
    ]);
    expect(serialized.pages[1].sections.map((section) => `${section.id}:${section.orderIndex}`)).toEqual([
      'travel-a:0',
      'travel-b:1',
    ]);
    expect(serialized.pages[1].sections[0].settings.anchorId).toBeUndefined();
  });

  it('can normalize loaded projects without touching saved timestamps', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.meta = {
      createdAtISO: '2026-01-01T00:00:00.000Z',
      updatedAtISO: '2026-01-02T00:00:00.000Z',
    };
    project.pages[0].sections = [
      makeSection({
        id: 'hero',
        meta: {
          createdAtISO: '2026-01-03T00:00:00.000Z',
          updatedAtISO: '2026-01-04T00:00:00.000Z',
        },
      }),
    ];

    const serialized = serializeBuilderProject(project, { touchTimestamps: false });

    expect(serialized.meta).toEqual({
      createdAtISO: '2026-01-01T00:00:00.000Z',
      updatedAtISO: '2026-01-02T00:00:00.000Z',
    });
    expect(serialized.pages[0].sections[0].meta).toEqual({
      createdAtISO: '2026-01-03T00:00:00.000Z',
      updatedAtISO: '2026-01-04T00:00:00.000Z',
    });
  });

  it('unwraps builder value page titles before saving and stripping redundant anchors', () => {
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

    const serialized = serializeBuilderProject(project);

    expect(serialized.pages[1]).toMatchObject({
      title: 'Guest Travel',
      slug: 'guest-travel-page',
    });
    expect(serialized.pages[1].sections[0].settings.anchorId).toBeUndefined();
  });
});
