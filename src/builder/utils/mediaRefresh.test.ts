import { describe, expect, it } from 'vitest';
import { mergeMediaAssetsAfterUploadRefresh } from './mediaRefresh';
import type { BuilderMediaAsset } from '../../types/builder/media';

function makeAsset(id: string, updatedAtISO: string, overrides: Partial<BuilderMediaAsset> = {}): BuilderMediaAsset {
  return {
    id,
    weddingId: 'w1',
    filename: `${id}.jpg`,
    originalFilename: `${id}.jpg`,
    mimeType: 'image/jpeg',
    assetType: 'image',
    status: 'ready',
    url: `https://example.com/${id}.jpg`,
    sizeBytes: 1234,
    tags: [],
    attachedSectionIds: [],
    meta: {
      uploadedAtISO: updatedAtISO,
      updatedAtISO,
    },
    ...overrides,
  };
}

describe('mergeMediaAssetsAfterUploadRefresh', () => {
  it('keeps optimistic uploaded assets when the immediate refresh is stale', () => {
    const existing = [
      makeAsset('new-upload', '2026-04-22T22:00:00.000Z'),
      makeAsset('older', '2026-04-22T21:00:00.000Z'),
    ];

    const merged = mergeMediaAssetsAfterUploadRefresh(existing, [], 1);

    expect(merged.map((asset) => asset.id)).toEqual(['new-upload', 'older']);
  });

  it('prefers fresh server truth for matching assets while keeping any missing optimistic uploads', () => {
    const existing = [
      makeAsset('new-upload', '2026-04-22T22:00:00.000Z', { caption: 'optimistic caption' }),
      makeAsset('older', '2026-04-22T21:00:00.000Z'),
    ];

    const fresh = [
      makeAsset('older', '2026-04-22T21:30:00.000Z', { caption: 'server caption' }),
    ];

    const merged = mergeMediaAssetsAfterUploadRefresh(existing, fresh, 1);

    expect(merged.map((asset) => asset.id)).toEqual(['new-upload', 'older']);
    expect(merged.find((asset) => asset.id === 'older')?.caption).toBe('server caption');
    expect(merged.find((asset) => asset.id === 'new-upload')?.caption).toBe('optimistic caption');
  });

  it('returns fresh assets unchanged when no uploads just happened', () => {
    const existing = [makeAsset('stale-local', '2026-04-22T22:00:00.000Z')];
    const fresh = [makeAsset('server-only', '2026-04-22T23:00:00.000Z')];

    const merged = mergeMediaAssetsAfterUploadRefresh(existing, fresh, 0);

    expect(merged.map((asset) => asset.id)).toEqual(['server-only']);
  });
});
