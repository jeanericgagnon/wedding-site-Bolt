import { describe, expect, it, vi } from 'vitest';

import { prepareImportedBuilderV2Document } from '../builder-v2/importPrepare';
import {
  buildBuilderV2ExportDocument,
  resolveBuilderV2ImportDraftPreview,
  type BuilderV2SectionBlocksMap,
} from './builderV2DocumentIo';
import { getLabPagesFromBuilderV2Document, type LabPage } from './builderV2PageState';
import type { BuilderV2BlockType } from '../builder-v2/contracts';

type LabBlock = {
  id: string;
  type: BuilderV2BlockType;
  content: string;
  data: Record<string, unknown>;
};

const buildSectionBlocksFromImportedPages = (pages: LabPage[]) => {
  const sectionBlocks: BuilderV2SectionBlocksMap<LabBlock> = {};

  for (const page of pages) {
    for (const section of page.sections) {
      sectionBlocks[section.id] = [];
    }
  }

  return sectionBlocks;
};

const expectSampleRoundTripToStayUsable = (input: unknown, expected: {
  pageCount: number;
  sourceKind: 'builder-v2' | 'layout-config-v1' | 'builder-project';
  homeSlug: string;
}) => {
  const prepared = prepareImportedBuilderV2Document(input, { nowIso: '2026-05-28T18:00:00.000Z' });
  expect(prepared.ok).toBe(true);
  if (!prepared.ok) return;

  expect(prepared.report.sourceKind).toBe(expected.sourceKind);
  expect(prepared.doc.pages).toHaveLength(expected.pageCount);

  const labPages = getLabPagesFromBuilderV2Document(prepared.doc);
  expect(labPages).toHaveLength(expected.pageCount);
  expect(labPages[0]?.slug).toBe(expected.homeSlug);

  const exported = buildBuilderV2ExportDocument(
    labPages,
    buildSectionBlocksFromImportedPages(labPages),
  );

  const preview = resolveBuilderV2ImportDraftPreview(JSON.stringify(exported));
  expect(preview.state).toBe('ready');
  if (preview.state !== 'ready') return;

  const roundTrippedPages = getLabPagesFromBuilderV2Document(preview.prepared.doc);
  expect(roundTrippedPages).toHaveLength(expected.pageCount);
  expect(roundTrippedPages.map((page) => ({
    title: page.title,
    slug: page.slug,
    isHome: page.isHome,
    hidden: page.hidden,
    sections: page.sections.map((section) => ({
      title: section.title,
      type: section.type,
      enabled: section.enabled,
    })),
  }))).toEqual(labPages.map((page) => ({
    title: page.title,
    slug: page.slug,
    isHome: page.isHome,
    hidden: page.hidden,
    sections: page.sections.map((section) => ({
      title: section.title,
      type: section.type,
      enabled: section.enabled,
    })),
  })));
};

describe('builderV2 sample document stability', () => {
  it('keeps a native Builder V2 sample document usable across export and re-import', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-28T18:00:00.000Z'));

    expectSampleRoundTripToStayUsable({
      version: 'v2',
      updatedAtISO: '2026-05-28T18:00:00.000Z',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          isHome: true,
          hidden: false,
          sections: [
            {
              id: 'hero',
              type: 'hero',
              title: 'Welcome',
              subtitle: 'Join us in Sonoma',
              variant: 'default',
              enabled: true,
              blocks: [
                { id: 'hero-title', type: 'title', data: { text: 'Welcome' } },
              ],
            },
          ],
        },
        {
          id: 'travel',
          title: 'Travel',
          slug: 'travel',
          isHome: false,
          hidden: false,
          sections: [
            {
              id: 'travel-section',
              type: 'travel',
              title: 'Travel',
              subtitle: 'Stay nearby',
              variant: 'guide',
              enabled: true,
              blocks: [
                { id: 'travel-note', type: 'travelTip', data: { title: 'Stay nearby', note: 'Book early.' } },
              ],
            },
          ],
        },
      ],
    }, {
      pageCount: 2,
      sourceKind: 'builder-v2',
      homeSlug: 'home',
    });

    vi.useRealTimers();
  });

  it('keeps a legacy layout-config sample document usable after migration and re-export', () => {
    expectSampleRoundTripToStayUsable({
      version: '1',
      templateId: 'modern-luxe',
      pages: [
        {
          id: 'home',
          title: 'Home',
          sections: [
            {
              id: 'hero',
              type: 'hero',
              variant: 'default',
              enabled: true,
              bindings: {},
              settings: { title: 'Welcome', subtitle: 'Join us in Napa' },
            },
          ],
        },
        {
          id: 'travel',
          title: 'Travel Plans',
          sections: [
            {
              id: 'travel-section',
              type: 'travel',
              variant: 'default',
              enabled: true,
              bindings: {},
              settings: { title: 'Travel', description: 'Stay nearby' },
            },
          ],
        },
      ],
      meta: {
        createdAtISO: '2026-05-27T18:00:00.000Z',
        updatedAtISO: '2026-05-27T19:00:00.000Z',
      },
    }, {
      pageCount: 2,
      sourceKind: 'layout-config-v1',
      homeSlug: 'home',
    });
  });

  it('keeps a legacy builder-project sample document usable after migration and re-export', () => {
    expectSampleRoundTripToStayUsable({
      id: 'project-1',
      weddingId: 'w1',
      templateId: 'modern-luxe',
      themeId: 'romantic',
      pages: [
        {
          id: 'home',
          title: 'Home',
          slug: 'home',
          orderIndex: 0,
          sections: [
            {
              id: 'hero',
              displayName: 'Hero lead',
              type: 'hero',
              variant: 'default',
              enabled: true,
              locked: false,
              orderIndex: 0,
              settings: { headline: 'Welcome home', subheadline: 'See you in September' },
              bindings: {},
              styleOverrides: {},
              meta: { createdAtISO: '2026-05-27T18:00:00.000Z', updatedAtISO: '2026-05-27T18:00:00.000Z' },
            },
          ],
          meta: { isHome: true, isHidden: false },
        },
        {
          id: 'weekend',
          title: 'Weekend',
          slug: 'weekend',
          orderIndex: 1,
          sections: [
            {
              id: 'travel',
              type: 'travel',
              variant: 'default',
              enabled: true,
              locked: false,
              orderIndex: 0,
              settings: { title: 'Travel', intro: 'Stay nearby' },
              bindings: {},
              styleOverrides: {},
              meta: { createdAtISO: '2026-05-27T18:00:00.000Z', updatedAtISO: '2026-05-27T18:00:00.000Z' },
            },
          ],
          meta: { isHome: false, isHidden: true },
        },
      ],
      draftVersion: 2,
      publishedVersion: 1,
      publishStatus: 'draft',
      lastPublishedAt: null,
      meta: { createdAtISO: '2026-05-27T18:00:00.000Z', updatedAtISO: '2026-05-27T20:00:00.000Z' },
    }, {
      pageCount: 2,
      sourceKind: 'builder-project',
      homeSlug: 'home',
    });
  });
});
