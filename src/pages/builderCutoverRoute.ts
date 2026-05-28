import { BUILDER_WORKSPACE_ROUTES } from '../lib/builderWorkspaceRoutes';

const LEGACY_INTENT_KEYS = new Set(['publishNow', 'photoTips']);

export const getBuilderGuideRoute = (): string => BUILDER_WORKSPACE_ROUTES.guide;

export const getBuilderV2Route = (): string => BUILDER_WORKSPACE_ROUTES.defaultEditor;

export const getBuilderLaunchChecklistRoute = (): string => `${BUILDER_WORKSPACE_ROUTES.legacy}?publishNow=1`;

export const getBuilderPhotoTipsRoute = (): string => `${BUILDER_WORKSPACE_ROUTES.legacy}?photoTips=1`;

export const getBuilderLaunchConfidenceRoute = (): string => `${BUILDER_WORKSPACE_ROUTES.legacy}#launch-confidence`;

export const getBuilderPolishRoute = (): string => `${BUILDER_WORKSPACE_ROUTES.legacy}#builder-concierge`;

export const getBuilderV2LabRoute = (): string => BUILDER_WORKSPACE_ROUTES.lab;

export function hasLegacyBuilderIntent(search: string, hash: string): boolean {
  const params = new URLSearchParams(search);
  if (Array.from(params.keys()).some((key) => LEGACY_INTENT_KEYS.has(key))) return true;
  return Boolean(hash.trim());
}

export function getLegacyBuilderRoute(search: string, hash: string): string {
  return `${BUILDER_WORKSPACE_ROUTES.legacy}${search}${hash}`;
}
