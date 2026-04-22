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

  it('surfaces storage upload failures before any media row is saved', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    upload.mockRejectedValue(new Error('bucket offline'));

    await expect(mediaService.uploadAsset('w1', file)).rejects.toThrow(
      'Upload to storage failed: bucket offline',
    );
    expect(save).not.toHaveBeenCalled();
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

  it('stores video uploads without pretending they have image thumbnails', async () => {
    const file = new File(['video'], 'toast.mp4', { type: 'video/mp4' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/toast.mp4',
      path: 'w1/toast.mp4',
    });
    save.mockResolvedValue({ id: 'asset-2' });

    await mediaService.uploadAsset('w1', file);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      assetType: 'video',
      thumbnailUrl: undefined,
    }));
  });
});
