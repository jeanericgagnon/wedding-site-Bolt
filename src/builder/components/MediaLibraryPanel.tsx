import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Image, Trash2, Loader2, FolderOpen, Check } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { BuilderMediaAsset } from '../../types/builder/media';
import { BUILDER_SUPPORTED_IMAGE_TYPES, BUILDER_MAX_FILE_SIZE_MB } from '../constants/builderCapabilities';
import { mediaService } from '../services/mediaService';
import { generateBuilderId } from '../../types/builder/project';
import { getSectionManifest } from '../registry/sectionManifests';
import { markFieldAsUserEdited, readBuilderValue } from '../../lib/weddingProfile';
import { mergeMediaAssetsAfterUploadRefresh } from '../utils/mediaRefresh';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';

function safeMediaLibraryError(err: unknown, fallback = 'Please try again in a moment.'): string {
  return customerSafeErrorMessage(err, fallback);
}

function resolveImageSettingKey(sectionType: string): string {
  try {
    const manifest = getSectionManifest(sectionType as Parameters<typeof getSectionManifest>[0]);
    const imageField = manifest.settingsSchema.fields.find(f => f.type === 'image');
    return imageField?.key ?? 'imageUrl';
  } catch {
    return 'imageUrl';
  }
}

export const MediaLibraryPanel: React.FC = () => {
  const { state, dispatch } = useBuilderContext();
  const isPickerMode = !!state.mediaPickerTargetSectionId;

  if (!state.mediaLibraryOpen) return null;

  const handleSelectAsset = (asset: BuilderMediaAsset) => {
    if (!isPickerMode || !state.mediaPickerTargetSectionId || !state.activePageId) return;
    const sectionId = state.mediaPickerTargetSectionId;
    const pageId = state.activePageId;
    const activePage = state.project?.pages.find(p => p.id === pageId);
    const section = activePage?.sections.find(s => s.id === sectionId);
    if (!section) return;

    const nextBindings = asset.id
      ? {
          ...section.bindings,
          mediaAssetIds: Array.from(new Set([...(section.bindings.mediaAssetIds ?? []), asset.id])),
        }
      : section.bindings;

    if (state.mediaPickerTargetField === 'sideImage') {
      dispatch(builderActions.updateSection(pageId, sectionId, {
        bindings: nextBindings,
        styleOverrides: { ...section.styleOverrides, sideImage: asset.url },
      }));
    } else if (state.mediaPickerTargetField === 'customBlock' && state.mediaPickerTargetBlockPath) {
      const { blockId, columnIndex, columnBlockId } = state.mediaPickerTargetBlockPath;
      dispatch(builderActions.updateSection(pageId, sectionId, {
        bindings: nextBindings,
      }));
      dispatch(builderActions.updateCustomBlock(pageId, sectionId, blockId, { imageUrl: asset.url }, columnIndex, columnBlockId));
    } else if (state.mediaPickerTargetField === 'imageArray' && state.mediaPickerTargetImageIndex !== null) {
      const unwrappedImages = readBuilderValue<unknown>(section.settings.images, []);
      const imageList = Array.isArray(unwrappedImages) ? unwrappedImages as Array<Record<string, unknown>> : [];
      const images = imageList.slice();
      const idx = state.mediaPickerTargetImageIndex;
      if (idx < images.length) {
        images[idx] = { ...images[idx], url: asset.url };
      } else {
        images.push({ id: String(Date.now()), url: asset.url, alt: '', caption: '' });
      }
      const { images: _removed, ...restSettings } = section.settings as Record<string, unknown>;
      dispatch(builderActions.updateSection(pageId, sectionId, {
        bindings: nextBindings,
        settings: { ...restSettings, images: markFieldAsUserEdited(images) },
      }));
    } else {
      const imageKey = state.mediaPickerTargetSettingKey || resolveImageSettingKey(section.type);
      dispatch(builderActions.updateSection(pageId, sectionId, {
        bindings: nextBindings,
        settings: { ...section.settings, [imageKey]: asset.url },
      }));
    }

    if (asset.id) {
      void mediaService.attachAssetToSection(asset.id, sectionId).catch(() => {
        dispatch(builderActions.setError('Image selected. It may take a moment to appear with this section in the media library.'));
      });
    }

    dispatch(builderActions.closeMediaLibrary());
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => dispatch(builderActions.closeMediaLibrary())}
      />
      <div className="relative ml-auto w-full max-w-3xl bg-white h-full flex flex-col shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isPickerMode ? 'Choose an image' : 'Media library'}
            </h2>
            <p className="text-sm text-gray-500">
              {isPickerMode
                ? 'Upload a photo or choose one you already added.'
                : 'Upload and organize the photos and image assets used across your website.'}
            </p>
          </div>
          <button
            onClick={() => dispatch(builderActions.closeMediaLibrary())}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close media library"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <UploadDropArea weddingId={state.project?.weddingId ?? ''} />
          <AssetGrid
            assets={state.mediaAssets}
            uploadQueue={state.uploadQueue}
            isPickerMode={isPickerMode}
            onSelectAsset={isPickerMode ? handleSelectAsset : undefined}
          />
        </div>
      </div>
    </div>
  );
};

interface UploadDropAreaProps {
  weddingId: string;
}

export const UploadDropArea: React.FC<UploadDropAreaProps> = ({ weddingId }) => {
  const { state, dispatch } = useBuilderContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    if (!weddingId) {
      setUploadErrors(['Upload is not ready yet because the wedding project is still loading.']);
      return;
    }

    const maxBytes = BUILDER_MAX_FILE_SIZE_MB * 1024 * 1024;
    const errors: string[] = [];

    const valid = Array.from(files).filter(f => {
      if (!BUILDER_SUPPORTED_IMAGE_TYPES.includes(f.type)) {
        errors.push(`${f.name}: use JPEG, PNG, or WebP.`);
        return false;
      }
      if (f.size > maxBytes) {
        errors.push(`${f.name}: this photo is ${(f.size / 1024 / 1024).toFixed(1)}MB. Keep it under ${BUILDER_MAX_FILE_SIZE_MB}MB.`);
        return false;
      }
      return true;
    });

    setUploadErrors(errors);
    if (valid.length === 0) return;

    let uploadedCount = 0;

    await Promise.all(valid.map(async file => {
      const tempId = generateBuilderId();
      dispatch({
        type: 'UPDATE_UPLOAD_QUEUE',
        payload: { assetId: tempId, filename: file.name, progress: 0, status: 'uploading' },
      });

      try {
        const asset = await mediaService.uploadAsset(
          weddingId,
          file,
          {},
          progress => {
            dispatch({
              type: 'UPDATE_UPLOAD_QUEUE',
              payload: { assetId: tempId, filename: file.name, progress, status: 'uploading' },
            });
          }
        );
        dispatch(builderActions.addMediaAsset(asset));
        dispatch({ type: 'REMOVE_FROM_UPLOAD_QUEUE', payload: tempId });
        uploadedCount += 1;
      } catch (err) {
        const message =
          err instanceof Error ? safeMediaLibraryError(err)
          : typeof (err as { message?: string })?.message === 'string' ? safeMediaLibraryError(err)
          : 'Couldn’t upload that file. Please try again.';
        dispatch({
          type: 'UPDATE_UPLOAD_QUEUE',
          payload: { assetId: tempId, filename: file.name, progress: 0, status: 'error', error: message },
        });
      }
    }));

    try {
      const freshAssets = await mediaService.listAssets(weddingId);
      const mergedAssets = mergeMediaAssetsAfterUploadRefresh(state.mediaAssets, freshAssets, uploadedCount);
      dispatch(builderActions.setMediaAssets(mergedAssets));
      if (uploadedCount > 0 && freshAssets.length === 0) {
        dispatch(builderActions.setError('Your photo upload finished, but the media library refresh was stale. Your uploaded photo is being kept locally until the library catches up.'));
      }
    } catch (err) {
      if (uploadedCount > 0) {
        const message = safeMediaLibraryError(err);
        dispatch(builderActions.setError(`Your photo was added. The library just needs a refresh. ${message}`));
      }
      // Keep optimistic local assets if refresh fails.
    }
  }, [weddingId, state.mediaAssets, dispatch]);

  return (
    <div className="px-6 pt-4 pb-2">
      {uploadErrors.length > 0 && (
        <div className="mb-3 space-y-1">
          {uploadErrors.map((err, i) => (
            <p key={i} className="text-xs text-[var(--color-accent)]">{err}</p>
          ))}
        </div>
      )}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragOver ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Upload size={24} className={`mx-auto mb-3 ${isDragOver ? 'text-[var(--color-accent)]' : 'text-gray-400'}`} />
        <p className="text-sm font-medium text-gray-700">Drop photos here or click to add them</p>
        <p className="text-xs text-gray-400 mt-1">
          JPEG, PNG, WebP up to {BUILDER_MAX_FILE_SIZE_MB}MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={BUILDER_SUPPORTED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>
    </div>
  );
};

interface AssetGridProps {
  assets: BuilderMediaAsset[];
  uploadQueue: Array<{ assetId: string; filename?: string; progress: number; status: string; error?: string }>;
  isPickerMode?: boolean;
  onSelectAsset?: (asset: BuilderMediaAsset) => void;
}

export const AssetGrid: React.FC<AssetGridProps> = ({ assets, uploadQueue, isPickerMode, onSelectAsset }) => {
  const { dispatch } = useBuilderContext();

  const handleDelete = async (asset: BuilderMediaAsset) => {
    try {
      await mediaService.deleteAsset(asset.id);
      dispatch(builderActions.removeMediaAsset(asset.id));
    } catch {
      dispatch(builderActions.setError('Couldn’t remove image. Please try again.'));
    }
  };

  return (
    <div className="flex-1 px-6 pb-6 pt-4">
      {uploadQueue.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500">Uploads in progress</p>
          {uploadQueue.map(item => (
            <div key={item.assetId} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
              {item.status === 'error' ? (
                <span className="text-[var(--color-accent)] text-xs flex-shrink-0">Needs retry</span>
              ) : (
                <Loader2 size={14} className="animate-spin text-[var(--color-accent)] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{item.filename}</p>
                {item.status === 'error' ? (
                  <p className="text-xs text-[var(--color-accent)] mt-0.5">{item.error ?? 'Upload needs retry'}</p>
                ) : (
                  <div className="mt-1 h-1 overflow-hidden rounded-sm bg-gray-200">
                    <div
                      className="h-full rounded-sm bg-[var(--color-accent)] transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {assets.length === 0 && uploadQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen size={32} className="text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No photos yet</p>
          <p className="text-xs text-gray-400 mt-1">Add your first photos to start using them across the site.</p>
        </div>
      ) : (
        <>
          {isPickerMode && (
            <p className="text-xs text-gray-500 mb-3">Click an image to use it here.</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            {assets.map(asset => (
              <AssetTile
                key={asset.id}
                asset={asset}
                onDelete={() => handleDelete(asset)}
                isPickerMode={isPickerMode}
                onSelect={onSelectAsset ? () => onSelectAsset(asset) : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface AssetTileProps {
  asset: BuilderMediaAsset;
  onDelete: () => void;
  isPickerMode?: boolean;
  onSelect?: () => void;
}

const AssetTile: React.FC<AssetTileProps> = ({ asset, onDelete, isPickerMode, onSelect }) => {
  const primarySrc = asset.thumbnailUrl ?? asset.url;
  const [src, setSrc] = useState(primarySrc);
  const [failed, setFailed] = useState(false);

  React.useEffect(() => {
    setSrc(primarySrc);
    setFailed(false);
  }, [primarySrc, asset.id]);

  return (
  <div
    className={`group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 ${
      isPickerMode ? 'cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)]' : ''
    }`}
    onClick={isPickerMode ? onSelect : undefined}
  >
    {asset.assetType === 'image' ? (
      failed ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-2">
          <Image size={20} className="text-gray-400 mb-1" />
          <p className="text-[10px] text-gray-500 leading-tight">Preview not available</p>
        </div>
      ) : (
      <img
        src={src}
        alt={asset.altText ?? asset.originalFilename}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => {
          if (src !== asset.url && asset.url) {
            setSrc(asset.url);
            return;
          }
          setFailed(true);
        }}
      />
      )
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <Image size={24} className="text-gray-400" />
      </div>
    )}

    {isPickerMode ? (
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="rounded-xl bg-[var(--color-accent)] p-1.5 text-white">
          <Check size={14} />
        </div>
      </div>
    ) : (
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 bg-white rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] shadow-sm transition-colors"
          aria-label="Remove image"
        >
          <Trash2 size={12} />
        </button>
      </div>
    )}

    {asset.attachedSectionIds.length > 0 && !isPickerMode && (
      <div className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-xl bg-[var(--color-accent)] text-[9px] font-bold text-white">
        {asset.attachedSectionIds.length}
      </div>
    )}
  </div>
  );
};
