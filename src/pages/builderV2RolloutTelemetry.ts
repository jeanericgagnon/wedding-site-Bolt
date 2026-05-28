export type BuilderV2RolloutAction = 'add' | 'duplicate' | 'remove' | 'import' | 'export';
export type BuilderV2RolloutOutcome = 'success' | 'failure';

export type BuilderV2RolloutTelemetryEntry = {
  action: BuilderV2RolloutAction;
  outcome: BuilderV2RolloutOutcome;
  operation: string;
  recordedAtISO: string;
  reason?: string;
};

export type BuilderV2RolloutTelemetrySnapshot = {
  entries: BuilderV2RolloutTelemetryEntry[];
};

export type BuilderV2RolloutTelemetryMetric = {
  action: BuilderV2RolloutAction;
  label: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
  failureRate: number;
  latestFailureReason: string | null;
};

const BUILDER_V2_ROLLOUT_TELEMETRY_KEY = 'dayof.builder-v2-rollout-telemetry';
const BUILDER_V2_ROLLOUT_TELEMETRY_LIMIT = 200;

const ACTION_ORDER: BuilderV2RolloutAction[] = ['add', 'duplicate', 'remove', 'import', 'export'];

const ACTION_LABELS: Record<BuilderV2RolloutAction, string> = {
  add: 'Add',
  duplicate: 'Duplicate',
  remove: 'Remove',
  import: 'Import',
  export: 'Export',
};

const getSessionStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const isAction = (value: unknown): value is BuilderV2RolloutAction => (
  typeof value === 'string' && ACTION_ORDER.includes(value as BuilderV2RolloutAction)
);

const isOutcome = (value: unknown): value is BuilderV2RolloutOutcome => (
  value === 'success' || value === 'failure'
);

const isEntry = (value: unknown): value is BuilderV2RolloutTelemetryEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    isAction(entry.action)
    && isOutcome(entry.outcome)
    && typeof entry.operation === 'string'
    && typeof entry.recordedAtISO === 'string'
    && (entry.reason === undefined || typeof entry.reason === 'string')
  );
};

export const createEmptyBuilderV2RolloutTelemetrySnapshot = (): BuilderV2RolloutTelemetrySnapshot => ({
  entries: [],
});

export const readBuilderV2RolloutTelemetry = (): BuilderV2RolloutTelemetrySnapshot => {
  const storage = getSessionStorage();
  if (!storage) return createEmptyBuilderV2RolloutTelemetrySnapshot();

  try {
    const raw = storage.getItem(BUILDER_V2_ROLLOUT_TELEMETRY_KEY);
    if (!raw) return createEmptyBuilderV2RolloutTelemetrySnapshot();

    const parsed = JSON.parse(raw) as Partial<BuilderV2RolloutTelemetrySnapshot> | null;
    if (!parsed || !Array.isArray(parsed.entries)) {
      return createEmptyBuilderV2RolloutTelemetrySnapshot();
    }

    return {
      entries: parsed.entries.filter(isEntry).slice(-BUILDER_V2_ROLLOUT_TELEMETRY_LIMIT),
    };
  } catch {
    return createEmptyBuilderV2RolloutTelemetrySnapshot();
  }
};

export const writeBuilderV2RolloutTelemetry = (snapshot: BuilderV2RolloutTelemetrySnapshot) => {
  const storage = getSessionStorage();
  if (!storage) return false;

  try {
    storage.setItem(BUILDER_V2_ROLLOUT_TELEMETRY_KEY, JSON.stringify({
      entries: snapshot.entries.slice(-BUILDER_V2_ROLLOUT_TELEMETRY_LIMIT),
    }));
    return true;
  } catch {
    return false;
  }
};

export const appendBuilderV2RolloutTelemetryEntry = (
  snapshot: BuilderV2RolloutTelemetrySnapshot,
  entry: Omit<BuilderV2RolloutTelemetryEntry, 'recordedAtISO'> & { recordedAtISO?: string },
): BuilderV2RolloutTelemetrySnapshot => ({
  entries: [
    ...snapshot.entries,
    {
      ...entry,
      reason: entry.reason?.trim() || undefined,
      recordedAtISO: entry.recordedAtISO ?? new Date().toISOString(),
    },
  ].slice(-BUILDER_V2_ROLLOUT_TELEMETRY_LIMIT),
});

export const summarizeBuilderV2RolloutTelemetry = (
  snapshot: BuilderV2RolloutTelemetrySnapshot,
): BuilderV2RolloutTelemetryMetric[] => ACTION_ORDER.map((action) => {
  const actionEntries = snapshot.entries.filter((entry) => entry.action === action);
  const failureEntries = actionEntries.filter((entry) => entry.outcome === 'failure');
  const failureCount = failureEntries.length;
  const totalCount = actionEntries.length;

  return {
    action,
    label: ACTION_LABELS[action],
    totalCount,
    successCount: totalCount - failureCount,
    failureCount,
    failureRate: totalCount > 0 ? failureCount / totalCount : 0,
    latestFailureReason: failureEntries.at(-1)?.reason ?? null,
  };
});
