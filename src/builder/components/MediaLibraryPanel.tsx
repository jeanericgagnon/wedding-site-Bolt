import React, { useState, useRef } from 'react';
import { X, Upload, Image, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { useBuilderContext } from '../state/builderStore';
import { builderActions } from '../state/builderActions';
import { BuilderMediaAsset } from '../../types/builder/media';
import { BUILDER_SUPPORTED_IMAGE_TYPES, BUILDER_MAX_FILE_SIZE_MB } from '../constants/builderCapabilities';

export const MediaLibraryPanel: React.FC = () => {
  const { state, dispatch } = useBuilderContext();

  if (!state.mediaLibraryOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => dispatch(builderActions.closeMediaLibrary())}
      />
      <div className="relative ml-auto w-full max-w-3xl bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Media Library</h2>
            <p className="text-sm text-gray-500">Upload and manage your wedding photos and assets</p>
          </div>
          <button
            onClick={() => dispatch(builderActions.closeMediaLibrary())}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <UploadDropArea weddingId={state.project?.weddingId ?? ''} />
          <AssetGrid assets={state.mediaAssets} uploadQueue={state.uploadQueue} />
        </div>
      </div>
    </div>
  );
};

interface UploadDropAreaProps {
  weddingId: string;
}

export const UploadDropArea: React.FC<UploadDropAreaProps> = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const valid = Array.from(files).filter(f => {
      if (!BUILDER_SUPPORTED_IMAGE_TYPES.includes(f.type)) return false;
      if (f.size > BUILDER_MAX_FILE_SIZE_MB * 1024 * 1024) return false;
      return true;
    });

    if (valid.length === 0) return;
  };

  return (
    <div className="px-6 pt-4 pb-2">
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
        <p className="text-sm font-medium text-gray-700">Drop photos here or click to upload</p>
        <p className="text-xs text-gray-400 mt-1">
          JPEG, PNG, WebP up to {BUILDER_MAX_FILE_SIZE_MB}MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={BUILDER_SUPPORTED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) handleFiles(e.target.files); }}
        />
      </div>
    </div>
  );
};

interface AssetGridProps {
  assets: BuilderMediaAsset[];
  uploadQueue: Array<{ assetId: string; filename: string; progress: number; status: string }>;
}

export const AssetGrid: React.FC<AssetGridProps> = ({ assets, uploadQueue }) => {
  const { dispatch } = useBuilderContext();

  const handleDelete = (assetId: string) => {
    dispatch(builderActions.removeMediaAsset(assetId));
  };

  return (
    <div className="flex-1 px-6 pb-6 pt-4">
      {uploadQueue.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploading</p>
          {uploadQueue.map(item => (
            <div key={item.assetId} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <Loader2 size={14} className="animate-spin text-rose-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{item.filename}</p>
                <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {assets.length === 0 && uploadQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen size={32} className="text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No media yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload your wedding photos to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {assets.map(asset => (
            <AssetTile key={asset.id} asset={asset} onDelete={() => handleDelete(asset.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

interface AssetTileProps {
  asset: BuilderMediaAsset;
  onDelete: () => void;
}

const AssetTile: React.FC<AssetTileProps> = ({ asset, onDelete }) => (
  <div className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
    {asset.assetType === 'image' ? (
      <img
        src={asset.thumbnailUrl ?? asset.url}
        alt={asset.altText ?? asset.originalFilename}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center">
        <Image size={24} className="text-gray-400" />
      </div>
    )}

    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="p-1.5 bg-white rounded-lg text-red-500 hover:text-red-700 shadow-sm transition-colors"
      >
        <Trash2 size={12} />
      </button>
    </div>
  </div>
);
