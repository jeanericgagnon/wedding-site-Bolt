export type MediaAssetType = 'image' | 'video' | 'document';
export type MediaAssetStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface BuilderMediaAsset {
  id: string;
  weddingId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  assetType: MediaAssetType;
  status: MediaAssetStatus;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  altText?: string;
  caption?: string;
  tags: string[];
  attachedSectionIds: string[];
  meta: {
    uploadedAtISO: string;
    updatedAtISO: string;
  };
}

export interface MediaUploadProgress {
  assetId: string;
  filename: string;
  progress: number;
  status: MediaAssetStatus;
  error?: string;
}

export interface MediaLibraryFilter {
  type?: MediaAssetType;
  tag?: string;
  search?: string;
}

export interface MediaUploadOptions {
  altText?: string;
  caption?: string;
  tags?: string[];
  attachToSectionId?: string;
}
