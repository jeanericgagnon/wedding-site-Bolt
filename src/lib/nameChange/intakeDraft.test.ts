import { describe, expect, it } from 'vitest';
import { buildDraftNameChangeDocumentId, buildDraftNameChangeDocumentMetadataFromSnapshot, buildDraftNameChangeExtractedFieldsFromSnapshot, buildNameChangeSnapshotBackedExtractedFields, createDraftNameChangeDocument, isDraftNameChangeDocumentId, isDraftNameChangePlaceholderDocument, normalizeDraftNameChangeDocumentId, upsertDraftNameChangeExtractedField } from './intakeDraft';
import type { NameChangeExtractedFieldInput } from './types';

describe('name change intake draft helpers', () => {
  it('creates draft documents with stable client ids for document-linked extraction work', () => {
    expect(createDraftNameChangeDocument('marriage_certificate', 'Certified marriage certificate')).toMatchObject({
      id: 'draft-marriage_certificate',
      document_kind: 'marriage_certificate',
      display_name: 'Certified marriage certificate',
      storage_mode: 'metadata_only',
      intake_status: 'uploaded',
      extraction_confidence: null,
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
    expect(createDraftNameChangeDocument('___' as never, ' Weird custom label ')).toMatchObject({
      id: undefined,
      document_kind: 'other',
      display_name: 'Other',
      intake_status: 'not_started',
      file_name_masked: null,
      extraction_confidence: null,
    });
    expect(buildDraftNameChangeDocumentId('___' as never)).toBe('draft-other');
    expect(buildDraftNameChangeDocumentId('other')).toBe('draft-other');
  });

  it('builds canonical extracted fields from document snapshots', () => {
    const fields = buildDraftNameChangeExtractedFieldsFromSnapshot('draft-marriage_certificate', {
      fields: {
        first_name: ' Alex ',
        spouse_family_name: ' Jordan ',
        certificate_no: ' MC-441 ',
      },
      issuanceDate: '2026-04-05T00:00:00Z',
      county: {
        value: ' County of San Diego ',
      },
    });

    expect(fields).toHaveLength(5);
    expect(fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_label: 'First Name',
        field_value_masked: 'Alex',
        source_type: 'manual',
        is_verified: true,
      }),
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'spouse_last_name',
        field_label: 'Spouse Last Name',
        field_value_masked: 'Jordan',
      }),
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_label: 'Certificate Number',
        field_value_masked: 'MC-441',
      }),
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'San Diego',
      }),
    ]));
  });

  it('builds canonical document metadata from snapshots', () => {
    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      issuingAuthority: ' California DMV ',
      issuanceDate: '2026-04-05T00:00:00Z',
      expiration_date: '2031-04-05T00:00:00Z',
      confidence: '0.88',
    })).toEqual({
      fileNameMasked: null,
      issuingAuthority: ' California DMV ',
      issuedOn: '2026-04-05',
      expiresOn: '2031-04-05',
      extractionConfidence: 0.88,
    });
  });

  it('builds canonical document metadata from nested snapshot fields', () => {
    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      fields: {
        issuing_authority: ' U.S. Department of State ',
        issued_on: '2024-06-01T00:00:00Z',
        expirationDate: '2034-06-01T00:00:00Z',
        extractionConfidence: '0.94',
      },
    })).toEqual({
      fileNameMasked: null,
      issuingAuthority: ' U.S. Department of State ',
      issuedOn: '2024-06-01',
      expiresOn: '2034-06-01',
      extractionConfidence: 0.94,
    });
  });

  it('builds canonical document metadata from snapshot metadata containers', () => {
    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      documentMetadata: {
        issuing_authority: ' County Clerk ',
        issuance_date: '2026-04-11T00:00:00Z',
        expiration_date: '2036-04-11T00:00:00Z',
        extraction_confidence: '0.96',
      },
    })).toEqual({
      fileNameMasked: null,
      issuingAuthority: ' County Clerk ',
      issuedOn: '2026-04-11',
      expiresOn: '2036-04-11',
      extractionConfidence: 0.96,
    });
  });

  it('builds canonical document metadata from meta and documentInfo snapshot containers', () => {
    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      meta: {
        issuingAuthority: 'Nevada DMV',
        issuanceDate: '2026-02-03T00:00:00Z',
      },
      documentInfo: {
        expirationDate: '2034-02-03T00:00:00Z',
        confidence: '0.89',
      },
    })).toEqual({
      fileNameMasked: null,
      issuingAuthority: 'Nevada DMV',
      issuedOn: '2026-02-03',
      expiresOn: '2034-02-03',
      extractionConfidence: 0.89,
    });
  });

  it('builds canonical extracted fields and metadata from snapshot field arrays', () => {
    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('draft-current_passport', {
      fields: [
        { field_key: 'first_name', value: 'Alex' },
        { key: 'middle_name', text: 'Marie' },
        { name: 'last_name', raw: 'Rivera' },
      ],
      metadata: [
        { fieldKey: 'issuance_date', value: '2026-03-04T00:00:00Z' },
        { key: 'extraction_confidence', value: '0.87' },
      ],
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'first_name', field_value_masked: 'Alex' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'middle_name', field_value_masked: 'Marie' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'last_name', field_value_masked: 'Rivera' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'issuance_date', field_value_masked: '2026-03-04' }),
    ]));

    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      metadata: [
        { fieldKey: 'issuing_authority', value: 'California DMV' },
        { key: 'issuance_date', value: '2026-03-04T00:00:00Z' },
        { name: 'expiration_date', value: '2034-03-04T00:00:00Z' },
        { label: 'extraction_confidence', value: '0.87' },
      ],
    })).toEqual({
      fileNameMasked: null,
      issuingAuthority: 'California DMV',
      issuedOn: '2026-03-04',
      expiresOn: '2034-03-04',
      extractionConfidence: 0.87,
    });
  });

  it('builds canonical document metadata from issue and expiry aliases', () => {
    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      issuingAgency: 'Texas DPS',
      issueDate: '2025-01-08T00:00:00Z',
      expiryDate: '2033-01-08T00:00:00Z',
      confidence: '0.91',
    })).toEqual({
      fileNameMasked: null,
      issuingAuthority: 'Texas DPS',
      issuedOn: '2025-01-08',
      expiresOn: '2033-01-08',
      extractionConfidence: 0.91,
    });
  });

  it('builds canonical snapshot truth from deeply nested value wrappers', () => {
    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('draft-current_passport', {
      fields: {
        first_name: { value: { text: 'Alex' } },
        middle_name: { fieldValue: { raw: 'Marie' } },
        last_name: { maskedValue: { value: 'Rivera' } },
      },
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'first_name', field_value_masked: 'Alex' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'middle_name', field_value_masked: 'Marie' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'last_name', field_value_masked: 'Rivera' }),
    ]));

    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      issuingAuthority: { value: { text: 'U.S. Department of State' } },
      issueDate: { value: { raw: '2025-01-08T00:00:00Z' } },
      expiryDate: { maskedValue: { value: '2035-01-08T00:00:00Z' } },
      confidence: { fieldValue: { text: '0.91' } },
    })).toEqual({
      fileNameMasked: null,
      issuingAuthority: 'U.S. Department of State',
      issuedOn: '2025-01-08',
      expiresOn: '2035-01-08',
      extractionConfidence: 0.91,
    });
  });

  it('builds canonical snapshot truth from normalized and extracted value aliases', () => {
    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('draft-marriage_certificate', {
      fields: [
        { field: 'spouse_last_name', normalizedValue: 'Jordan' },
        { fieldKey: 'county', extracted_value: 'San Diego County' },
        { key: 'certificate_number', displayValue: 'MC-441' },
      ],
      metadata: {
        issuance_date: { normalized_value: '2026-04-05T00:00:00Z' },
      },
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-marriage_certificate', field_key: 'spouse_last_name', field_value_masked: 'Jordan' }),
      expect.objectContaining({ document_id: 'draft-marriage_certificate', field_key: 'county', field_value_masked: 'San Diego' }),
      expect.objectContaining({ document_id: 'draft-marriage_certificate', field_key: 'certificate_number', field_value_masked: 'MC-441' }),
      expect.objectContaining({ document_id: 'draft-marriage_certificate', field_key: 'issuance_date', field_value_masked: '2026-04-05' }),
    ]));

    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      metadata: [
        { field: 'issuing_authority', normalizedValue: 'San Diego County Clerk' },
        { fieldKey: 'issuance_date', extractedValue: '2026-04-05T00:00:00Z' },
        { key: 'expiration_date', display_value: '2036-04-05T00:00:00Z' },
        { label: 'extraction_confidence', normalized_value: '0.97' },
      ],
    })).toEqual({
      fileNameMasked: null,
      issuingAuthority: 'San Diego County Clerk',
      issuedOn: '2026-04-05',
      expiresOn: '2036-04-05',
      extractionConfidence: 0.97,
    });
  });

  it('builds canonical snapshot truth from root-level entry arrays', () => {
    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('draft-current_passport', [
      { fieldKey: 'first_name', value: 'Alex' },
      { field: 'middle_name', normalizedValue: 'Marie' },
      { key: 'last_name', extractedValue: 'Rivera' },
      { label: 'issuance_date', value: '2024-06-01T00:00:00Z' },
    ])).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'first_name', field_value_masked: 'Alex' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'middle_name', field_value_masked: 'Marie' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'last_name', field_value_masked: 'Rivera' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'issuance_date', field_value_masked: '2024-06-01' }),
    ]));

    expect(buildDraftNameChangeDocumentMetadataFromSnapshot([
      { fieldKey: 'issuing_authority', value: 'U.S. Department of State' },
      { field: 'issuance_date', normalizedValue: '2024-06-01T00:00:00Z' },
      { key: 'expiration_date', extractedValue: '2034-06-01T00:00:00Z' },
      { label: 'extraction_confidence', value: '0.94' },
    ])).toEqual({
      fileNameMasked: null,
      issuingAuthority: 'U.S. Department of State',
      issuedOn: '2024-06-01',
      expiresOn: '2034-06-01',
      extractionConfidence: 0.94,
    });
  });

  it('builds canonical snapshot truth from stringified snapshot payloads', () => {
    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('draft-current_passport', JSON.stringify({
      fields: {
        first_name: { value: 'Alex' },
        middle_name: { normalizedValue: 'Marie' },
        last_name: { extractedValue: 'Rivera' },
      },
      metadata: {
        issuance_date: '2024-06-01T00:00:00Z',
      },
    }))).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'first_name', field_value_masked: 'Alex' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'middle_name', field_value_masked: 'Marie' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'last_name', field_value_masked: 'Rivera' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'issuance_date', field_value_masked: '2024-06-01' }),
    ]));

    expect(buildDraftNameChangeDocumentMetadataFromSnapshot(JSON.stringify([
      { fieldKey: 'issuing_authority', value: 'U.S. Department of State' },
      { field: 'issuance_date', normalizedValue: '2024-06-01T00:00:00Z' },
      { key: 'expiration_date', extractedValue: '2034-06-01T00:00:00Z' },
      { label: 'extraction_confidence', value: '0.94' },
    ]))).toEqual({
      fileNameMasked: null,
      issuingAuthority: 'U.S. Department of State',
      issuedOn: '2024-06-01',
      expiresOn: '2034-06-01',
      extractionConfidence: 0.94,
    });

    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('draft-current_passport', '{bad json')).toEqual([]);
    expect(buildDraftNameChangeDocumentMetadataFromSnapshot('{bad json')).toEqual({
      fileNameMasked: null,
      issuingAuthority: null,
      issuedOn: null,
      expiresOn: null,
      extractionConfidence: null,
    });
  });

  it('preserves persisted document ids when deriving extracted fields from snapshot truth', () => {
    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('doc-passport-123', {
      fields: {
        first_name: { value: 'Alex' },
        last_name: { value: 'Rivera' },
      },
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'doc-passport-123', field_key: 'first_name', field_value_masked: 'Alex' }),
      expect.objectContaining({ document_id: 'doc-passport-123', field_key: 'last_name', field_value_masked: 'Rivera' }),
    ]));
  });

  it('canonicalizes opaque persisted document ids into draft-kind ids when a fallback kind is provided', () => {
    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('passport-upload-final.pdf', {
      fields: {
        first_name: { value: 'Alex' },
        last_name: { value: 'Rivera' },
      },
    }, 'current_passport')).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'first_name', field_value_masked: 'Alex' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'last_name', field_value_masked: 'Rivera' }),
    ]));
  });

  it('does not duplicate snapshot-backed fields when explicit extracted rows already cover the same document kind', () => {
    const mergedFields = buildNameChangeSnapshotBackedExtractedFields(
      [{
        id: 'passport-upload-final.pdf',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        extracted_snapshot: {
          fields: {
            first_name: { value: 'Snapshot Alex' },
            issuance_date: { value: '2024-06-01' },
          },
        },
      }],
      [{
        document_id: 'passport-upload-final.pdf',
        field_key: 'first_name',
        field_label: 'First Name',
        field_value_masked: 'Verified Alex',
        source_type: 'document_extract',
        is_verified: true,
      } as NameChangeExtractedFieldInput],
    );

    expect(mergedFields.filter((field) => field.field_key === 'first_name')).toEqual([
      expect.objectContaining({ document_id: 'passport-upload-final.pdf', field_value_masked: 'Verified Alex' }),
    ]);
    expect(mergedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'issuance_date', field_value_masked: '2024-06-01' }),
    ]));
  });

  it('does not duplicate snapshot-backed fields when explicit extracted rows already use canonical draft ids', () => {
    const mergedFields = buildNameChangeSnapshotBackedExtractedFields(
      [{
        id: 'passport-upload-final.pdf',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        extracted_snapshot: {
          fields: {
            last_name: { value: 'Snapshot Rivera' },
          },
        },
      }],
      [{
        document_id: 'draft-current_passport',
        field_key: 'last_name',
        field_label: 'Last Name',
        field_value_masked: 'Verified Rivera',
        source_type: 'document_extract',
        is_verified: true,
      } as NameChangeExtractedFieldInput],
    );

    expect(mergedFields.filter((field) => field.field_key === 'last_name')).toEqual([
      expect.objectContaining({ document_id: 'draft-current_passport', field_value_masked: 'Verified Rivera' }),
    ]);
  });

  it('builds canonical snapshot truth from wrapped snapshot payloads', () => {
    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('draft-current_passport', {
      payload: {
        data: {
          fields: {
            first_name: { value: 'Alex' },
            middle_name: { normalizedValue: 'Marie' },
            last_name: { extractedValue: 'Rivera' },
          },
          metadata: {
            issuance_date: '2024-06-01T00:00:00Z',
          },
        },
      },
    })).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'first_name', field_value_masked: 'Alex' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'middle_name', field_value_masked: 'Marie' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'last_name', field_value_masked: 'Rivera' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'issuance_date', field_value_masked: '2024-06-01' }),
    ]));

    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      result: {
        snapshot: [
          { fieldKey: 'issuing_authority', value: 'U.S. Department of State' },
          { field: 'issuance_date', normalizedValue: '2024-06-01T00:00:00Z' },
          { key: 'expiration_date', extractedValue: '2034-06-01T00:00:00Z' },
          { label: 'extraction_confidence', value: '0.94' },
        ],
      },
    })).toEqual({
      fileNameMasked: null,
      issuingAuthority: 'U.S. Department of State',
      issuedOn: '2024-06-01',
      expiresOn: '2034-06-01',
      extractionConfidence: 0.94,
    });
  });

  it('builds canonical snapshot truth from double-encoded and fenced snapshot payloads', () => {
    const doubleEncodedSnapshot = JSON.stringify(JSON.stringify({
      fields: {
        first_name: { value: 'Alex' },
        middle_name: { normalizedValue: 'Marie' },
        last_name: { extractedValue: 'Rivera' },
      },
      metadata: {
        issuance_date: '2024-06-01T00:00:00Z',
      },
    }));

    expect(buildDraftNameChangeExtractedFieldsFromSnapshot('draft-current_passport', doubleEncodedSnapshot)).toEqual(expect.arrayContaining([
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'first_name', field_value_masked: 'Alex' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'middle_name', field_value_masked: 'Marie' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'last_name', field_value_masked: 'Rivera' }),
      expect.objectContaining({ document_id: 'draft-current_passport', field_key: 'issuance_date', field_value_masked: '2024-06-01' }),
    ]));

    expect(buildDraftNameChangeDocumentMetadataFromSnapshot("```json\n[\n  { \"fieldKey\": \"issuing_authority\", \"value\": \"U.S. Department of State\" },\n  { \"field\": \"issuance_date\", \"normalizedValue\": \"2024-06-01T00:00:00Z\" },\n  { \"key\": \"expiration_date\", \"extractedValue\": \"2034-06-01T00:00:00Z\" },\n  { \"label\": \"extraction_confidence\", \"value\": \"0.94\" }\n]\n```"))
      .toEqual({
        fileNameMasked: null,
        issuingAuthority: 'U.S. Department of State',
        issuedOn: '2024-06-01',
        expiresOn: '2034-06-01',
        extractionConfidence: 0.94,
      });
  });

  it('builds canonical masked filename truth from snapshot payloads', () => {
    expect(buildDraftNameChangeDocumentMetadataFromSnapshot({
      metadata: {
        file_name_masked: 'passport-reviewed-•••.pdf',
        issuing_authority: 'U.S. Department of State',
      },
    })).toEqual({
      fileNameMasked: 'passport-reviewed-•••.pdf',
      issuingAuthority: 'U.S. Department of State',
      issuedOn: null,
      expiresOn: null,
      extractionConfidence: null,
    });

    expect(buildDraftNameChangeDocumentMetadataFromSnapshot([
      { fieldKey: 'maskedFilename', value: 'license-reviewed-•••.pdf' },
    ])).toEqual({
      fileNameMasked: 'license-reviewed-•••.pdf',
      issuingAuthority: null,
      issuedOn: null,
      expiresOn: null,
      extractionConfidence: null,
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
      file_name_masked: 'court-order-draft.pdf',
    });
  });

  it('recognizes draft placeholder documents from ids or masked draft filenames', () => {
    expect(isDraftNameChangeDocumentId('draft-current_passport')).toBe(true);
    expect(isDraftNameChangeDocumentId('external-doc-id')).toBe(false);
    expect(isDraftNameChangePlaceholderDocument({ id: 'draft-current_passport', file_name_masked: 'passport-•••.pdf' })).toBe(true);
    expect(isDraftNameChangePlaceholderDocument({ id: undefined, file_name_masked: 'current-passport-draft.pdf' })).toBe(true);
    expect(isDraftNameChangePlaceholderDocument({ id: 'doc-passport', file_name_masked: 'passport-•••.pdf' })).toBe(false);
    expect(isDraftNameChangePlaceholderDocument({ id: 'external-doc-id', file_name_masked: null })).toBe(false);
  });

  it('uses draft-marked masked filenames for normal draft documents', () => {
    expect(createDraftNameChangeDocument('current_passport', 'Passport')).toMatchObject({
      file_name_masked: 'current-passport-draft.pdf',
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

  it('maps common human draft document aliases onto canonical supported kinds', () => {
    expect(createDraftNameChangeDocument('marriage cert' as never, ' Marriage cert ')).toMatchObject({
      id: 'draft-marriage_certificate',
      document_kind: 'marriage_certificate',
    });
    expect(createDraftNameChangeDocument('marriage license copy' as never, ' Marriage license copy ')).toMatchObject({
      id: 'draft-marriage_certificate',
      document_kind: 'marriage_certificate',
    });
    expect(createDraftNameChangeDocument('marriage license # copy' as never, ' Marriage license # copy ')).toMatchObject({
      id: 'draft-marriage_certificate',
      document_kind: 'marriage_certificate',
    });
    expect(createDraftNameChangeDocument('court decree' as never, ' Court decree ')).toMatchObject({
      id: 'draft-court_order',
      document_kind: 'court_order',
    });
    expect(createDraftNameChangeDocument("driver's license" as never, " Driver's license ")).toMatchObject({
      id: 'draft-current_drivers_license',
      document_kind: 'current_drivers_license',
    });
    expect(createDraftNameChangeDocument('driver license (state id)' as never, ' Driver license (state ID) ')).toMatchObject({
      id: 'draft-current_drivers_license',
      document_kind: 'current_drivers_license',
    });
    expect(createDraftNameChangeDocument('passport' as never, ' Passport ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
    });
    expect(createDraftNameChangeDocument('passport card' as never, ' Passport card ')).toMatchObject({
      id: 'draft-current_passport',
      document_kind: 'current_passport',
    });
    expect(createDraftNameChangeDocument('drivers_license' as never, ' Driver license ')).toMatchObject({
      id: 'draft-current_drivers_license',
      document_kind: 'current_drivers_license',
    });
    expect(createDraftNameChangeDocument('dmv id' as never, ' DMV ID ')).toMatchObject({
      id: 'draft-current_drivers_license',
      document_kind: 'current_drivers_license',
    });
    expect(createDraftNameChangeDocument('state identification card' as never, ' State ID ')).toMatchObject({
      id: 'draft-current_drivers_license',
      document_kind: 'current_drivers_license',
    });
    expect(createDraftNameChangeDocument('state id card' as never, ' State ID card ')).toMatchObject({
      id: 'draft-current_drivers_license',
      document_kind: 'current_drivers_license',
    });
    expect(createDraftNameChangeDocument('ssn card' as never, ' SSN card ')).toMatchObject({
      id: 'draft-social_security_card',
      document_kind: 'social_security_card',
    });
    expect(createDraftNameChangeDocument('SSA card' as never, ' SSA card ')).toMatchObject({
      id: 'draft-social_security_card',
      document_kind: 'social_security_card',
    });
    expect(createDraftNameChangeDocument('social security & SSA card' as never, ' Social security & SSA card ')).toMatchObject({
      id: 'draft-social_security_card',
      document_kind: 'social_security_card',
    });
    expect(createDraftNameChangeDocument('social security + SSA card' as never, ' Social security + SSA card ')).toMatchObject({
      id: 'draft-social_security_card',
      document_kind: 'social_security_card',
    });
    expect(createDraftNameChangeDocument('soc sec card' as never, ' Soc sec card ')).toMatchObject({
      id: 'draft-social_security_card',
      document_kind: 'social_security_card',
    });
    expect(createDraftNameChangeDocument('401k statement' as never, ' 401k statement ')).toMatchObject({
      id: 'draft-benefits_account_record',
      document_kind: 'benefits_account_record',
    });
    expect(createDraftNameChangeDocument('beneficiary form' as never, ' Beneficiary form ')).toMatchObject({
      id: 'draft-benefits_account_record',
      document_kind: 'benefits_account_record',
    });
    expect(createDraftNameChangeDocument('insurance member card' as never, ' Insurance member card ')).toMatchObject({
      id: 'draft-insurance_card',
      document_kind: 'insurance_card',
    });
    expect(createDraftNameChangeDocument('license renewal notice' as never, ' License renewal notice ')).toMatchObject({
      id: 'draft-professional_license_record',
      document_kind: 'professional_license_record',
    });
    expect(createDraftNameChangeDocument('birth cert' as never, ' Birth cert ')).toMatchObject({
      id: 'draft-birth_certificate',
      document_kind: 'birth_certificate',
    });
    expect(createDraftNameChangeDocument('vital record' as never, ' Vital record ')).toMatchObject({
      id: 'draft-birth_certificate',
      document_kind: 'birth_certificate',
    });
    expect(createDraftNameChangeDocument('utility bill' as never, ' Utility bill ')).toMatchObject({
      id: 'draft-proof_of_address',
      document_kind: 'proof_of_address',
    });
    expect(createDraftNameChangeDocument('bank statement' as never, ' Bank statement ')).toMatchObject({
      id: 'draft-proof_of_address',
      document_kind: 'proof_of_address',
    });
    expect(createDraftNameChangeDocument('lease agreement' as never, ' Lease agreement ')).toMatchObject({
      id: 'draft-proof_of_address',
      document_kind: 'proof_of_address',
    });
    expect(createDraftNameChangeDocument('proof of residence' as never, ' Proof of residence ')).toMatchObject({
      id: 'draft-proof_of_address',
      document_kind: 'proof_of_address',
    });
    expect(createDraftNameChangeDocument('residency document' as never, ' Residency document ')).toMatchObject({
      id: 'draft-proof_of_address',
      document_kind: 'proof_of_address',
    });
    expect(normalizeDraftNameChangeDocumentId('draft-social-security-card-copy')).toBe('draft-social_security_card');
  });

  it('falls back unknown draft document aliases to other instead of inventing unsupported kinds', () => {
    expect(createDraftNameChangeDocument('temporary visa card' as never, ' Temporary visa card ')).toMatchObject({
      id: undefined,
      document_kind: 'other',
      display_name: 'Other',
      intake_status: 'not_started',
    });
    expect(normalizeDraftNameChangeDocumentId('draft-temporary-visa-card')).toBeNull();
  });

  it('maps common human draft field aliases onto canonical supported keys', () => {
    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issue date' as never, '  ', '2024-06-01')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issued on' as never, '  ', '2024-06-01')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issued dt' as never, '  ', '2024-06-01')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'case no' as never, '  ', '24-CV-1188')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_label: 'Case Number',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'case #' as never, '  ', '24-CV-1188')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_label: 'Case Number',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed on' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'entered on' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'order entered on' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'order filed on' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'court filed date' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'date signed' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'execution date' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'date of signature' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'date of execution' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'date of filing' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signature date' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'filing date' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed dt' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'entry dt' as never, '  ', '2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_label: 'Court Order Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'date of issuance' as never, '  ', '2024-06-01')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'cert no' as never, '  ', 'MC-123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_label: 'Certificate Number',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'cert #' as never, '  ', 'MC-124')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_label: 'Certificate Number',
        field_value_masked: 'MC-124',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'cert number' as never, '  ', 'MC-456')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_label: 'Certificate Number',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'marriage certificate number' as never, '  ', 'MC-789')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_label: 'Certificate Number',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'docket no' as never, '  ', '24-CV-1188')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_label: 'Case Number',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'case + docket no' as never, '  ', '24-CV-1188')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_label: 'Case Number',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'case #' as never, '  ', '24-CV-1189')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_label: 'Case Number',
        field_value_masked: '24-CV-1189',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issue dt' as never, '  ', '2024-06-01')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-proof_of_address', 'resident county' as never, '  ', 'san diego')).toEqual([
      expect.objectContaining({
        document_id: 'draft-proof_of_address',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'San Diego',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-proof_of_address', 'residence county' as never, '  ', 'orange')).toEqual([
      expect.objectContaining({
        document_id: 'draft-proof_of_address',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-proof_of_address', 'county residence name' as never, '  ', 'riverside')).toEqual([
      expect.objectContaining({
        document_id: 'draft-proof_of_address',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Riverside',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-proof_of_address', 'county (residence)' as never, '  ', 'orange')).toEqual([
      expect.objectContaining({
        document_id: 'draft-proof_of_address',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-proof_of_address', 'county + residence' as never, '  ', 'orange')).toEqual([
      expect.objectContaining({
        document_id: 'draft-proof_of_address',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-proof_of_address', 'county, residence' as never, '  ', 'orange')).toEqual([
      expect.objectContaining({
        document_id: 'draft-proof_of_address',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'middle initial' as never, '  ', 'Q')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'middle_name',
        field_label: 'Middle Name',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'first given name' as never, '  ', 'alice')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'first_name',
        field_label: 'First Name',
        field_value_masked: 'Alice',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'middle given name' as never, '  ', 'beth')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'middle_name',
        field_label: 'Middle Name',
        field_value_masked: 'Beth',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'spouse family name' as never, '  ', 'Jordan')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'spouse_last_name',
        field_label: 'Spouse Last Name',
      }),
    ]);
  });

  it('humanizes person-name draft field values into stable title case', () => {
    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'given_name' as never, '  ', '  aLIcia   ')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'spouse family name' as never, '  ', '  joRDAN  ')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'spouse_last_name',
        field_value_masked: 'Jordan',
      }),
    ]);
  });

  it('strips person-name labels out of draft field values before canonicalizing them', () => {
    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'first_name', 'First name', 'First name: aLIcia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'first_name', 'First name', 'First name: « Alicia »')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'last_name', 'Last name', 'New legal name - joNES')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'last_name',
        field_value_masked: 'Jones',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'spouse_last_name', 'Spouse last name', "Spouse's surname: SMITh")).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'spouse_last_name',
        field_value_masked: 'Smith',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'last_name', 'Last name', 'New legal name - smith,')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'last_name',
        field_value_masked: 'Smith',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name: "alicia"')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name = Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name — Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name. Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name | Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name; Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name； Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name / Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name ~ Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name 〜 Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name ／ Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name—Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name＃ Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name。 Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name﹕ Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name∶ Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name⁄ Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name︓ Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name∣ Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', '> First name: Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', '> [x] First name: Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', '☑ First name: Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', '• First name: Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', '[x] First name: Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', 'First name：『alicia』')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'first_name', 'First name', '~ First name: Alicia')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'middle_name', 'Middle name', 'Middle initial: q.')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'middle_name',
        field_value_masked: 'Q',
      }),
    ]);
  });

  it('uppercases number-like draft field values into stable canonical ids', () => {
    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'case #' as never, '  ', ' 24-cv-1188 ')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_value_masked: '24-CV-1188',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'cert no' as never, '  ', ' mc-123 ')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'case #' as never, '  ', ' 24 cv / 1188 ')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_value_masked: '24 CV/1188',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'cert #' as never, '  ', ' mc - 123 ')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'case #' as never, '  ', ' 24–cv—1188 ')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_value_masked: '24-CV-1188',
      }),
    ]);
  });

  it('strips reference-number labels out of draft case and certificate values', () => {
    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'case_number', 'Case number', 'Case No. 24-cv-1188')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'case_number',
        field_value_masked: '24-CV-1188',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate #: mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate #: mc - 123.')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate #: (mc - 123)')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number = mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number — mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number. mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number | mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number; mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number； mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number / mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number ~ mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number 〜 mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number ／ mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number—mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number＃ mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number。 mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number﹔ mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number꞉ mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number⧸ mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number﹦ mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate numberǀ mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', '› Certificate number: mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number: 《 mc - 123 》')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', '> [x] Certificate number: mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', '✓ Certificate number: mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', '1) Certificate number: mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', '[ ] Certificate number: mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', 'Certificate number：【mc - 123】')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'certificate_number', 'Certificate number', '〜 Certificate number: mc - 123')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'certificate_number',
        field_value_masked: 'MC-123',
      }),
    ]);
  });

  it('normalizes slash-formatted draft dates into iso yyyy-mm-dd values', () => {
    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '4/5/2026')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'issue date' as never, '  ', '6-1-2024')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_value_masked: '2024-06-01',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/4/5')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 5, 2026')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'Apr. 5, 2026')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'Apr 5 2026')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 5th, 2026')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '5th Apr 2026')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '5 Apr 2026')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '5-Apr-2026')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '20260405')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '04052026')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026.4.5')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026 4 5')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05T12:30:00Z')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 12:30:00')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05+00:00')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05Z')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 UTC')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 (PST)')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 [PST]')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 [UTC]')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 America/Los_Angeles')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05, 12:30:00 PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05, 12:30:00 UTC')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 GMT-7')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 GMT+0')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 UTC-7')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05    UTC-7')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 1:30 pm')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 1:30 PM')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 z')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 utc+0')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 UTC +0')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 GMT -7')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '04/05/2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 5, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '5 April 2026 13:30 UTC')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026.04.05 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026 04 05 13:30 UTC')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '5-Apr-2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '20260405 13:30 UTC')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '04052026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026.04.05 13:30 UTC')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '04/05/2026 1:30 pm PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 5, 2026 1:30 pm PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 UTC+05:30')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 GMT -07:00')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/13/05 UTC+05:30')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026/13/05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 31, 2026 1:30 pm PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: 'April 31, 2026',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 America/Argentina/Buenos_Aires')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 13:30 America/North_Dakota/New_Salem')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026-04-05 America/Port-au-Prince')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 13:30 America/Indiana/Tell-City')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '04/05/2026 13:30 +05:30')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 5, 2026 -07:00')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '04/05/2026 13:30 +5:30')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 5, 2026 -7:00')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '04/05/2026 13:30 +530')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 5, 2026 -700')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 13:30 UTC+530')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 5, 2026 GMT-700')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', '2026/04/05 13:30 UTC + 530')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'April 5, 2026 GMT - 700')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'Friday, April 5, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'Fri. April 31, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: 'April 31, 2026',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'Signed date: Friday, April 5, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on April 31, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: 'April 31, 2026',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'Date of signature: Friday, April 5, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Date of issuance: April 31, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: 'April 31, 2026',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'Date of signature Friday, April 5, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Date of issuance April 31, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: 'April 31, 2026',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on: 2026-04-05.')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on: 〈2026-04-05〉')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on: (2026-04-05)')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Date of issuance: "April 5, 2026"')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on = 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on — 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on. 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on | 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on; 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on； 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on / 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on ~ 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on 〜 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on ／ 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on—2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on＃ 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on。 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on﹕ 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on∶ 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on⁄ 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on︓ 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued onᐟ 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', '> Issued on: 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', '> [x] Issued on: 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', '☑ Issued on: 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', '• Issued on: 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', '(x) Issued on: 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', 'Issued on：（2026-04-05）')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'issued date' as never, '  ', '~ Issued on: 2026-04-05')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'issuance_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'Executed on Friday, April 5, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: '2026-04-05',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'signed date' as never, '  ', 'Entered on April 31, 2026 1:30 PM PST')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'court_order_date',
        field_value_masked: 'April 31, 2026',
      }),
    ]);
  });

  it('ignores unsupported draft field aliases instead of inventing non-contract keys', () => {
    const startingFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'draft-current_passport',
        field_key: 'issuance_date',
        field_label: 'Issuance Date',
        field_value_masked: '2024-06-01',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    expect(upsertDraftNameChangeExtractedField(startingFields, 'draft-current_passport', 'expiration date' as never, '  ', '2034-06-01')).toEqual(startingFields);
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
    expect(normalizeDraftNameChangeDocumentId('marriage_certificate')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('currentPassport')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('court order name change')).toBe('draft-court_order');
    expect(normalizeDraftNameChangeDocumentId('marriage certificate document')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('passport upload')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('driver license front image')).toBe('draft-current_drivers_license');
    expect(normalizeDraftNameChangeDocumentId('document marriage certificate')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('uploaded passport document')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('scan driver license front')).toBe('draft-current_drivers_license');
    expect(normalizeDraftNameChangeDocumentId('marriage certificate pdf')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('jpg passport upload')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('driver license front image png')).toBe('draft-current_drivers_license');
    expect(normalizeDraftNameChangeDocumentId('uploads/marriage certificate.pdf')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('documents/passport-upload.jpg')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('reviewed/draft-current_drivers_license.png')).toBe('draft-current_drivers_license');
    expect(normalizeDraftNameChangeDocumentId('uploads/marriage certificate.pdf?download=1')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('documents/passport-upload.jpg#page=1')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('uploads/marriage%20certificate.pdf?token=abc')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('blob:https://dayof.love/passport-upload.jpg')).toBeNull();
    expect(normalizeDraftNameChangeDocumentId('attachments/final marriage certificate (1).pdf')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('reviewed/passport upload v2.jpg')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('tmp/edited driver license front page 1.png')).toBe('draft-current_drivers_license');
    expect(normalizeDraftNameChangeDocumentId('https://cdn.dayof.love/object/123?filename=marriage%20certificate.pdf&token=abc')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('https://cdn.dayof.love/object/123?file=passport%20upload.jpg')).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId('https://cdn.dayof.love/object/123?response-content-disposition=attachment%3B%20filename%3D%22marriage%20certificate.pdf%22&token=abc')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId("https://cdn.dayof.love/object/123?response-content-disposition=attachment%3B%20filename*%3DUTF-8''passport%2520upload.jpg")).toBe('draft-current_passport');
    expect(normalizeDraftNameChangeDocumentId("https://cdn.dayof.love/object/123?response-content-disposition=attachment%3B%20filename*%3DUTF-8'en'marriage%2520certificate.pdf")).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('https://cdn.dayof.love/object/123?response-content-disposition=attachment%3B%20filename*0*%3DUTF-8%27%27marriage%2520%3B%20filename*1*%3Dcertificate.pdf')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId('draft')).toBeNull();
    expect(normalizeDraftNameChangeDocumentId('draft-other')).toBeNull();
    expect(normalizeDraftNameChangeDocumentId('draft other')).toBeNull();
    expect(normalizeDraftNameChangeDocumentId(' draft-marriage_certificate ')).toBe('draft-marriage_certificate');
    expect(normalizeDraftNameChangeDocumentId(' external-doc-id ')).toBe('external-doc-id');
    expect(normalizeDraftNameChangeDocumentId('draft-___')).toBeNull();
    expect(normalizeDraftNameChangeDocumentId(null)).toBeNull();
  });

  it('ignores malformed draft document ids instead of leaking fields into manual fallback rows', () => {
    const startingFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: null,
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: 'manual fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    expect(upsertDraftNameChangeExtractedField(startingFields, 'draft-___', 'case_number', 'Case number', '24-CV-1188')).toEqual(startingFields);
  });

  it('ignores bare draft document ids instead of attaching fields to fallback other drafts', () => {
    const startingFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: null,
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: 'manual fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    expect(upsertDraftNameChangeExtractedField(startingFields, 'draft', 'case_number', 'Case number', '24-CV-1188')).toEqual(startingFields);
  });

  it('ignores fallback other draft document ids instead of attaching extracted fields to non-doc state', () => {
    const startingFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: null,
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: 'manual fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    expect(upsertDraftNameChangeExtractedField(startingFields, 'draft-other', 'case_number', 'Case number', '24-CV-1188')).toEqual(startingFields);
  });

  it('ignores punctuated fallback other draft document ids instead of attaching extracted fields to non-doc state', () => {
    const startingFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: null,
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: 'manual fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    expect(upsertDraftNameChangeExtractedField(startingFields, 'draft/other', 'case_number', 'Case number', '24-CV-1188')).toEqual(startingFields);
  });

  it('ignores spaced fallback other draft document ids instead of attaching extracted fields to non-doc state', () => {
    const startingFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: null,
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: 'manual fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    expect(upsertDraftNameChangeExtractedField(startingFields, 'draft other', 'case_number', 'Case number', '24-CV-1188')).toEqual(startingFields);
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

  it('canonicalizes county values that include common county affixes', () => {
    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Orange County')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'County of Los Angeles')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Los Angeles',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county: san diego county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'San Diego',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county: ‹orange county›')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Orange Co.')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county: orange county,')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'County: (orange county)')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county = orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county — orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county. orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county | orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county; orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county； orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county / orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county ~ orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county 〜 orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county ／ orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county—orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county＃ orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county。 orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county﹔ orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county꞉ orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county⧸ orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county︔ orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county❘ orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', '» Residence county: orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', '> [x] Residence county: orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', '✓ Residence county: orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', '• Residence county: orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', '[X] Residence county: orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', 'Residence county：【orange county】')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);

    expect(upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county', 'County', '∼ Residence county: orange county')).toEqual([
      expect.objectContaining({
        document_id: 'draft-marriage_certificate',
        field_key: 'county',
        field_value_masked: 'Orange',
      }),
    ]);
  });

  it('collapses repeated whitespace in fallback humanized draft labels', () => {
    const next = upsertDraftNameChangeExtractedField([], 'draft-marriage_certificate', 'county__residence' as never, '   ', 'San Diego');

    expect(next).toEqual([
      expect.objectContaining({
        field_key: 'county',
        field_label: 'County',
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

  it('splits composite target legal-name draft intake into first middle and last fields', () => {
    expect(upsertDraftNameChangeExtractedField([], 'draft-court_order', 'target legal name' as never, 'Target legal name', ' Alicia  Quinn   Jordan ')).toEqual([
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'first_name',
        field_label: 'Target legal name first name',
        field_value_masked: 'Alicia',
      }),
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'middle_name',
        field_label: 'Target legal name middle name',
        field_value_masked: 'Quinn',
      }),
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'last_name',
        field_label: 'Target legal name last name',
        field_value_masked: 'Jordan',
      }),
    ]);
  });

  it('replaces stale target-name components when composite new legal-name intake is re-entered', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-court_order',
        field_key: 'first_name',
        field_label: 'Target first name',
        field_value_masked: 'Alex',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: 'draft-court_order',
        field_key: 'middle_name',
        field_label: 'Target middle name',
        field_value_masked: 'Marie',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: 'draft-court_order',
        field_key: 'last_name',
        field_label: 'Target last name',
        field_value_masked: 'Jordan',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: null,
        field_key: 'last_name',
        field_label: 'Target last name',
        field_value_masked: 'Fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-court_order', 'new legal name' as never, 'New legal name', 'Alicia Rae Jordan');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: null,
        field_key: 'last_name',
        field_value_masked: 'Fallback',
      }),
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'middle_name',
        field_value_masked: 'Rae',
      }),
      expect.objectContaining({
        document_id: 'draft-court_order',
        field_key: 'last_name',
        field_value_masked: 'Jordan',
      }),
    ]);
  });

  it('splits composite current legal-name draft intake into first middle and last fields', () => {
    expect(upsertDraftNameChangeExtractedField([], 'draft-current_passport', 'current legal name' as never, 'Current legal name', ' Alicia  Quinn   Rivera ')).toEqual([
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'first_name',
        field_label: 'Current legal name first name',
        field_value_masked: 'Alicia',
      }),
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'middle_name',
        field_label: 'Current legal name middle name',
        field_value_masked: 'Quinn',
      }),
      expect.objectContaining({
        document_id: 'draft-current_passport',
        field_key: 'last_name',
        field_label: 'Current legal name last name',
        field_value_masked: 'Rivera',
      }),
    ]);
  });

  it('replaces stale current-name components when composite current-name intake is re-entered', () => {
    const next = upsertDraftNameChangeExtractedField([
      {
        document_id: 'draft-current_drivers_license',
        field_key: 'first_name',
        field_label: 'Current first name',
        field_value_masked: 'Alex',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: 'draft-current_drivers_license',
        field_key: 'middle_name',
        field_label: 'Current middle name',
        field_value_masked: 'Marie',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: 'draft-current_drivers_license',
        field_key: 'last_name',
        field_label: 'Current last name',
        field_value_masked: 'Jordan',
        source_type: 'manual',
        is_verified: true,
      },
      {
        document_id: null,
        field_key: 'last_name',
        field_label: 'Current last name',
        field_value_masked: 'Fallback',
        source_type: 'manual',
        is_verified: true,
      },
    ], 'draft-current_drivers_license', 'current name' as never, 'Current name', 'Alicia Rae Rivera');

    expect(next).toEqual([
      expect.objectContaining({
        document_id: null,
        field_key: 'last_name',
        field_value_masked: 'Fallback',
      }),
      expect.objectContaining({
        document_id: 'draft-current_drivers_license',
        field_key: 'first_name',
        field_value_masked: 'Alicia',
      }),
      expect.objectContaining({
        document_id: 'draft-current_drivers_license',
        field_key: 'middle_name',
        field_value_masked: 'Rae',
      }),
      expect.objectContaining({
        document_id: 'draft-current_drivers_license',
        field_key: 'last_name',
        field_value_masked: 'Rivera',
      }),
    ]);
  });
});
