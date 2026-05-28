import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetGrid } from './MediaLibraryPanel';
import { getMediaLibrarySummary } from './mediaLibrarySummary';
import type { BuilderMediaAsset } from '../../types/builder/media';

const dispatchMock = vi.fn();
const deleteAssetMock = vi.fn();

vi.mock('../state/builderStore', () => ({
  useBuilderContext: () => ({
    dispatch: dispatchMock,
    state: {},
  }),
}));

vi.mock('../services/mediaService', () => ({
  mediaService: {
    deleteAsset: (...args: unknown[]) => deleteAssetMock(...args),
  },
}));

vi.mock('../state/builderActions', () => ({
  builderActions: {
    setError: (message: string) => ({ type: 'builder/setError', payload: message }),
    removeMediaAsset: (assetId: string) => ({ type: 'builder/removeMediaAsset', payload: assetId }),
  },
}));

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

describe('AssetGrid', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    deleteAssetMock.mockReset();
  });

  it('keeps media deletion failures behind builder-safe copy', async () => {
    deleteAssetMock.mockRejectedValueOnce(new Error('storage bucket token expired while deleting media'));

    render(
      <AssetGrid
        assets={[makeAsset({ id: 'asset-delete', originalFilename: 'hero-photo.jpg' })]}
        uploadQueue={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));

    await waitFor(() => {
      expect(deleteAssetMock).toHaveBeenCalledWith('asset-delete');
      expect(dispatchMock).toHaveBeenCalledWith({
        type: 'builder/setError',
        payload: 'Could not remove that photo right now. Please try again.',
      });
    });
  });
});
