import { describe, expect, it } from 'vitest';
import { createDraftNameChangeDocument, normalizeDraftNameChangeDocumentId, upsertDraftNameChangeExtractedField } from './intakeDraft';
import type { NameChangeExtractedFieldInput } from './types';

describe('name change intake draft helpers', () => {
  it('creates draft documents with stable client ids for document-linked extraction work', () => {
    expect(createDraftNameChangeDocument('marriage_certificate', 'Certified marriage certificate')).toMatchObject({
      id: 'draft-marriage_certificate',
      document_kind: 'marriage_certificate',
      display_name: 'Certified marriage certificate',
      storage_mode: 'metadata_only',
      intake_status: 'uploaded',
    });
  });

  it('falls back to human-readable draft labels when intake starts from a canonical kind only', () => {
    expect(createDraftNameChangeDocument('marriage_certificate', '   ')).toMatchObject({
      id: 'draft-marriage_certificate',
      document_kind: 'marriage_certificate',
      display_name: 'Marriage Certificate',
    });
  });

  it('collapses draft document labels into one clean downstream display name', () => {
    expect(createDraftNameChangeDocument('marriage_certificate', '  Certified   marriage   certificate  ')).toMatchObject({
      display_name: 'Certified marriage certificate',
    });
  });

  it('canonicalizes legacy court-order aliases into one stable draft document identity', () => {
    expect(createDraftNameChangeDocument('court_order_name_change', ' Court order ')).toMatchObject({
      id: 'draft-court_order',
      document_kind: 'court_order',
      display_name: 'Court order',
      file_name_masked: 'court-order-•••.pdf',
    });
  });

  it('normalizes legacy draft document ids onto the canonical draft id', () => {
    expect(normalizeDraftNameChangeDocumentId('draft-court_order_name_change')).toBe('draft-court_order');
    expect(normalizeDraftNameChangeDocumentId(' draft-marriage_certificate ')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId(' external-doc-id ')).toBe('external-doc-id');
    expect(normalizeDraftNameChangeDocumentId(null)).toBeNull();
  });

  it('upserts extracted fields per document instead of globally by field key', () => {
    const startingFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alex',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: 'draft-current_passport',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alicia',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const next = upsertDraftNameChangeExtractedField(
      startingFields,
      'draft-marriage_certificate',
      'first_name',
      'First name',
      'Alexa',
    );

    expect(next).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-marriage_certificate', field_key: 'first_name', field_value_masked: 'Alexa' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'first_name', field_value_masked: 'Alicia' }),
    ]));
    expect(next).toHaveLength(2);
  });

  it('removes only the targeted document-linked field when cleared', () => {
    const startingFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'San Diego',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: null,
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const next = upsertDraftNameChangeExtractedField(startingFields, 'draft-marriage_certificate', 'county', 'County', '');

    expect(next).toEqual([
      expect.objectContaining({ document_id: null, field_key: 'county', field_value_masked: 'Orange' }),
    ]);
  });

  it('upserts legacy court-order draft fields onto the canonical court-order draft id', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-court_order_name_change', 'case_number', 'Case number', '24-CV-1188');

    expect(next).toEqual([
      expect.objectContaining({ document_id: 'draft-court_order', field_key: 'case_number', field_value_masked: '24-CV-1188' }),
    ]);
  });

  it('replaces legacy court-order draft fields instead of leaving duplicate alias rows behind', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-court_order_name_change',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1000',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-court_order', 'case_number', 'Case number', '24-CV-1188');

    expect(next).toEqual([
      expect.objectContaining({ document_id: 'draft-court_order', field_key: 'case_number', field_value_masked: '24-CV-1188' }),
    ]);
  });

  it('normalizes draft field labels and values before downstream document truth reads them', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', '  ', '  San Diego  ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'San Diego',
      }),
    ]);
  });

  it('collapses repeated whitespace in draft field labels and values', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', '  County   of   residence  ', '  San   Diego  ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_label: 'County of residence',
        field_value_masked: 'San Diego',
      }),
    ]);
  });

  it('clears legacy court-order draft alias rows when the canonical field is emptied', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-court_order_name_change',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1000',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: null,
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: 'manual fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-court_order', 'case_number', 'Case number', '   ');

    expect(next).toEqual([
      expect.objectContaining({ document_id: null, field_key: 'case_number', field_value_masked: 'manual fallback' }),
    ]);
  });
});
