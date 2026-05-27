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

    let uploaded: { url: string; path: string };
    try {
      uploaded = await mediaRepository.upload(weddingId, file, onProgress);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown storage error';
      throw new Error(`Upload to storage failed: ${message}`);
    }

    try {
      const asset = await mediaRepository.save({
        weddingId,
        filename: uploaded.path.split('/').pop() ?? file.name,
        originalFilename: file.name,
        mimeType: file.type,
        assetType,
        status: 'ready',
        url: uploaded.url,
        thumbnailUrl: assetType === 'image' ? uploaded.url : undefined,
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown database error';
      const assetLabel = assetType === 'image' ? 'Photo' : assetType === 'video' ? 'Video' : 'Document';
      throw new Error(`${assetLabel} uploaded, but saving it to your media library failed: ${message}`);
    }
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

  async detachAssetFromSection(assetId: string, sectionId: string): Promise<void> {
    return mediaRepository.detachFromSection(assetId, sectionId);
  },
};
