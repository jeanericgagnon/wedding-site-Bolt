import { BuilderMediaAsset, MediaUploadOptions } from '../../types/builder/media';
import { mediaRepository } from './mediaRepository';

export const mediaService = {
  async uploadAsset(
    weddingId: string,
    file: File,
    options: MediaUploadOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<BuilderMediaAsset> {
    const assetType = file.type.startsWith('video/')
      ? 'video'
      : file.type.startsWith('image/')
      ? 'image'
      : 'document';

    const { url, path } = await mediaRepository.upload(weddingId, file, onProgress);

    const asset = await mediaRepository.save({
      weddingId,
      filename: path.split('/').pop() ?? file.name,
      originalFilename: file.name,
      mimeType: file.type,
      assetType,
      status: 'ready',
      url,
      thumbnailUrl: assetType === 'image' ? url : undefined,
      sizeBytes: file.size,
      altText: options.altText,
      caption: options.caption,
      tags: options.tags ?? [],
      attachedSectionIds: options.attachToSectionId ? [options.attachToSectionId] : [],
      meta: {
        uploadedAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
      },
    });

    return asset;
  },

  async listAssets(weddingId: string): Promise<BuilderMediaAsset[]> {
    return mediaRepository.list(weddingId);
  },

  async deleteAsset(assetId: string): Promise<void> {
    return mediaRepository.delete(assetId);
  },

  async attachAssetToSection(assetId: string, sectionId: string): Promise<void> {
    return mediaRepository.attachToSection(assetId, sectionId);
  },
};
