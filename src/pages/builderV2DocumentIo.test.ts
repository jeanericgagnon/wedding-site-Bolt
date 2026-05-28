import { describe, expect, it, vi } from 'vitest';

import { getLabPagesFromBuilderV2Document } from './builderV2PageState';
import {
  buildBuilderV2ExportDocument,
  resolveBuilderV2ImportDraftPreview,
} from './builderV2DocumentIo';
import type { BuilderV2SectionBlocksMap } from './builderV2DocumentIo';
import type { BuilderV2BlockType } from '../builder-v2/contracts';

describe('builderV2DocumentIo', () => {
  it('builds exportable documents that re-import cleanly into the lab shape', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-28T12:00:00.000Z'));

    const sectionBlocks: BuilderV2SectionBlocksMap<{
      id: string;
      type: BuilderV2BlockType;
      content: string;
      data: Record<string, unknown>;
    }> = {
      hero: [
        { id: 'hero-title', type: 'title', content: 'Welcome', data: { text: 'Welcome' } },
        { id: 'hero-photo', type: 'photo', content: 'Photo', data: { imageUrl: 'https://example.com/photo.jpg', caption: 'Weekend' } },
      ],
      'travel-section': [
        { id: 'travel-tip', type: 'travelTip', content: 'Stay nearby', data: { title: 'Stay nearby', note: 'Book early.' } },
      ],
    };

    const exportDocument = buildBuilderV2ExportDocument(
      [
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
              title: 'Hero',
              subtitle: 'Join us in Napa',
              variant: 'default',
              enabled: true,
              density: 'comfortable',
            },
          ],
        },
        {
          id: 'travel',
          title: 'Travel',
          slug: 'home',
          isHome: false,
          hidden: false,
          sections: [
            {
              id: 'travel-section',
              type: 'travel',
              title: 'Travel',
              subtitle: '',
              variant: 'guide',
              enabled: true,
              density: 'comfortable',
            },
          ],
        },
      ],
      sectionBlocks,
    );

    expect(exportDocument.updatedAtISO).toBe('2026-05-28T12:00:00.000Z');

    const preview = resolveBuilderV2ImportDraftPreview(JSON.stringify(exportDocument));
    expect(preview.state).toBe('ready');
    if (preview.state !== 'ready') return;

    const labPages = getLabPagesFromBuilderV2Document(preview.prepared.doc);
    expect(labPages.map((page) => ({ id: page.id, slug: page.slug, isHome: page.isHome }))).toEqual([
      { id: 'home', slug: 'home', isHome: true },
      { id: 'travel', slug: 'home-2', isHome: false },
    ]);
    expect(preview.prepared.doc.pages?.[0]?.sections[0]?.blocks).toHaveLength(2);
    expect(preview.prepared.doc.pages?.[1]?.sections[0]?.blocks[0]).toMatchObject({
      id: 'travel-tip',
      type: 'travelTip',
      data: { title: 'Stay nearby', note: 'Book early.' },
    });

    vi.useRealTimers();
  });

  it('treats malformed JSON as an invalid preview without producing a document', () => {
    expect(resolveBuilderV2ImportDraftPreview('{bad json')).toEqual({
      state: 'invalid',
      error: 'We could not parse that JSON. Check the formatting and try again.',
    });
  });

  it('treats structurally unusable drafts as invalid without producing a prepared import', () => {
    const preview = resolveBuilderV2ImportDraftPreview(JSON.stringify({
      version: 'v2',
      updatedAtISO: '2026-05-28T12:00:00.000Z',
      sections: [{ id: 'broken' }],
    }));

    expect(preview.state).toBe('invalid');
    if (preview.state !== 'invalid') return;
    expect(preview.error).toContain('usable sections');
  });
});
