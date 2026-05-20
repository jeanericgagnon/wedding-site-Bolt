const TEMPLATE_USAGE_KEY = 'dayof_template_usage_v1';
export const TEMPLATE_USAGE_SCOPE_SEPARATOR = '::scope::';
export const TEMPLATE_USAGE_RETENTION_MS = 1000 * 60 * 60 * 24 * 180;
const MAX_TEMPLATE_USAGE_ROWS = 80;
const MAX_TEMPLATE_ID_LENGTH = 120;

type TemplateUsageEnvelope = {
  savedAtISO: string;
  usage: Record<string, number>;
};

const normalizeTemplateUsageStorageScope = (storageScope?: string | null): string | null => {
  if (typeof storageScope !== 'string') return null;
  const normalized = storageScope.trim();
  return normalized.length > 0 ? normalized : null;
};

export const buildTemplateUsageStorageKey = (storageScope?: string | null): string => {
  const normalizedScope = normalizeTemplateUsageStorageScope(storageScope);
  return normalizedScope
    ? `${TEMPLATE_USAGE_KEY}${TEMPLATE_USAGE_SCOPE_SEPARATOR}${normalizedScope}`
    : TEMPLATE_USAGE_KEY;
};

function normalizeTemplateUsage(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).slice(0, MAX_TEMPLATE_USAGE_ROWS).reduce<Record<string, number>>((acc, [rawTemplateId, rawCount]) => {
    const templateId = rawTemplateId.trim().slice(0, MAX_TEMPLATE_ID_LENGTH);
    const count = Math.min(Math.max(Math.floor(Number(rawCount) || 0), 0), 9999);
    if (templateId && count > 0) acc[templateId] = count;
    return acc;
  }, {});
}

function isFreshTemplateUsage(savedAtISO: unknown): boolean {
  if (typeof savedAtISO !== 'string') return false;
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= TEMPLATE_USAGE_RETENTION_MS;
}

function writeTemplateUsageEnvelope(usage: Record<string, number>, storageScope?: string | null) {
  const scopedStorageKey = buildTemplateUsageStorageKey(storageScope);
  localStorage.setItem(scopedStorageKey, JSON.stringify({
    savedAtISO: new Date().toISOString(),
    usage: normalizeTemplateUsage(usage),
  } satisfies TemplateUsageEnvelope));
  if (scopedStorageKey !== TEMPLATE_USAGE_KEY) localStorage.removeItem(TEMPLATE_USAGE_KEY);
}

export const readTemplateUsage = (storageScope?: string | null): Record<string, number> => {
  const scopedStorageKey = buildTemplateUsageStorageKey(storageScope);
  try {
    let raw = localStorage.getItem(scopedStorageKey);
    if (!raw && scopedStorageKey !== TEMPLATE_USAGE_KEY) {
      raw = localStorage.getItem(TEMPLATE_USAGE_KEY);
      if (raw) {
        localStorage.setItem(scopedStorageKey, raw);
        localStorage.removeItem(TEMPLATE_USAGE_KEY);
      }
    }
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number> | TemplateUsageEnvelope;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'savedAtISO' in parsed) {
      if (!isFreshTemplateUsage(parsed.savedAtISO)) {
        localStorage.removeItem(scopedStorageKey);
        if (scopedStorageKey !== TEMPLATE_USAGE_KEY) localStorage.removeItem(TEMPLATE_USAGE_KEY);
        return {};
      }
      if (scopedStorageKey !== TEMPLATE_USAGE_KEY) localStorage.removeItem(TEMPLATE_USAGE_KEY);
      return normalizeTemplateUsage(parsed.usage);
    }
    const usage = normalizeTemplateUsage(parsed);
    if (Object.keys(usage).length > 0) writeTemplateUsageEnvelope(usage, storageScope);
    else {
      localStorage.removeItem(scopedStorageKey);
      if (scopedStorageKey !== TEMPLATE_USAGE_KEY) localStorage.removeItem(TEMPLATE_USAGE_KEY);
    }
    return usage;
  } catch {
    try {
      localStorage.removeItem(scopedStorageKey);
      if (scopedStorageKey !== TEMPLATE_USAGE_KEY) localStorage.removeItem(TEMPLATE_USAGE_KEY);
    } catch { /* non-blocking */ }
    return {};
  }
};

export const bumpTemplateUsage = (templateId: string, storageScope?: string | null) => {
  try {
    const usage = readTemplateUsage(storageScope);
    const normalizedTemplateId = templateId.trim().slice(0, MAX_TEMPLATE_ID_LENGTH);
    if (!normalizedTemplateId) return;
    usage[normalizedTemplateId] = Math.min((usage[normalizedTemplateId] || 0) + 1, 9999);
    writeTemplateUsageEnvelope(usage, storageScope);
  } catch {
    // non-blocking
  }
};
