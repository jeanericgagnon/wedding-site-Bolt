import { beforeEach, describe, expect, it } from 'vitest';
import {
  emptySetupDraft,
  readSetupDraft,
  SELECTED_TEMPLATE_KEY,
  SETUP_DRAFT_KEY,
  setupDraftProgress,
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
});
