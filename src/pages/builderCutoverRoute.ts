const LEGACY_INTENT_KEYS = new Set(['publishNow', 'photoTips']);

export const getBuilderGuideRoute = (): string => '/dashboard/builder';

export const getBuilderLaunchChecklistRoute = (): string => '/dashboard/builder-v1?publishNow=1';

export const getBuilderPhotoTipsRoute = (): string => '/dashboard/builder-v1?photoTips=1';

export const getBuilderLaunchConfidenceRoute = (): string => '/dashboard/builder-v1#launch-confidence';

export const getBuilderPolishRoute = (): string => '/dashboard/builder-v1#builder-concierge';

export const getBuilderV2LabRoute = (): string => '/builder-v2-lab';

export function hasLegacyBuilderIntent(search: string, hash: string): boolean {
  const params = new URLSearchParams(search);
  if (Array.from(params.keys()).some((key) => LEGACY_INTENT_KEYS.has(key))) return true;
  return Boolean(hash.trim());
}

export function getLegacyBuilderRoute(search: string, hash: string): string {
  return `/dashboard/builder-v1${search}${hash}`;
}
