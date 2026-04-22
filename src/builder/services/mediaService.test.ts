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

  it('persists the target section link when an upload starts from a section picker', async () => {
    const file = new File(['img'], 'flowers.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/flowers.jpg',
      path: 'w1/flowers.jpg',
    });
    save.mockResolvedValue({ id: 'asset-3' });

    await mediaService.uploadAsset('w1', file, { attachToSectionId: 'section-hero' });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      attachedSectionIds: ['section-hero'],
    }));
  });

  it('stores provided media tags without dropping them during save', async () => {
    const file = new File(['img'], 'tablescape.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/tablescape.jpg',
      path: 'w1/tablescape.jpg',
    });
    save.mockResolvedValue({ id: 'asset-4' });

    await mediaService.uploadAsset('w1', file, { tags: ['hero', 'floral'] });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      tags: ['hero', 'floral'],
    }));
  });

  it('defaults missing media tags to an empty list for save consistency', async () => {
    const file = new File(['img'], 'arch.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/arch.jpg',
      path: 'w1/arch.jpg',
    });
    save.mockResolvedValue({ id: 'asset-5' });

    await mediaService.uploadAsset('w1', file);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      tags: [],
    }));
  });

  it('stores provided captions without dropping them during save', async () => {
    const file = new File(['img'], 'vows.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/vows.jpg',
      path: 'w1/vows.jpg',
    });
    save.mockResolvedValue({ id: 'asset-6' });

    await mediaService.uploadAsset('w1', file, { caption: 'Private vows under the trees' });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      caption: 'Private vows under the trees',
    }));
  });
});
