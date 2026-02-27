export type SetupDraft = {
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

export const readSetupDraft = (): SetupDraft => {
  try {
    const raw = localStorage.getItem(SETUP_DRAFT_KEY);
    const selectedTemplate = localStorage.getItem(SELECTED_TEMPLATE_KEY) ?? emptySetupDraft.selectedTemplateId;
    if (!raw) return { ...emptySetupDraft, selectedTemplateId: selectedTemplate };
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    return {
      ...emptySetupDraft,
      ...parsed,
      dateKnown: parsed.dateKnown ?? true,
      weddingDate: parsed.weddingDate ?? '',
      weddingCity: parsed.weddingCity ?? '',
      weddingRegion: parsed.weddingRegion ?? '',
      guestEstimateBand: (parsed.guestEstimateBand as SetupDraft['guestEstimateBand']) ?? '',
      stylePreferences: Array.isArray(parsed.stylePreferences) ? parsed.stylePreferences : [],
      selectedTemplateId: parsed.selectedTemplateId ?? selectedTemplate,
    };
  } catch {
    return { ...emptySetupDraft };
  }
};

export const writeSetupDraft = (draft: SetupDraft) => {
  localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify(draft));
  if (draft.selectedTemplateId) {
    localStorage.setItem(SELECTED_TEMPLATE_KEY, draft.selectedTemplateId);
  }
};

export const clearSetupDraft = () => {
  localStorage.removeItem(SETUP_DRAFT_KEY);
  localStorage.removeItem(SELECTED_TEMPLATE_KEY);
};

export const setupDraftProgress = (draft: SetupDraft): number => {
  let score = 0;
  if (draft.partnerOneFirstName.trim() && draft.partnerTwoFirstName.trim()) score += 1;
  if (!draft.dateKnown || !!draft.weddingDate) score += 1;
  if (draft.weddingCity.trim()) score += 1;
  if (draft.guestEstimateBand) score += 1;
  return Math.round((score / 4) * 100);
};
