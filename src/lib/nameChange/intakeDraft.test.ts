import { describe, expect, it } from 'vitest';
import { buildDraftNameChangeDocumentId, createDraftNameChangeDocument, normalizeDraftNameChangeDocumentId, upsertDraftNameChangeExtractedField } from './intakeDraft';
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

  it('falls back to other when a draft document kind normalizes empty', () => {
    expect(createDraftNameChangeDocument('___' as never, '   ')).toMatchObject({
      id: 'draft-other',
      document_kind: 'other',
      display_name: 'Other',
    });
    expect(buildDraftNameChangeDocumentId('___' as never)).toBe('draft-other');
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

  it('trims messy draft document kinds before canonicalizing ids and labels', () => {
    expect(createDraftNameChangeDocument(' court_order_name_change ' as never, ' Court order ')).toMatchObject({
      id: 'draft-court_order',
      document_kind: 'court_order',
      display_name: 'Court order',
    });
    expect(normalizeDraftNameChangeDocumentId('draft- court_order_name_change ')).toBe('draft-court_order');
  });

  it('normalizes spaced draft document kinds into canonical underscore ids', () => {
    expect(createDraftNameChangeDocument(' court order name change ' as never, ' Court order ')).toMatchObject({
      id: 'draft-court_order',
      document_kind: 'court_order',
    });
    expect(normalizeDraftNameChangeDocumentId('draft- court order name change ')).toBe('draft-court_order');
  });

  it('normalizes hyphenated draft document kinds into canonical underscore ids', () => {
    expect(createDraftNameChangeDocument('current-passport' as never, ' Passport ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
      display_name: 'Passport',
    });
    expect(normalizeDraftNameChangeDocumentId('draft-current-passport')).toBe('draft-current_passport');
  });

  it('collapses repeated underscores in messy draft document kinds and ids', () => {
    expect(createDraftNameChangeDocument('current__passport' as never, ' Passport ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
    });
    expect(normalizeDraftNameChangeDocumentId('draft-current__passport')).toBe('draft-current_passport');
  });

  it('trims edge underscores from messy draft document kinds and ids', () => {
    expect(createDraftNameChangeDocument('_current_passport_' as never, ' Passport ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
    });
    expect(normalizeDraftNameChangeDocumentId('draft-_court_order_name_change_')).toBe('draft-court_order');
  });

  it('normalizes slash-delimited draft document kinds and ids', () => {
    expect(createDraftNameChangeDocument('current/passport' as never, ' Passport ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
    });
    expect(normalizeDraftNameChangeDocumentId('draft-court/order/name/change')).toBe('draft-court_order');
  });

  it('normalizes backslash-delimited draft document kinds and ids', () => {
    expect(createDraftNameChangeDocument('current\\passport' as never, ' Passport ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
    });
    expect(normalizeDraftNameChangeDocumentId('draft\\courtOrderNameChange')).toBe('draft-court_order');
  });

  it('normalizes punctuated draft document kinds and ids', () => {
    expect(createDraftNameChangeDocument('current.passport' as never, ' Passport ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
    });
    expect(normalizeDraftNameChangeDocumentId('draft:court.order.name.change')).toBe('draft-court_order');
  });

  it('normalizes uppercase draft document kinds before canonicalizing ids', () => {
    expect(createDraftNameChangeDocument('CURRENT PASSPORT' as never, ' Passport ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
      display_name: 'Passport',
    });
    expect(normalizeDraftNameChangeDocumentId('draft-COURT-ORDER-NAME-CHANGE')).toBe('draft-court_order');
  });

  it('normalizes camelCase draft document kinds before canonicalizing ids', () => {
    expect(createDraftNameChangeDocument('currentPassport' as never, ' Passport ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
      display_name: 'Passport',
    });
    expect(normalizeDraftNameChangeDocumentId('draft-courtOrderNameChange')).toBe('draft-court_order');
  });

  it('deduplicates camelCase draft document ids during extracted-field upserts', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-currentPassport' as never,
        field_key: 'issuance_date',
        field_label: 'Issuance date',
        field_value_masked: '2020-01-01',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-current_passport', 'issuance_date', 'Issuance date', '2024-06-01');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('normalizes messy draft prefixes before canonicalizing draft ids', () => {
    expect(normalizeDraftNameChangeDocumentId('draft _ CURRENT PASSPORT')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('draft - court order name change')).toBe('draft-court_order');
    expect(normalizeDraftNameChangeDocumentId('draftcurrentPassport')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('draft/currentPassport')).toBe('draft-current_passport');
  });

  it('normalizes legacy draft document ids onto the canonical draft id', () => {
    expect(normalizeDraftNameChangeDocumentId('draft-court_order_name_change')).toBe('draft-court_order');
    expect(normalizeDraftNameChangeDocumentId('draft')).toBe('draft-other');
    expect(normalizeDraftNameChangeDocumentId(' draft-marriage_certificate ')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId(' external-doc-id ')).toBe('external-doc-id');
    expect(normalizeDraftNameChangeDocumentId('draft-___')).toBeNull();
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

  it('normalizes messy draft field keys before storing manual extraction rows', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-current_passport', ' Issuance Date ' as never, '  ', ' 2024-06-01 ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('normalizes camelCase draft field keys before storing manual extraction rows', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issuanceDate' as never, '  ', ' 2024-06-01 ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('collapses repeated underscores in messy draft field keys before storing rows', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issuance__date' as never, '  ', ' 2024-06-01 ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('trims edge underscores from messy draft field keys before storing rows', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-current_passport', '_issuance_date_' as never, '  ', ' 2024-06-01 ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('normalizes slash-delimited draft field keys before storing rows', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issuance/date' as never, '  ', ' 2024-06-01 ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('normalizes backslash-delimited draft field keys before storing rows', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issuance\\date' as never, '  ', ' 2024-06-01 ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('normalizes punctuated draft field keys before storing rows', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issuance.date' as never, '  ', ' 2024-06-01 ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('ignores empty draft field keys instead of creating malformed rows', () => {
    const startingFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issue date',
        field_value_masked: '2024-06-01',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    expect(upsertDraftNameChangeExtractedField(startingFields, 'draft-current_passport', '___' as never, '  ', ' 2025-01-01 ')).toEqual(startingFields);
  });

  it('deduplicates camelCase draft field-key rows instead of leaving duplicates behind', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-current_passport',
        field_key: 'issuanceDate' as never,
        field_label: 'Issue date',
        field_value_masked: '2020-01-01',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-current_passport', 'issuance_date', 'Issuance date', '2024-06-01');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('clears camelCase draft document-id rows when the canonical field is emptied', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-currentPassport' as never,
        field_key: 'issuance_date',
        field_label: 'Issue date',
        field_value_masked: '2020-01-01',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: null,
        field_key: 'issuance_date',
        field_label: 'Issue date',
        field_value_masked: 'manual fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-current_passport', 'issuance_date', 'Issuance date', '   ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: null,
        field_key: 'issuance_date',
        field_value_masked: 'manual fallback',
      }),
    ]);
  });

  it('deduplicates combined camelCase draft ids and field keys in one upsert', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-courtOrderNameChange' as never,
        field_key: 'caseNumber' as never,
        field_label: 'Case number',
        field_value_masked: '24-CV-1000',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-court_order', 'case_number', 'Case number', '24-CV-1188');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_value_masked: '24-CV-1188',
      }),
    ]);
  });

  it('replaces legacy messy draft field-key rows instead of leaving duplicates behind', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-current_passport',
        field_key: 'Issuance Date' as never,
        field_label: 'Issue date',
        field_value_masked: '2020-01-01',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-current_passport', 'issuance_date', 'Issuance date', '2024-06-01');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_value_masked: '2024-06-01',
      }),
    ]);
  });

  it('clears messy draft field-key rows when the canonical field is emptied', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-current_passport',
        field_key: 'Issuance Date' as never,
        field_label: 'Issue date',
        field_value_masked: '2020-01-01',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: null,
        field_key: 'issuance_date',
        field_label: 'Issue date',
        field_value_masked: 'manual fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-current_passport', 'issuance_date', 'Issuance date', '   ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: null,
        field_key: 'issuance_date',
        field_value_masked: 'manual fallback',
      }),
    ]);
  });

  it('clears camelCase draft field-key rows when the canonical field is emptied', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-current_passport',
        field_key: 'issuanceDate' as never,
        field_label: 'Issue date',
        field_value_masked: '2020-01-01',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: null,
        field_key: 'issuance_date',
        field_label: 'Issue date',
        field_value_masked: 'manual fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-current_passport', 'issuance_date', 'Issuance date', '   ');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: null,
        field_key: 'issuance_date',
        field_value_masked: 'manual fallback',
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
