import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('previewPhotoManifestService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and normalizes preview photo manifest entries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        items: [
          { url: '/preview-photos/a.jpg', bucket: 'engagement', orientation: 'portrait' },
          { url: '/preview-photos/b.jpg' },
          { bucket: 'root', orientation: 'landscape' },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { loadPreviewPhotoManifest } = await import('./previewPhotoManifestService');
    await expect(loadPreviewPhotoManifest()).resolves.toEqual([
      { url: '/preview-photos/a.jpg', bucket: 'engagement', orientation: 'portrait' },
      { url: '/preview-photos/b.jpg', bucket: 'root', orientation: 'landscape' },
    ]);

    expect(fetchMock).toHaveBeenCalledWith('/preview-photos/manifest.json', { cache: 'no-store' });
  });
});
