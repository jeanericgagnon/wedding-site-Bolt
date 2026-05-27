import { BuilderMediaAsset } from '../../types/builder/media';

export type MediaLibraryFilterMode = 'all' | 'used' | 'unused';

export type MediaLibrarySummary = {
  totalAssets: number;
  usedAssets: number;
  unusedAssets: number;
  filteredAssets: BuilderMediaAsset[];
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
};

function assetMatchesSearch(asset: BuilderMediaAsset, searchTerm: string): boolean {
  if (!searchTerm) return true;
  const haystack = [
    asset.filename,
    asset.originalFilename,
    asset.altText,
    asset.caption,
    ...asset.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(searchTerm.toLowerCase());
}

export function getMediaLibrarySummary(
  assets: BuilderMediaAsset[],
  filterMode: MediaLibraryFilterMode,
  searchTerm: string,
  options?: {
    isPickerMode?: boolean;
    pickerTargetLabel?: string | null;
  },
): MediaLibrarySummary {
  const sortedAssets = [...assets].sort((left, right) => {
    const attachmentDelta = right.attachedSectionIds.length - left.attachedSectionIds.length;
    if (attachmentDelta !== 0) return attachmentDelta;
    return right.meta.updatedAtISO.localeCompare(left.meta.updatedAtISO);
  });

  const filteredAssets = sortedAssets.filter((asset) => {
    if (filterMode === 'used' && asset.attachedSectionIds.length === 0) return false;
    if (filterMode === 'unused' && asset.attachedSectionIds.length > 0) return false;
    return assetMatchesSearch(asset, searchTerm);
  });

  return {
    totalAssets: assets.length,
    usedAssets: assets.filter((asset) => asset.attachedSectionIds.length > 0).length,
    unusedAssets: assets.filter((asset) => asset.attachedSectionIds.length === 0).length,
    filteredAssets,
    focusTitle: options?.isPickerMode
      ? `${options.pickerTargetLabel ?? 'This section'} needs the right image, not just any image`
      : assets.length === 0
        ? 'The library needs its first useful assets'
        : filterMode === 'unused'
          ? 'These are the cleanest assets to place next'
          : 'Treat the library like reusable site structure',
    focusDetail: options?.isPickerMode
      ? 'Choose the image that best supports this section’s job before you worry about crop perfection.'
      : assets.length === 0
        ? 'A small, trustworthy image set is better than uploading a large pile you will not place with intention.'
        : filterMode === 'unused'
          ? 'Unused assets are easiest to place because they will not introduce duplicate imagery or conflicting tone.'
          : 'Review what is already in use before adding more uploads or replacing existing visuals.',
    bestNextMove: options?.isPickerMode
      ? 'Pick the image that tells the clearest story for this section right now.'
      : assets.length === 0
        ? 'Upload the first few anchor images you know the site will need.'
        : filterMode === 'unused'
          ? 'Place one of the unused assets where the current page still feels visually thin.'
          : 'Start with the strongest reusable asset instead of uploading more by default.',
    decisionRule: options?.isPickerMode
      ? 'Support the section’s purpose first; a technically nice image that says the wrong thing is still a bad pick.'
      : 'Reuse, place, or retire existing assets before growing the library further.',
    watchout: options?.isPickerMode
      ? 'An image that feels generically pretty can still make the section less clear.'
      : assets.length === 0
        ? 'Uploading too much too early usually creates sorting work before the page structure is ready.'
        : 'A growing library can look productive while the actual site still lacks the right placed images.',
    currentStep: options?.isPickerMode
      ? `Review the strongest candidates for ${options.pickerTargetLabel ?? 'this section'}.`
      : assets.length === 0
        ? 'Decide which moments or categories need a real image anchor first.'
        : 'Look at what the library already contains and how much of it is actually placed.',
    nextStep: options?.isPickerMode
      ? 'Select the image that fits this section best and keep editing momentum.'
      : assets.length === 0
        ? 'Upload the first anchor assets and confirm they render cleanly.'
        : filterMode === 'unused'
          ? 'Place one unused image into a page that still feels visually incomplete.'
          : 'Filter down to the best reusable assets before uploading anything new.',
    thenStep: options?.isPickerMode
      ? 'After placement, adjust crop or caption only if the section still needs it.'
      : 'Once the right assets are placed, come back only for missing visual beats instead of general stockpiling.',
  };
}
