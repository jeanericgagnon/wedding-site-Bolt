import { describe, expect, it } from 'vitest';
import {
  NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY,
  NAME_CHANGE_DOCUMENT_OPTIONS,
  NAME_CHANGE_EXTRACTION_FIELD_LABELS,
  NAME_CHANGE_EXTRACTION_FIELD_PLACEHOLDERS,
  NAME_CHANGE_SECTION_PREFS_STORAGE_KEY,
  TARGET_STATUS_VAULT_STATUS_PRIORITY,
  buildNameChangePreferenceStorageKey,
  ensureDocument,
  findContractDocument,
  findContractExtractedField,
  getActionFeedCtaLabel,
  getActionFeedSectionLabel,
  getActionFeedUrgencyClass,
  getActionFeedUrgencyReasonLabel,
  getActivitySourceLabel,
  getDocumentDetailLabel,
  getDocumentStorageModeLabel,
  getExecutionStatusLabel,
  getExecutionSummaryTone,
  getIntakeStatusLabel,
  getNameChangeStatusChipLabel,
  parseDocumentSnapshotDraft,
  getReminderCtaLabel,
  getRepairSeverityLabel,
  getWorkflowStatusLabel,
  matchesContractDocumentKind,
  readNameChangeAdminPreference,
  readNameChangeCollapsedSections,
  updateDocument,
  writeNameChangeAdminPreference,
  writeNameChangeCollapsedSections,
} from './nameChangePlannerUi';

describe('nameChangePlannerUi', () => {
  it('keeps status labels calm and non-technical', () => {
    expect(getWorkflowStatusLabel('blocked')).toBe('Needs attention');
    expect(getWorkflowStatusLabel(undefined)).toBe('Draft');
    expect(getIntakeStatusLabel('uploaded')).toBe('Added');
    expect(getRepairSeverityLabel('blocking')).toBe('Needed');
    expect(getExecutionStatusLabel('in_progress')).toBe('In progress');
  });

  it('formats document and activity labels for owner-facing UI', () => {
    expect(getDocumentDetailLabel('current_drivers_license')).toBe('Current Drivers License');
    expect(getDocumentDetailLabel(null)).toBe('Saved details');
    expect(getDocumentStorageModeLabel('metadata_only')).toBe('Details only');
    expect(getDocumentStorageModeLabel('file')).toBe('No file stored');
    expect(getActivitySourceLabel('milestone')).toBe('Milestone');
  });

  it('parses document snapshot drafts without throwing while users type', () => {
    expect(parseDocumentSnapshotDraft('')).toEqual({ ok: true, snapshot: null });
    expect(parseDocumentSnapshotDraft('{"issuer":"County Clerk"}')).toEqual({
      ok: true,
      snapshot: { issuer: 'County Clerk' },
    });
    expect(parseDocumentSnapshotDraft('["not", "object"]')).toEqual({ ok: false });
    expect(parseDocumentSnapshotDraft('{broken')).toEqual({ ok: false });
  });

  it('maps planner chips and urgency affordances consistently', () => {
    expect(getNameChangeStatusChipLabel('critical')).toBe('Time-sensitive');
    expect(getNameChangeStatusChipLabel('packet_ready')).toBe('packet ready');
    expect(getActionFeedUrgencyClass('critical')).toContain('text-danger');
    expect(getExecutionSummaryTone('complete')).toContain('text-success');
    expect(getExecutionSummaryTone('blocked')).toContain('text-warning');
  });

  it('keeps action feed copy stable', () => {
    expect(getActionFeedSectionLabel('core-government')).toBe('core government');
    expect(getActionFeedUrgencyReasonLabel('blocking_dependency')).toBe('needs another step first');
    expect(getActionFeedCtaLabel('open_document_repair')).toBe('Check document details');
    expect(getReminderCtaLabel()).toBe('Open linked step');
  });

  it('orders target status vault work by action priority', () => {
    expect(TARGET_STATUS_VAULT_STATUS_PRIORITY.blocked).toBeLessThan(TARGET_STATUS_VAULT_STATUS_PRIORITY.in_progress);
    expect(TARGET_STATUS_VAULT_STATUS_PRIORITY.complete).toBeGreaterThan(TARGET_STATUS_VAULT_STATUS_PRIORITY.ready);
  });

  it('reads and writes local planner preference storage defensively', () => {
    localStorage.clear();

    expect(readNameChangeAdminPreference()).toBe(false);
    writeNameChangeAdminPreference(true);
    expect(localStorage.getItem(NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY)).toBe('true');
    expect(readNameChangeAdminPreference()).toBe(true);

    writeNameChangeCollapsedSections({ roadmap: true, invalid: false });
    expect(readNameChangeCollapsedSections()).toEqual({ roadmap: true, invalid: false });

    localStorage.setItem(NAME_CHANGE_SECTION_PREFS_STORAGE_KEY, JSON.stringify({ roadmap: true, text: 'bad', count: 2 }));
    expect(readNameChangeCollapsedSections()).toEqual({ roadmap: true });

    localStorage.setItem(NAME_CHANGE_SECTION_PREFS_STORAGE_KEY, '{broken');
    expect(readNameChangeCollapsedSections()).toEqual({});
  });

  it('scopes local planner preferences by wedding site when a storage scope is provided', () => {
    localStorage.clear();

    writeNameChangeAdminPreference(true, 'site-a');
    writeNameChangeAdminPreference(false, 'site-b');
    writeNameChangeCollapsedSections({ roadmap: true }, 'site-a');
    writeNameChangeCollapsedSections({ admin: true }, 'site-b');

    expect(buildNameChangePreferenceStorageKey(NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY, 'site-a')).toBe(`${NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY}::site-a`);
    expect(readNameChangeAdminPreference('site-a')).toBe(true);
    expect(readNameChangeAdminPreference('site-b')).toBe(false);
    expect(readNameChangeCollapsedSections('site-a')).toEqual({ roadmap: true });
    expect(readNameChangeCollapsedSections('site-b')).toEqual({ admin: true });
  });

  it('migrates legacy planner preferences into the active site scope when needed', () => {
    localStorage.clear();
    localStorage.setItem(NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY, 'true');
    localStorage.setItem(NAME_CHANGE_SECTION_PREFS_STORAGE_KEY, JSON.stringify({ roadmap: true }));

    expect(readNameChangeAdminPreference('site-a')).toBe(true);
    expect(readNameChangeCollapsedSections('site-a')).toEqual({ roadmap: true });
    expect(localStorage.getItem(`${NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY}::site-a`)).toBe('true');
    expect(localStorage.getItem(`${NAME_CHANGE_SECTION_PREFS_STORAGE_KEY}::site-a`)).toBe(JSON.stringify({ roadmap: true }));
  });

  it('keeps document intake metadata and helpers out of the large page component', () => {
    expect(NAME_CHANGE_DOCUMENT_OPTIONS.map((option) => option.key)).toContain('marriage_certificate');
    expect(NAME_CHANGE_EXTRACTION_FIELD_LABELS.spouse_last_name).toBe('Spouse last name');
    expect(NAME_CHANGE_EXTRACTION_FIELD_PLACEHOLDERS.case_number).toBe('24-CV-1188');
    expect(matchesContractDocumentKind('court_order_name_change', 'court_order')).toBe(true);

    const documents = ensureDocument([], 'marriage_certificate', 'Certified marriage certificate');
    expect(documents).toHaveLength(1);
    expect(ensureDocument(documents, 'marriage_certificate', 'Duplicate')).toBe(documents);
    expect(updateDocument(documents, 'marriage_certificate', { intake_status: 'reviewed' })[0].intake_status).toBe('reviewed');
    expect(findContractDocument(documents, 'marriage_certificate')?.display_name).toBe('Certified marriage certificate');
  });

  it('finds linked document fields first and falls back to unlinked values', () => {
    const linked = {
      document_id: 'doc-1',
      field_key: 'county',
      field_label: 'County',
      field_value_masked: 'San Diego',
      source_type: 'document_extract' as const,
      is_verified: false,
    };
    const fallback = {
      document_id: null,
      field_key: 'county',
      field_label: 'County',
      field_value_masked: 'Los Angeles',
      source_type: 'manual' as const,
      is_verified: true,
    };

    expect(findContractExtractedField([fallback, linked], 'doc-1', 'county')).toBe(linked);
    expect(findContractExtractedField([fallback], 'missing-doc', 'county')).toBe(fallback);
  });
});
