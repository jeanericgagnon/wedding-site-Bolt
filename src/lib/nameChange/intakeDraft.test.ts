import { describe, expect, it } from 'vitest';
import { createDraftNameChangeDocument, upsertDraftNameChangeExtractedField } from './intakeDraft';
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

  it('canonicalizes legacy court-order aliases into one stable draft document identity', () => {
    expect(createDraftNameChangeDocument('court_order_name_change', 'Court order')).toMatchObject({
      id: 'draft-court_order',
      document_kind: 'court_order',
      display_name: 'Court order',
      file_name_masked: 'court-order-•••.pdf',
    });
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
});
