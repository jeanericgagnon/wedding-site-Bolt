import { BuilderMediaAsset } from '../../types/builder/media';

export function mergeMediaAssetsAfterUploadRefresh(
  existingAssets: BuilderMediaAsset[],
  freshAssets: BuilderMediaAsset[],
  uploadedCount: number
): BuilderMediaAsset[] {
  if (uploadedCount <= 0) return freshAssets;

  const mergedById = new Map<string, BuilderMediaAsset>();

  existingAssets.forEach((asset) => {
    mergedById.set(asset.id, asset);
  });

  freshAssets.forEach((asset) => {
    mergedById.set(asset.id, asset);
  });

  return Array.from(mergedById.values()).sort((a, b) => {
    const aTime = Date.parse(a.meta.updatedAtISO || a.meta.uploadedAtISO || '');
    const bTime = Date.parse(b.meta.updatedAtISO || b.meta.uploadedAtISO || '');
    return Number.isNaN(bTime) || Number.isNaN(aTime) ? 0 : bTime - aTime;
  });
}
