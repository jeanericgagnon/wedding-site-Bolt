import { describe, expect, it } from 'vitest';

import type { BuilderMediaAsset } from '../../types/builder/media';
import type { BuilderSectionInstance } from '../../types/builder/section';
import {
  getNextSectionMediaAssetIds,
  getTargetAssetIdsForSection,
  syncAssetSectionLinksLocally,
} from './mediaSelectionState';

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
    sizeBytes: overrides.sizeBytes ?? 1024,
    tags: overrides.tags ?? [],
    attachedSectionIds: overrides.attachedSectionIds ?? [],
    meta: overrides.meta ?? {
      uploadedAtISO: '2026-05-27T00:00:00.000Z',
      updatedAtISO: '2026-05-27T00:00:00.000Z',
    },
  };
}

function makeSection(overrides?: Partial<BuilderSectionInstance>): BuilderSectionInstance {
  return {
    id: overrides?.id ?? 'section-1',
    type: overrides?.type ?? 'hero',
    variant: overrides?.variant ?? 'default',
    enabled: overrides?.enabled ?? true,
    locked: overrides?.locked ?? false,
    orderIndex: overrides?.orderIndex ?? 0,
    settings: overrides?.settings ?? {},
    bindings: overrides?.bindings ?? {},
    styleOverrides: overrides?.styleOverrides ?? {},
    meta: overrides?.meta ?? {
      createdAtISO: '2026-05-27T00:00:00.000Z',
      updatedAtISO: '2026-05-27T00:00:00.000Z',
    },
  };
}

describe('mediaSelectionState', () => {
  it('finds the currently targeted settings asset by URL', () => {
    const section = makeSection({
      settings: { imageUrl: 'https://cdn.example.com/old.jpg' },
    });
    const assets = [
      makeAsset({ id: 'old-asset', url: 'https://cdn.example.com/old.jpg' }),
      makeAsset({ id: 'new-asset', url: 'https://cdn.example.com/new.jpg' }),
    ];

    expect(getTargetAssetIdsForSection(section, {
      targetField: 'settings',
      targetSettingKey: 'imageUrl',
    }, assets)).toEqual(['old-asset']);
  });

  it('replaces stale target-bound asset ids instead of only appending new ones', () => {
    expect(getNextSectionMediaAssetIds({
      currentBindingIds: ['hero-old', 'gallery-keep'],
      previousTargetAssetIds: ['hero-old'],
      selectedAssetId: 'hero-new',
    })).toEqual(['gallery-keep', 'hero-new']);
  });

  it('keeps local attached-section truth aligned after replacement', () => {
    const assets = [
      makeAsset({ id: 'hero-old', attachedSectionIds: ['section-1'] }),
      makeAsset({ id: 'hero-new', attachedSectionIds: [] }),
      makeAsset({ id: 'gallery-keep', attachedSectionIds: ['section-1'] }),
    ];

    const updated = syncAssetSectionLinksLocally({
      assets,
      sectionId: 'section-1',
      selectedAssetId: 'hero-new',
      detachedAssetIds: ['hero-old'],
    });

    expect(updated.find((asset) => asset.id === 'hero-old')?.attachedSectionIds).toEqual([]);
    expect(updated.find((asset) => asset.id === 'hero-new')?.attachedSectionIds).toEqual(['section-1']);
    expect(updated.find((asset) => asset.id === 'gallery-keep')?.attachedSectionIds).toEqual(['section-1']);
  });
});
