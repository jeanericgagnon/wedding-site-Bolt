import type { BuilderMediaAsset } from '../../types/builder/media';
import type { BuilderSectionInstance } from '../../types/builder/section';

export interface MediaPickerTargetState {
  targetField: 'settings' | 'sideImage' | 'customBlock' | 'imageArray' | null;
  targetSettingKey?: string | null;
  blockPath?: { blockId: string; columnIndex?: number; columnBlockId?: string } | null;
  imageIndex?: number | null;
}

function getAssetIdsForUrl(url: unknown, assets: BuilderMediaAsset[]): string[] {
  if (typeof url !== 'string' || !url.trim()) return [];
  return assets.filter((asset) => asset.url === url).map((asset) => asset.id);
}

function getCustomBlockImageUrl(
  section: BuilderSectionInstance,
  blockPath?: MediaPickerTargetState['blockPath'],
): unknown {
  if (!blockPath) return undefined;
  const blocks = Array.isArray(section.settings.blocks) ? section.settings.blocks as Array<Record<string, unknown>> : [];
  const block = blocks.find((item) => item.id === blockPath.blockId);
  if (!block) return undefined;

  if (blockPath.columnIndex !== undefined && blockPath.columnBlockId) {
    const columns = Array.isArray(block.columns) ? block.columns as Array<Array<Record<string, unknown>>> : [];
    const targetColumn = columns[blockPath.columnIndex] ?? [];
    const columnBlock = targetColumn.find((item) => item.id === blockPath.columnBlockId);
    return columnBlock?.imageUrl;
  }

  return block.imageUrl;
}

export function getTargetAssetIdsForSection(
  section: BuilderSectionInstance,
  pickerTarget: MediaPickerTargetState,
  assets: BuilderMediaAsset[],
): string[] {
  switch (pickerTarget.targetField) {
    case 'sideImage':
      return getAssetIdsForUrl(section.styleOverrides.sideImage, assets);
    case 'customBlock':
      return getAssetIdsForUrl(getCustomBlockImageUrl(section, pickerTarget.blockPath), assets);
    case 'imageArray': {
      const images = Array.isArray(section.settings.images) ? section.settings.images as Array<Record<string, unknown>> : [];
      const image = typeof pickerTarget.imageIndex === 'number' ? images[pickerTarget.imageIndex] : undefined;
      return getAssetIdsForUrl(image?.url, assets);
    }
    case 'settings': {
      const key = pickerTarget.targetSettingKey;
      return key ? getAssetIdsForUrl(section.settings[key], assets) : [];
    }
    default:
      return [];
  }
}

export function getNextSectionMediaAssetIds(params: {
  currentBindingIds: string[] | undefined;
  previousTargetAssetIds: string[];
  selectedAssetId: string | null;
}): string[] {
  const next = new Set(params.currentBindingIds ?? []);
  params.previousTargetAssetIds.forEach((assetId) => next.delete(assetId));
  if (params.selectedAssetId) next.add(params.selectedAssetId);
  return Array.from(next);
}

export function syncAssetSectionLinksLocally(params: {
  assets: BuilderMediaAsset[];
  sectionId: string;
  selectedAssetId: string | null;
  detachedAssetIds: string[];
}): BuilderMediaAsset[] {
  return params.assets.map((asset) => {
    const shouldDetach = params.detachedAssetIds.includes(asset.id);
    const shouldAttach = params.selectedAssetId === asset.id;
    if (!shouldDetach && !shouldAttach) return asset;

    const attachedSectionIds = new Set(asset.attachedSectionIds);
    if (shouldDetach) attachedSectionIds.delete(params.sectionId);
    if (shouldAttach) attachedSectionIds.add(params.sectionId);

    return {
      ...asset,
      attachedSectionIds: Array.from(attachedSectionIds),
      meta: {
        ...asset.meta,
        updatedAtISO: new Date().toISOString(),
      },
    };
  });
}
