export type SetupDraft = {
  migrationSource: '' | 'zola' | 'joy' | 'the-knot' | 'other';
  partnerOneFirstName: string;
  partnerOneLastName: string;
  partnerTwoFirstName: string;
  partnerTwoLastName: string;
  dateKnown: boolean;
  weddingDate: string;
  weddingCity: string;
  weddingRegion: string;
  guestEstimateBand: '' | 'lt50' | '50to100' | '100to200' | '200plus';
  stylePreferences: string[];
  selectedTemplateId: string;
  savedAtISO?: string;
};

export const SETUP_DRAFT_KEY = 'dayof.builderV2.setupDraft';
export const SELECTED_TEMPLATE_KEY = 'dayof.builderV2.selectedTemplate';
export const SELECTED_TEMPLATE_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
export const buildSetupDraftStorageKey = (storageScope?: string | null): string => {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${SETUP_DRAFT_KEY}::${scope}` : SETUP_DRAFT_KEY;
};
export const buildSelectedTemplateStorageKey = (storageScope?: string | null): string => {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${SELECTED_TEMPLATE_KEY}::${scope}` : SELECTED_TEMPLATE_KEY;
};

export const emptySetupDraft: SetupDraft = {
  migrationSource: '',
  partnerOneFirstName: '',
  partnerOneLastName: '',
  partnerTwoFirstName: '',
  partnerTwoLastName: '',
  dateKnown: true,
  weddingDate: '',
  weddingCity: '',
  weddingRegion: '',
  guestEstimateBand: '',
  stylePreferences: [],
  selectedTemplateId: 'modern-luxe',
};

const VALID_MIGRATION_SOURCES = new Set<SetupDraft['migrationSource']>(['', 'zola', 'joy', 'the-knot', 'other']);
const VALID_GUEST_ESTIMATE_BANDS = new Set<SetupDraft['guestEstimateBand']>(['', 'lt50', '50to100', '100to200', '200plus']);
const SETUP_DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SETUP_DRAFT_TEXT_LENGTH = 120;
const MAX_SETUP_DRAFT_STYLE_PREFERENCES = 12;
const MAX_SELECTED_TEMPLATE_ID_LENGTH = 120;

type SelectedTemplateEnvelope = {
  savedAtISO: string;
  templateId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeSelectedTemplateId = (value: string | null | undefined): string => {
  const normalized = value?.trim().slice(0, MAX_SELECTED_TEMPLATE_ID_LENGTH);
  return normalized || emptySetupDraft.selectedTemplateId;
};

const isFreshTimestamp = (value: unknown, retentionMs: number): value is string => {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= Date.now() && time >= Date.now() - retentionMs;
};

const buildSelectedTemplateEnvelope = (templateId: string): SelectedTemplateEnvelope => ({
  savedAtISO: new Date().toISOString(),
  templateId,
});

const readSelectedTemplatePreference = (storageScope?: string | null): string => {
  try {
    const storageKey = buildSelectedTemplateStorageKey(storageScope);
    const hasScopedKey = localStorage.getItem(storageKey) !== null;
    const sourceKey = !hasScopedKey && storageKey !== SELECTED_TEMPLATE_KEY ? SELECTED_TEMPLATE_KEY : storageKey;
    const raw = localStorage.getItem(sourceKey);
    if (!raw) return emptySetupDraft.selectedTemplateId;

    if (!raw.trim().startsWith('{')) {
      const legacyTemplateId = normalizeSelectedTemplateId(raw);
      if (legacyTemplateId !== emptySetupDraft.selectedTemplateId || raw.trim()) {
        localStorage.setItem(storageKey, JSON.stringify(buildSelectedTemplateEnvelope(legacyTemplateId)));
        if (sourceKey !== storageKey) localStorage.removeItem(sourceKey);
      }
      return legacyTemplateId;
    }

    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || !isFreshTimestamp(parsed.savedAtISO, SELECTED_TEMPLATE_RETENTION_MS)) {
      localStorage.removeItem(sourceKey);
      return emptySetupDraft.selectedTemplateId;
    }

    const normalized = normalizeSelectedTemplateId(typeof parsed.templateId === 'string' ? parsed.templateId : null);
    const normalizedRaw = JSON.stringify(buildSelectedTemplateEnvelope(normalized));
    if (raw !== normalizedRaw || sourceKey !== storageKey) {
      localStorage.setItem(storageKey, normalizedRaw);
      if (sourceKey !== storageKey) localStorage.removeItem(sourceKey);
    }
    return normalized;
  } catch {
    const storageKey = buildSelectedTemplateStorageKey(storageScope);
    localStorage.removeItem(storageKey);
    if (storageKey !== SELECTED_TEMPLATE_KEY) localStorage.removeItem(SELECTED_TEMPLATE_KEY);
    return emptySetupDraft.selectedTemplateId;
  }
};

const writeSelectedTemplatePreference = (templateId: string, storageScope?: string | null) => {
  const storageKey = buildSelectedTemplateStorageKey(storageScope);
  const normalized = templateId.trim().slice(0, MAX_SELECTED_TEMPLATE_ID_LENGTH);
  if (normalized) {
    localStorage.setItem(storageKey, JSON.stringify(buildSelectedTemplateEnvelope(normalized)));
    if (storageKey !== SELECTED_TEMPLATE_KEY) localStorage.removeItem(SELECTED_TEMPLATE_KEY);
  } else {
    localStorage.removeItem(storageKey);
    if (storageKey !== SELECTED_TEMPLATE_KEY) localStorage.removeItem(SELECTED_TEMPLATE_KEY);
  }
};

const normalizeMigrationSource = (value: unknown): SetupDraft['migrationSource'] => (
  typeof value === 'string' && VALID_MIGRATION_SOURCES.has(value as SetupDraft['migrationSource'])
    ? value as SetupDraft['migrationSource']
    : ''
);

const normalizeGuestEstimateBand = (value: unknown): SetupDraft['guestEstimateBand'] => (
  typeof value === 'string' && VALID_GUEST_ESTIMATE_BANDS.has(value as SetupDraft['guestEstimateBand'])
    ? value as SetupDraft['guestEstimateBand']
    : ''
);

const normalizeSetupDraftText = (value: unknown): string => (
  typeof value === 'string' ? value.trim().slice(0, MAX_SETUP_DRAFT_TEXT_LENGTH) : ''
);

const isFreshSetupDraftTimestamp = (value: unknown): value is string => {
  return isFreshTimestamp(value, SETUP_DRAFT_RETENTION_MS);
};

const normalizeSetupDraft = (parsed: Partial<SetupDraft>, selectedTemplate: string): SetupDraft | null => {
  if (typeof parsed.savedAtISO === 'string' && !isFreshSetupDraftTimestamp(parsed.savedAtISO)) return null;
  const savedAtISO = isFreshSetupDraftTimestamp(parsed.savedAtISO) ? parsed.savedAtISO : new Date().toISOString();

  return {
    ...emptySetupDraft,
    migrationSource: normalizeMigrationSource(parsed.migrationSource),
    partnerOneFirstName: normalizeSetupDraftText(parsed.partnerOneFirstName),
    partnerOneLastName: normalizeSetupDraftText(parsed.partnerOneLastName),
    partnerTwoFirstName: normalizeSetupDraftText(parsed.partnerTwoFirstName),
    partnerTwoLastName: normalizeSetupDraftText(parsed.partnerTwoLastName),
    dateKnown: typeof parsed.dateKnown === 'boolean' ? parsed.dateKnown : true,
    weddingDate: normalizeSetupDraftText(parsed.weddingDate),
    weddingCity: normalizeSetupDraftText(parsed.weddingCity),
    weddingRegion: normalizeSetupDraftText(parsed.weddingRegion),
    guestEstimateBand: normalizeGuestEstimateBand(parsed.guestEstimateBand),
    stylePreferences: Array.isArray(parsed.stylePreferences)
      ? Array.from(new Set(parsed.stylePreferences.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))).slice(0, MAX_SETUP_DRAFT_STYLE_PREFERENCES)
      : [],
    selectedTemplateId: normalizeSelectedTemplateId(parsed.selectedTemplateId ?? selectedTemplate),
    savedAtISO,
  };
};

export const readSetupDraft = (storageScope?: string | null): SetupDraft => {
  const selectedTemplate = readSelectedTemplatePreference(storageScope);
  const storageKey = buildSetupDraftStorageKey(storageScope);

  try {
    const hasScopedKey = localStorage.getItem(storageKey) !== null;
    const sourceKey = !hasScopedKey && storageKey !== SETUP_DRAFT_KEY ? SETUP_DRAFT_KEY : storageKey;
    const raw = localStorage.getItem(sourceKey);
    if (!raw) return { ...emptySetupDraft, selectedTemplateId: selectedTemplate };
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    const normalized = normalizeSetupDraft(parsed, selectedTemplate);
    if (!normalized) {
      localStorage.removeItem(sourceKey);
      return { ...emptySetupDraft, selectedTemplateId: selectedTemplate };
    }
    const normalizedRaw = JSON.stringify(normalized);
    if (raw !== normalizedRaw || sourceKey !== storageKey) {
      localStorage.setItem(storageKey, normalizedRaw);
      if (sourceKey !== storageKey) localStorage.removeItem(sourceKey);
    }
    return normalized;
  } catch {
    localStorage.removeItem(storageKey);
    if (storageKey !== SETUP_DRAFT_KEY) localStorage.removeItem(SETUP_DRAFT_KEY);
    return { ...emptySetupDraft, selectedTemplateId: selectedTemplate };
  }
};

export const writeSetupDraft = (draft: SetupDraft, storageScope?: string | null) => {
  const selectedTemplateId = draft.selectedTemplateId.trim();
  const normalized = normalizeSetupDraft({
    ...draft,
    selectedTemplateId,
    savedAtISO: new Date().toISOString(),
  }, selectedTemplateId);
  const storageKey = buildSetupDraftStorageKey(storageScope);
  localStorage.setItem(storageKey, JSON.stringify(normalized ?? { ...emptySetupDraft, selectedTemplateId }));
  if (storageKey !== SETUP_DRAFT_KEY) localStorage.removeItem(SETUP_DRAFT_KEY);
  writeSelectedTemplatePreference(selectedTemplateId, storageScope);
};

export const selectSetupDraftTemplate = (templateId: string, storageScope?: string | null) => {
  writeSetupDraft({
    ...readSetupDraft(storageScope),
    selectedTemplateId: templateId,
  }, storageScope);
};

export const clearSetupDraft = (storageScope?: string | null) => {
  const setupDraftKey = buildSetupDraftStorageKey(storageScope);
  const selectedTemplateKey = buildSelectedTemplateStorageKey(storageScope);
  localStorage.removeItem(setupDraftKey);
  localStorage.removeItem(selectedTemplateKey);
  if (setupDraftKey !== SETUP_DRAFT_KEY) localStorage.removeItem(SETUP_DRAFT_KEY);
  if (selectedTemplateKey !== SELECTED_TEMPLATE_KEY) localStorage.removeItem(SELECTED_TEMPLATE_KEY);
};

export const clearSetupDraftOnly = (storageScope?: string | null) => {
  const setupDraftKey = buildSetupDraftStorageKey(storageScope);
  localStorage.removeItem(setupDraftKey);
  if (setupDraftKey !== SETUP_DRAFT_KEY) localStorage.removeItem(SETUP_DRAFT_KEY);
};

export const setupDraftProgress = (draft: SetupDraft): number => {
  let score = 0;
  if (draft.partnerOneFirstName.trim() && draft.partnerTwoFirstName.trim()) score += 1;
  if (!draft.dateKnown || !!draft.weddingDate) score += 1;
  if (draft.weddingCity.trim()) score += 1;
  if (draft.guestEstimateBand) score += 1;
  return Math.round((score / 4) * 100);
};
