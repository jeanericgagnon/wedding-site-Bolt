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
};

export const SETUP_DRAFT_KEY = 'dayof.builderV2.setupDraft';
export const SELECTED_TEMPLATE_KEY = 'dayof.builderV2.selectedTemplate';

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

const normalizeSelectedTemplateId = (value: string | null | undefined): string => {
  const normalized = value?.trim();
  return normalized || emptySetupDraft.selectedTemplateId;
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

export const readSetupDraft = (): SetupDraft => {
  const selectedTemplate = normalizeSelectedTemplateId(localStorage.getItem(SELECTED_TEMPLATE_KEY));

  try {
    const raw = localStorage.getItem(SETUP_DRAFT_KEY);
    if (!raw) return { ...emptySetupDraft, selectedTemplateId: selectedTemplate };
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    return {
      ...emptySetupDraft,
      ...parsed,
      migrationSource: normalizeMigrationSource(parsed.migrationSource),
      dateKnown: parsed.dateKnown ?? true,
      weddingDate: parsed.weddingDate ?? '',
      weddingCity: parsed.weddingCity ?? '',
      weddingRegion: parsed.weddingRegion ?? '',
      guestEstimateBand: normalizeGuestEstimateBand(parsed.guestEstimateBand),
      stylePreferences: Array.isArray(parsed.stylePreferences) ? parsed.stylePreferences.filter((value): value is string => typeof value === 'string') : [],
      selectedTemplateId: normalizeSelectedTemplateId(parsed.selectedTemplateId),
    };
  } catch {
    return { ...emptySetupDraft, selectedTemplateId: selectedTemplate };
  }
};

export const writeSetupDraft = (draft: SetupDraft) => {
  localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify(draft));
  const selectedTemplateId = draft.selectedTemplateId.trim();
  if (selectedTemplateId) {
    localStorage.setItem(SELECTED_TEMPLATE_KEY, selectedTemplateId);
  } else {
    localStorage.removeItem(SELECTED_TEMPLATE_KEY);
  }
};

export const clearSetupDraft = () => {
  localStorage.removeItem(SETUP_DRAFT_KEY);
  localStorage.removeItem(SELECTED_TEMPLATE_KEY);
};

export const clearSetupDraftOnly = () => {
  localStorage.removeItem(SETUP_DRAFT_KEY);
};

export const setupDraftProgress = (draft: SetupDraft): number => {
  let score = 0;
  if (draft.partnerOneFirstName.trim() && draft.partnerTwoFirstName.trim()) score += 1;
  if (!draft.dateKnown || !!draft.weddingDate) score += 1;
  if (draft.weddingCity.trim()) score += 1;
  if (draft.guestEstimateBand) score += 1;
  return Math.round((score / 4) * 100);
};
