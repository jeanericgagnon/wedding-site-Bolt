import { describe, expect, it } from 'vitest';
import { getMediaLibrarySummary } from './mediaLibrarySummary';
import type { BuilderMediaAsset } from '../../types/builder/media';

function makeAsset(overrides: Partial<BuilderMediaAsset>): BuilderMediaAsset {
  return {
    id: overrides.id ?? 'asset-1',
    weddingId: overrides.weddingId ?? 'wed-1',
    filename: overrides.filename ?? 'photo.jpg',
    originalFilename: overrides.originalFilename ?? 'photo.jpg',
    mimeType: overrides.mimeType ?? 'image/jpeg',
    assetType: overrides.assetType ?? 'image',
    status: overrides.status ?? 'ready',
    url: overrides.url ?? '/photo.jpg',
    thumbnailUrl: overrides.thumbnailUrl,
    width: overrides.width,
    height: overrides.height,
    sizeBytes: overrides.sizeBytes ?? 1024,
    altText: overrides.altText,
    caption: overrides.caption,
    tags: overrides.tags ?? [],
    attachedSectionIds: overrides.attachedSectionIds ?? [],
    meta: overrides.meta ?? {
      uploadedAtISO: '2026-05-27T00:00:00.000Z',
      updatedAtISO: '2026-05-27T00:00:00.000Z',
    },
  };
}

describe('getMediaLibrarySummary', () => {
  it('counts used and unused assets and sorts attached assets first', () => {
    const assets = [
      makeAsset({
        id: 'unused',
        originalFilename: 'flowers.jpg',
        meta: { uploadedAtISO: '2026-05-27T00:00:00.000Z', updatedAtISO: '2026-05-27T00:00:00.000Z' },
      }),
      makeAsset({
        id: 'used',
        originalFilename: 'hero.jpg',
        attachedSectionIds: ['hero-1'],
        meta: { uploadedAtISO: '2026-05-27T00:00:00.000Z', updatedAtISO: '2026-05-28T00:00:00.000Z' },
      }),
    ];

    const summary = getMediaLibrarySummary(assets, 'all', '');

    expect(summary.totalAssets).toBe(2);
    expect(summary.usedAssets).toBe(1);
    expect(summary.unusedAssets).toBe(1);
    expect(summary.filteredAssets.map((asset) => asset.id)).toEqual(['used', 'unused']);
    expect(summary.bestNextMove).toContain('strongest reusable asset');
  });

  it('filters by unused assets and matches search across caption and tags', () => {
    const assets = [
      makeAsset({
        id: 'used',
        caption: 'Ceremony aisle',
        attachedSectionIds: ['schedule-1'],
        tags: ['ceremony'],
      }),
      makeAsset({
        id: 'unused',
        caption: 'Sunset portrait',
        tags: ['golden-hour'],
      }),
    ];

    const summary = getMediaLibrarySummary(assets, 'unused', 'golden', {
      isPickerMode: true,
      pickerTargetLabel: 'Gallery',
    });

    expect(summary.filteredAssets.map((asset) => asset.id)).toEqual(['unused']);
    expect(summary.focusTitle).toContain('Gallery');
  });
});
