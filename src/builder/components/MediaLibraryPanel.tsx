import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Image, Trash2, Loader2, FolderOpen, Check, Search, Images, Link2, Unlink, LucideIcon } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { BuilderMediaAsset } from '../../types/builder/media';
import { BUILDER_SUPPORTED_IMAGE_TYPES, BUILDER_MAX_FILE_SIZE_MB } from '../constants/builderCapabilities';
import { mediaService } from '../services/mediaService';
import { generateBuilderId } from '../../types/builder/project';
import { getSectionManifest } from '../registry/sectionManifests';
import { mergeMediaAssetsAfterUploadRefresh } from '../utils/mediaRefresh';
import { getMediaLibrarySummary, MediaLibraryFilterMode } from './mediaLibrarySummary';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<MediaLibraryFilterMode>('all');

  if (!state.mediaLibraryOpen) return null;

  const pickerTargetSection = state.mediaPickerTargetSectionId && state.activePageId
    ? state.project?.pages
        .find((page) => page.id === state.activePageId)
        ?.sections.find((section) => section.id === state.mediaPickerTargetSectionId)
    : null;
  const pickerTargetLabel = pickerTargetSection ? getSectionManifest(pickerTargetSection.type).label : null;
  const summary = getMediaLibrarySummary(state.mediaAssets, filterMode, searchTerm, {
    isPickerMode,
    pickerTargetLabel,
  });

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
      const images = ((section.settings.images ?? []) as Array<Record<string, unknown>>).slice();
      const idx = state.mediaPickerTargetImageIndex;
      if (idx < images.length) {
        images[idx] = { ...images[idx], url: asset.url };
      } else {
        images.push({ id: String(Date.now()), url: asset.url, alt: '', caption: '' });
      }
      dispatch(builderActions.updateSection(pageId, sectionId, {
        bindings: nextBindings,
        settings: { ...section.settings, images },
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
        dispatch(builderActions.setError('Image selected, but we could not link it back to this section in the media library.'));
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
      <div className="relative ml-auto w-full max-w-3xl bg-white h-full flex flex-col shadow-2xl">
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
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close media library"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <UploadDropArea weddingId={state.project?.weddingId ?? ''} />
          <div className="px-6 pt-2">
            {isPickerMode && pickerTargetLabel && (
              <div className="mb-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Image target</p>
                <p className="mt-1 text-sm font-medium text-rose-900">
                  Add this image to {pickerTargetLabel}
                </p>
                <p className="mt-1 text-xs text-rose-800">
                  Choose an image that supports the section first. You can still replace or crop it later.
                </p>
              </div>
            )}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">Main focus</p>
                  <p className="mt-1 text-sm font-medium text-sky-950">{summary.focusTitle}</p>
                  <p className="mt-1 text-xs text-sky-800">{summary.focusDetail}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Best next move</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{summary.bestNextMove}</p>
                  <p className="mt-2 text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">Decision rule:</span> {summary.decisionRule}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    <span className="font-semibold text-gray-900">Watchout:</span> {summary.watchout}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Current', detail: summary.currentStep },
                    { label: 'Next', detail: summary.nextStep },
                    { label: 'Then', detail: summary.thenStep },
                  ].map((step) => (
                    <div key={step.label} className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{step.label}</p>
                      <p className="mt-1 text-xs text-gray-600">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
              <SummaryCard
                label="All assets"
                value={summary.totalAssets}
                icon={Images}
              />
              <SummaryCard
                label="In use"
                value={summary.usedAssets}
                icon={Link2}
              />
              <SummaryCard
                label="Ready to place"
                value={summary.unusedAssets}
                icon={Unlink}
              />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:flex-row md:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <Search size={14} className="text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  placeholder="Search by filename, caption, alt text, or tag"
                />
              </label>
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
                {([
                  { id: 'all', label: 'All' },
                  { id: 'used', label: 'In use' },
                  { id: 'unused', label: 'Unused' },
                ] as const).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFilterMode(option.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      filterMode === option.id
                        ? 'bg-rose-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <AssetGrid
            assets={summary.filteredAssets}
            uploadQueue={state.uploadQueue}
            isPickerMode={isPickerMode}
            onSelectAsset={isPickerMode ? handleSelectAsset : undefined}
            hasActiveFilters={filterMode !== 'all' || searchTerm.trim().length > 0}
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
        errors.push(`${f.name}: unsupported type (${f.type || 'unknown'}). Use JPEG, PNG, or WebP.`);
        return false;
      }
      if (f.size > maxBytes) {
        errors.push(`${f.name}: file too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Limit is ${BUILDER_MAX_FILE_SIZE_MB}MB.`);
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
          err instanceof Error ? err.message
          : typeof (err as { message?: string })?.message === 'string' ? (err as { message: string }).message
          : 'Upload failed. Please try again.';
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
        const message = err instanceof Error ? err.message : 'Unknown refresh error';
        dispatch(builderActions.setError(`Your photo upload likely succeeded, but the media library failed to refresh: ${message}`));
      }
      // Keep optimistic local assets if refresh fails.
    }
  }, [weddingId, state.mediaAssets, dispatch]);

  return (
    <div className="px-6 pt-4 pb-2">
      {uploadErrors.length > 0 && (
        <div className="mb-3 space-y-1">
          {uploadErrors.map((err, i) => (
            <p key={i} className="text-xs text-red-500">{err}</p>
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
          isDragOver ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Upload size={24} className={`mx-auto mb-3 ${isDragOver ? 'text-rose-500' : 'text-gray-400'}`} />
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
  uploadQueue: Array<{ assetId: string; filename: string; progress: number; status: string; error?: string }>;
  isPickerMode?: boolean;
  onSelectAsset?: (asset: BuilderMediaAsset) => void;
  hasActiveFilters?: boolean;
}

export const AssetGrid: React.FC<AssetGridProps> = ({ assets, uploadQueue, isPickerMode, onSelectAsset, hasActiveFilters }) => {
  const { dispatch } = useBuilderContext();

  const handleDelete = async (asset: BuilderMediaAsset) => {
    try {
      await mediaService.deleteAsset(asset.id);
      dispatch(builderActions.removeMediaAsset(asset.id));
    } catch {
      dispatch(builderActions.setError('Failed to delete image. Please try again.'));
    }
  };

  return (
    <div className="flex-1 px-6 pb-6 pt-4">
      {uploadQueue.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploads in progress</p>
          {uploadQueue.map(item => (
            <div key={item.assetId} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
              {item.status === 'error' ? (
                <span className="text-red-500 text-xs flex-shrink-0">Failed</span>
              ) : (
                <Loader2 size={14} className="animate-spin text-rose-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{item.filename}</p>
                {item.status === 'error' ? (
                  <p className="text-xs text-red-500 mt-0.5">{item.error ?? 'Upload failed'}</p>
                ) : (
                  <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
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
          <p className="text-sm font-medium text-gray-500">
            {hasActiveFilters ? 'No matching images' : 'No photos yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {hasActiveFilters
              ? 'Try a different search or switch back to all assets.'
              : 'Add your first photos to start using them across the site.'}
          </p>
        </div>
      ) : (
        <>
          {isPickerMode && (
            <p className="text-xs text-gray-500 mb-3">Click an image to use it here.</p>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
    className={`group relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 ${
      isPickerMode ? 'cursor-pointer hover:ring-2 hover:ring-rose-400' : ''
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

    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-2 pb-2 pt-8">
      <p className="truncate text-[11px] font-medium text-white">
        {asset.caption?.trim() || asset.altText?.trim() || asset.originalFilename}
      </p>
      <p className="mt-0.5 text-[10px] text-white/80">
        {asset.attachedSectionIds.length > 0
          ? `${asset.attachedSectionIds.length} section${asset.attachedSectionIds.length === 1 ? '' : 's'} using this`
          : 'Not placed yet'}
      </p>
    </div>

    {isPickerMode ? (
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="bg-rose-500 text-white rounded-full p-1.5">
          <Check size={14} />
        </div>
      </div>
    ) : (
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 bg-white rounded-lg text-red-500 hover:text-red-700 shadow-sm transition-colors"
          aria-label="Remove image"
        >
          <Trash2 size={12} />
        </button>
      </div>
    )}

    {asset.attachedSectionIds.length > 0 && !isPickerMode && (
      <div className="absolute top-1 left-1 bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold">
        {asset.attachedSectionIds.length}
      </div>
    )}
  </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: number;
  icon: LucideIcon;
}> = ({ label, value, icon: Icon }) => (
  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
    <div className="flex items-center gap-2 text-gray-500">
      <Icon size={14} className="text-rose-500" />
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
    </div>
    <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
  </div>
);
