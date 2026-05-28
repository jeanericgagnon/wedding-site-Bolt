import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upload, save, list, remove, attachToSection, detachFromSection } = vi.hoisted(() => ({
  upload: vi.fn(),
  save: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  attachToSection: vi.fn(),
  detachFromSection: vi.fn(),
}));

vi.mock('./mediaRepository', () => ({
  mediaRepository: {
    upload,
    save,
    list,
    delete: remove,
    attachToSection,
    detachFromSection,
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
      'Your document uploaded, but we could not add it to the media library yet. Please try again.',
    );
  });

  it('surfaces storage upload failures before any media row is saved', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
    upload.mockRejectedValue(new Error('bucket offline'));

    await expect(mediaService.uploadAsset('w1', file)).rejects.toThrow(
      'Photo upload failed. Please try again.',
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

  it('preserves the original filename even when storage renames the uploaded asset', async () => {
    const file = new File(['img'], 'original-name.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/renamed.jpg',
      path: 'w1/renamed.jpg',
    });
    save.mockResolvedValue({ id: 'asset-7' });

    await mediaService.uploadAsset('w1', file);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'renamed.jpg',
      originalFilename: 'original-name.jpg',
    }));
  });

  it('stores document uploads without pretending they have thumbnails', async () => {
    const file = new File(['doc'], 'menu.pdf', { type: 'application/pdf' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/menu.pdf',
      path: 'w1/menu.pdf',
    });
    save.mockResolvedValue({ id: 'asset-8' });

    await mediaService.uploadAsset('w1', file);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      assetType: 'document',
      thumbnailUrl: undefined,
    }));
  });

  it('keeps document alt text when provided for accessibility truth', async () => {
    const file = new File(['doc'], 'schedule.pdf', { type: 'application/pdf' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/schedule.pdf',
      path: 'w1/schedule.pdf',
    });
    save.mockResolvedValue({ id: 'asset-9' });

    await mediaService.uploadAsset('w1', file, { altText: 'Weekend schedule PDF' });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      altText: 'Weekend schedule PDF',
    }));
  });

  it('defaults attached section ids to an empty list when upload is not section-scoped', async () => {
    const file = new File(['img'], 'centerpiece.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/centerpiece.jpg',
      path: 'w1/centerpiece.jpg',
    });
    save.mockResolvedValue({ id: 'asset-10' });

    await mediaService.uploadAsset('w1', file);

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      attachedSectionIds: [],
    }));
  });

  it('keeps section attachment truth alongside tags when both are provided', async () => {
    const file = new File(['img'], 'escort-wall.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/escort-wall.jpg',
      path: 'w1/escort-wall.jpg',
    });
    save.mockResolvedValue({ id: 'asset-11' });

    await mediaService.uploadAsset('w1', file, {
      attachToSectionId: 'section-gallery',
      tags: ['decor'],
    });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      attachedSectionIds: ['section-gallery'],
      tags: ['decor'],
    }));
  });

  it('keeps caption truth alongside section attachment when both are provided', async () => {
    const file = new File(['img'], 'aisle.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/aisle.jpg',
      path: 'w1/aisle.jpg',
    });
    save.mockResolvedValue({ id: 'asset-12' });

    await mediaService.uploadAsset('w1', file, {
      attachToSectionId: 'section-hero',
      caption: 'Ceremony aisle',
    });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      attachedSectionIds: ['section-hero'],
      caption: 'Ceremony aisle',
    }));
  });

  it('keeps alt text truth alongside section attachment when both are provided', async () => {
    const file = new File(['img'], 'seating-chart.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/seating-chart.jpg',
      path: 'w1/seating-chart.jpg',
    });
    save.mockResolvedValue({ id: 'asset-13' });

    await mediaService.uploadAsset('w1', file, {
      attachToSectionId: 'section-details',
      altText: 'Seating chart display',
    });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      attachedSectionIds: ['section-details'],
      altText: 'Seating chart display',
    }));
  });

  it('forwards explicit media detach requests to the repository', async () => {
    await mediaService.detachAssetFromSection('asset-14', 'section-hero');

    expect(detachFromSection).toHaveBeenCalledWith('asset-14', 'section-hero');
  });

  it('keeps original filename truth alongside section attachment when both are provided', async () => {
    const file = new File(['img'], 'welcome-sign.jpg', { type: 'image/jpeg' });
    upload.mockResolvedValue({
      url: 'https://cdn.example.com/renamed-welcome.jpg',
      path: 'w1/renamed-welcome.jpg',
    });
    save.mockResolvedValue({ id: 'asset-14' });

    await mediaService.uploadAsset('w1', file, {
      attachToSectionId: 'section-welcome',
    });

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      attachedSectionIds: ['section-welcome'],
      filename: 'renamed-welcome.jpg',
      originalFilename: 'welcome-sign.jpg',
    }));
  });
});
