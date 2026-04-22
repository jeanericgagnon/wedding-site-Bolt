import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upload, save, list, remove, attachToSection } = vi.hoisted(() => ({
  upload: vi.fn(),
  save: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  attachToSection: vi.fn(),
}));

vi.mock('./mediaRepository', () => ({
  mediaRepository: {
    upload,
    save,
    list,
    delete: remove,
    attachToSection,
  },
}));

import { mediaService } from './mediaService';

describe('mediaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces asset-type-specific save failures after storage upload succeeds', async () => {
    const file = new File(['pdf'], 'timeline.pdf', { type: 'application/pdf' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/timeline.pdf',
      path: 'w1/timeline.pdf',
    });
    save.mockRejectedValue(new Error('row insert failed'));

    await expect(mediaService.uploadAsset('w1', file)).rejects.toThrow(
      'Document uploaded, but saving it to your media library failed: row insert failed',
    );
  });

  it('stores image uploads with image asset metadata', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/photo.jpg',
      path: 'w1/photo.jpg',
    });
    save.mockResolvedValue({ id: 'asset-1' });

    await mediaService.uploadAsset('w1', file, { altText: 'Couple portrait' });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      assetType: 'image',
      thumbnailUrl: 'https://cdn.example.com/photo.jpg',
      altText: 'Couple portrait',
    }));
  });
});
