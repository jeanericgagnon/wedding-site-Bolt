import type { BuilderProject } from '../types/builder/project';
import type { WeddingDataV1 } from '../types/weddingData';

const BUILDER_V2_UPGRADE_BRIDGE_KEY = 'dayof.builder-v2-upgrade-bridge';
const BUILDER_V2_UPGRADE_BRIDGE_MAX_AGE_MS = 30 * 60 * 1000;

export type BuilderV2UpgradeBridgePayload = {
  sourceName: string;
  project: BuilderProject;
  weddingData?: WeddingDataV1 | null;
  createdAtISO: string;
};

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const saveBuilderV2UpgradeBridge = (
  payload: Omit<BuilderV2UpgradeBridgePayload, 'createdAtISO'>,
) => {
  const storage = getSessionStorage();
  if (!storage) return false;

  try {
    const value: BuilderV2UpgradeBridgePayload = {
      ...payload,
      createdAtISO: new Date().toISOString(),
    };
    storage.setItem(BUILDER_V2_UPGRADE_BRIDGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const clearBuilderV2UpgradeBridge = () => {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(BUILDER_V2_UPGRADE_BRIDGE_KEY);
  } catch {
    // no-op
  }
};

export const consumeBuilderV2UpgradeBridge = (
  now = Date.now(),
): BuilderV2UpgradeBridgePayload | null => {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(BUILDER_V2_UPGRADE_BRIDGE_KEY);
    if (!raw) return null;

    storage.removeItem(BUILDER_V2_UPGRADE_BRIDGE_KEY);
    const parsed = JSON.parse(raw) as Partial<BuilderV2UpgradeBridgePayload> | null;
    if (
      !parsed
      || typeof parsed !== 'object'
      || typeof parsed.sourceName !== 'string'
      || !parsed.project
      || typeof parsed.createdAtISO !== 'string'
    ) {
      return null;
    }

    const createdAt = new Date(parsed.createdAtISO).getTime();
    if (!Number.isFinite(createdAt) || now - createdAt > BUILDER_V2_UPGRADE_BRIDGE_MAX_AGE_MS) {
      return null;
    }

    return {
      sourceName: parsed.sourceName,
      project: parsed.project as BuilderProject,
      weddingData: parsed.weddingData as WeddingDataV1 | null | undefined,
      createdAtISO: parsed.createdAtISO,
    };
  } catch {
    return null;
  }
};
