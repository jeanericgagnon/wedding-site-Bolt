import { beforeEach, describe, expect, it } from 'vitest';
import {
  emptySetupDraft,
  readSetupDraft,
  selectSetupDraftTemplate,
  SELECTED_TEMPLATE_KEY,
  SETUP_DRAFT_KEY,
  setupDraftProgress,
  writeSetupDraft,
} from './setupDraft';

describe('setupDraft', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserves the separately selected template when the setup draft payload is invalid', () => {
    localStorage.setItem(SELECTED_TEMPLATE_KEY, 'editorial-minimal');
    localStorage.setItem(SETUP_DRAFT_KEY, '{not-valid-json');

    expect(readSetupDraft()).toEqual({
      ...emptySetupDraft,
      selectedTemplateId: 'editorial-minimal',
    });
  });

  it('counts date as complete when the couple has not chosen one yet', () => {
    expect(setupDraftProgress({
      ...emptySetupDraft,
      partnerOneFirstName: 'Eric',
      partnerTwoFirstName: 'Alex',
      dateKnown: false,
      weddingCity: 'San Diego',
      guestEstimateBand: '50to100',
    })).toBe(100);
  });

  it('clears stale selected template storage when the draft no longer has one', () => {
    localStorage.setItem(SELECTED_TEMPLATE_KEY, 'editorial-minimal');

    writeSetupDraft({
      ...emptySetupDraft,
      selectedTemplateId: '',
    });

    expect(localStorage.getItem(SELECTED_TEMPLATE_KEY)).toBeNull();
    expect(readSetupDraft().selectedTemplateId).toBe(emptySetupDraft.selectedTemplateId);
  });

  it('normalizes whitespace-only template selections back to the default template', () => {
    localStorage.setItem(SELECTED_TEMPLATE_KEY, '   ');
    localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify({ selectedTemplateId: '   ' }));

    expect(readSetupDraft().selectedTemplateId).toBe(emptySetupDraft.selectedTemplateId);

    writeSetupDraft({
      ...emptySetupDraft,
      selectedTemplateId: '   ',
    });

    expect(localStorage.getItem(SELECTED_TEMPLATE_KEY)).toBeNull();
  });

  it('updates the selected template without dropping the rest of the setup draft', () => {
    writeSetupDraft({
      ...emptySetupDraft,
      partnerOneFirstName: 'Eric',
      partnerTwoFirstName: 'Alex',
      weddingCity: 'San Diego',
      selectedTemplateId: 'modern-luxe',
    });

    selectSetupDraftTemplate('destination-minimal');

    expect(readSetupDraft()).toEqual({
      ...emptySetupDraft,
      partnerOneFirstName: 'Eric',
      partnerTwoFirstName: 'Alex',
      weddingCity: 'San Diego',
      selectedTemplateId: 'destination-minimal',
    });
    expect(localStorage.getItem(SELECTED_TEMPLATE_KEY)).toBe('destination-minimal');
  });

  it('drops invalid enum values and non-string style entries from persisted drafts', () => {
    localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify({
      migrationSource: 'wix',
      guestEstimateBand: 'gigantic',
      stylePreferences: ['romantic', 42, null],
    }));

    expect(readSetupDraft()).toEqual({
      ...emptySetupDraft,
      migrationSource: '',
      guestEstimateBand: '',
      stylePreferences: ['romantic'],
    });
  });
});
