import { describe, expect, it } from 'vitest';

import {
  canRepairBuilderV2SectionStructure,
  repairBuilderV2SectionStructure,
} from './builderV2StructureRepair';

describe('builderV2StructureRepair', () => {
  it('marks supported section types as repairable', () => {
    expect(canRepairBuilderV2SectionStructure('menu')).toBe(true);
    expect(canRepairBuilderV2SectionStructure('music')).toBe(true);
    expect(canRepairBuilderV2SectionStructure('video')).toBe(true);
    expect(canRepairBuilderV2SectionStructure('contact')).toBe(false);
  });

  it('re-keys menu headings and items into consistent course groups', () => {
    const result = repairBuilderV2SectionStructure('menu', [
      { id: 'course-a', type: 'title', content: '', data: { text: 'Dinner' } },
      { id: 'item-a', type: 'travelTip', content: '', data: { title: 'Risotto' } },
      { id: 'course-b', type: 'title', content: '', data: { text: 'Dessert', subtitle: 'course:old' } },
      { id: 'item-b', type: 'travelTip', content: '', data: { title: 'Cake', subtitle: 'course:old' } },
    ]);

    expect(result.changedCount).toBe(4);
    expect(result.blocks.map((block) => (block.data as { subtitle?: string } | undefined)?.subtitle)).toEqual([
      'course:course-1',
      'course:course-1',
      'course:course-2',
      'course:course-2',
    ]);
  });

  it('re-keys music links and tracks into consistent playlist groups', () => {
    const result = repairBuilderV2SectionStructure('music', [
      { id: 'playlist-a', type: 'title', content: '', data: { text: 'Ceremony' } },
      { id: 'spotify-link', type: 'travelTip', content: '', data: { title: 'Spotify', url: 'https://open.spotify.com/test' } },
      { id: 'track-a', type: 'travelTip', content: '', data: { title: 'Bloom', note: 'The Paper Kites' } },
    ]);

    expect(result.blocks.map((block) => (block.data as { subtitle?: string } | undefined)?.subtitle)).toEqual([
      'playlist:playlist-1',
      'playlist-link:playlist-1',
      'playlist-track:playlist-1',
    ]);
  });

  it('re-keys video thumbnails and links into consistent pairs', () => {
    const result = repairBuilderV2SectionStructure('video', [
      { id: 'thumb-a', type: 'photo', content: '', data: { title: 'Save the Date', imageUrl: 'https://example.com/thumb.jpg' } },
      { id: 'link-a', type: 'travelTip', content: '', data: { title: 'Watch', url: 'https://youtu.be/test' } },
    ]);

    expect(result.blocks.map((block) => (block.data as { subtitle?: string } | undefined)?.subtitle)).toEqual([
      'video:video-1',
      'video:video-1',
    ]);
  });

  it('returns a calm message when repair is unsupported', () => {
    const result = repairBuilderV2SectionStructure('contact', []);
    expect(result.changedCount).toBe(0);
    expect(result.summary).toContain('no safe automatic structure repair');
  });
});
