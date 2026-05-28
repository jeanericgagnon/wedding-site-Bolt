import { BUILDER_WORKSPACE_ROUTES } from '../lib/builderWorkspaceRoutes';

const BUILDER_V2_INTENT_KEYS = new Set(['publishNow']);
const BUILDER_V2_INTENT_HASHES = new Set(['#launch-confidence']);
const LEGACY_INTENT_KEYS = new Set(['photoTips']);
const LEGACY_INTENT_HASHES = new Set(['#builder-concierge']);

export const getBuilderGuideRoute = (): string => BUILDER_WORKSPACE_ROUTES.guide;

export const getBuilderV2Route = (): string => BUILDER_WORKSPACE_ROUTES.defaultEditor;

export const getBuilderLaunchChecklistRoute = (): string => `${BUILDER_WORKSPACE_ROUTES.defaultEditor}?publishNow=1`;

export const getBuilderPhotoTipsRoute = (): string => `${BUILDER_WORKSPACE_ROUTES.legacy}?photoTips=1`;

export const getBuilderLaunchConfidenceRoute = (): string => `${BUILDER_WORKSPACE_ROUTES.defaultEditor}#launch-confidence`;

export const getBuilderPolishRoute = (): string => `${BUILDER_WORKSPACE_ROUTES.legacy}#builder-concierge`;

export const getBuilderV2LabRoute = (): string => BUILDER_WORKSPACE_ROUTES.lab;

export function hasBuilderV2Intent(search: string, hash: string): boolean {
  const params = new URLSearchParams(search);
  if (Array.from(params.keys()).some((key) => BUILDER_V2_INTENT_KEYS.has(key))) return true;
  return BUILDER_V2_INTENT_HASHES.has(hash.trim());
}

export function getBuilderV2IntentRoute(search: string, hash: string): string {
  return `${BUILDER_WORKSPACE_ROUTES.defaultEditor}${search}${hash}`;
}

export function hasLegacyBuilderIntent(search: string, hash: string): boolean {
  const params = new URLSearchParams(search);
  if (Array.from(params.keys()).some((key) => LEGACY_INTENT_KEYS.has(key))) return true;
  return LEGACY_INTENT_HASHES.has(hash.trim());
}

export function getLegacyBuilderRoute(search: string, hash: string): string {
  return `${BUILDER_WORKSPACE_ROUTES.legacy}${search}${hash}`;
}
