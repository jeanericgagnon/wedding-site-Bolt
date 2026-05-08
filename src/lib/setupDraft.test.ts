import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  emptySetupDraft,
  readSetupDraft,
  selectSetupDraftTemplate,
  SELECTED_TEMPLATE_KEY,
  SELECTED_TEMPLATE_RETENTION_MS,
  SETUP_DRAFT_KEY,
  setupDraftProgress,
  writeSetupDraft,
} from './setupDraft';

describe('setupDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('preserves the separately selected template when the setup draft payload is invalid', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:20:00.000Z'));
    localStorage.setItem(SELECTED_TEMPLATE_KEY, 'editorial-minimal');
    localStorage.setItem(SETUP_DRAFT_KEY, '{not-valid-json');

    expect(readSetupDraft()).toEqual({
      ...emptySetupDraft,
      selectedTemplateId: 'editorial-minimal',
    });
    expect(JSON.parse(localStorage.getItem(SELECTED_TEMPLATE_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T16:20:00.000Z',
      templateId: 'editorial-minimal',
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:20:00.000Z'));

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
      savedAtISO: '2026-05-06T16:20:00.000Z',
    });
    expect(JSON.parse(localStorage.getItem(SELECTED_TEMPLATE_KEY) ?? '{}')).toMatchObject({
      savedAtISO: '2026-05-06T16:20:00.000Z',
      templateId: 'destination-minimal',
    });
  });

  it('drops invalid enum values and non-string style entries from persisted drafts', () => {
    localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify({
      migrationSource: 'wix',
      guestEstimateBand: 'gigantic',
      stylePreferences: ['romantic', 42, null],
    }));

    expect(readSetupDraft()).toMatchObject({
      ...emptySetupDraft,
      migrationSource: '',
      guestEstimateBand: '',
      stylePreferences: ['romantic'],
    });
    expect(readSetupDraft().savedAtISO).toBeTruthy();
  });

  it('expires stale setup draft PII while keeping selected template preference', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:20:00.000Z'));
    localStorage.setItem(SELECTED_TEMPLATE_KEY, 'editorial-minimal');
    localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify({
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
      weddingCity: 'San Diego',
      selectedTemplateId: 'modern-luxe',
      savedAtISO: '2026-03-01T12:00:00.000Z',
    }));

    expect(readSetupDraft()).toEqual({
      ...emptySetupDraft,
      selectedTemplateId: 'editorial-minimal',
    });
    expect(localStorage.getItem(SETUP_DRAFT_KEY)).toBeNull();
  });

  it('expires stale selected template preferences', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:20:00.000Z'));
    localStorage.setItem(SELECTED_TEMPLATE_KEY, JSON.stringify({
      savedAtISO: new Date(Date.now() - SELECTED_TEMPLATE_RETENTION_MS - 1).toISOString(),
      templateId: 'editorial-minimal',
    }));

    expect(readSetupDraft().selectedTemplateId).toBe(emptySetupDraft.selectedTemplateId);
    expect(localStorage.getItem(SELECTED_TEMPLATE_KEY)).toBeNull();
  });

  it('bounds text and style preference fields before storing setup drafts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:20:00.000Z'));

    writeSetupDraft({
      ...emptySetupDraft,
      partnerOneFirstName: `  ${'A'.repeat(140)}  `,
      weddingCity: `  ${'S'.repeat(140)}  `,
      stylePreferences: ['romantic', 'romantic', '', 'modern', ...Array.from({ length: 20 }, (_, index) => `style-${index}`)],
    });

    const draft = readSetupDraft();
    expect(draft.partnerOneFirstName).toHaveLength(120);
    expect(draft.weddingCity).toHaveLength(120);
    expect(draft.stylePreferences).toHaveLength(12);
    expect(draft.stylePreferences.slice(0, 2)).toEqual(['romantic', 'modern']);
    expect(draft.savedAtISO).toBe('2026-05-06T16:20:00.000Z');
  });
});
