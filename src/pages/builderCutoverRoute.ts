const LEGACY_INTENT_KEYS = new Set(['publishNow', 'photoTips']);

export function hasLegacyBuilderIntent(search: string, hash: string): boolean {
  const params = new URLSearchParams(search);
  if (Array.from(params.keys()).some((key) => LEGACY_INTENT_KEYS.has(key))) return true;
  return Boolean(hash.trim());
}

export function getLegacyBuilderRoute(search: string, hash: string): string {
  return `/dashboard/builder-v1${search}${hash}`;
}
