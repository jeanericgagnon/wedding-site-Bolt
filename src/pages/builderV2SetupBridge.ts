import type { SetupDraft } from '../lib/setupDraft';

const BUILDER_V2_SETUP_BRIDGE_KEY = 'dayof.builder-v2-setup-bridge';
const BUILDER_V2_SETUP_BRIDGE_MAX_AGE_MS = 30 * 60 * 1000;

type BuilderV2SetupBridgePayload = {
  draft: SetupDraft;
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

const isValidSetupDraft = (value: unknown): value is SetupDraft => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.migrationSource === 'string'
    && typeof draft.partnerOneFirstName === 'string'
    && typeof draft.partnerOneLastName === 'string'
    && typeof draft.partnerTwoFirstName === 'string'
    && typeof draft.partnerTwoLastName === 'string'
    && typeof draft.dateKnown === 'boolean'
    && typeof draft.weddingDate === 'string'
    && typeof draft.weddingCity === 'string'
    && typeof draft.weddingRegion === 'string'
    && typeof draft.guestEstimateBand === 'string'
    && Array.isArray(draft.stylePreferences)
    && draft.stylePreferences.every((entry) => typeof entry === 'string')
    && typeof draft.selectedTemplateId === 'string'
  );
};

export const saveBuilderV2SetupBridge = (draft: SetupDraft) => {
  const storage = getSessionStorage();
  if (!storage) return false;

  try {
    const payload: BuilderV2SetupBridgePayload = {
      draft,
      createdAtISO: new Date().toISOString(),
    };
    storage.setItem(BUILDER_V2_SETUP_BRIDGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
};

export const clearBuilderV2SetupBridge = () => {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.removeItem(BUILDER_V2_SETUP_BRIDGE_KEY);
  } catch {
    // no-op
  }
};

export const readBuilderV2SetupBridge = (now = Date.now()): SetupDraft | null => {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(BUILDER_V2_SETUP_BRIDGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<BuilderV2SetupBridgePayload> | null;
    if (
      !parsed
      || typeof parsed !== 'object'
      || typeof parsed.createdAtISO !== 'string'
      || !isValidSetupDraft(parsed.draft)
    ) {
      return null;
    }

    const createdAt = new Date(parsed.createdAtISO).getTime();
    if (!Number.isFinite(createdAt) || now - createdAt > BUILDER_V2_SETUP_BRIDGE_MAX_AGE_MS) {
      return null;
    }

    return parsed.draft;
  } catch {
    return null;
  }
};

export const consumeBuilderV2SetupBridge = (now = Date.now()): SetupDraft | null => {
  const storage = getSessionStorage();
  if (!storage) return null;

  try {
    const draft = readBuilderV2SetupBridge(now);
    storage.removeItem(BUILDER_V2_SETUP_BRIDGE_KEY);
    return draft;
  } catch {
    return null;
  }
};
