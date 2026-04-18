import { describe, expect, it } from 'vitest';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput } from '../../../lib/nameChange/types';
import {
  defaultNameChangeCaseInput,
  normalizeNameChangeCaseInput,
  normalizeNameChangeDocuments,
  normalizeNameChangeExtractedFields,
} from './nameChangeService';

function makeCase(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    ...defaultNameChangeCaseInput,
    current_first_name: '  Alex  ',
    current_middle_name: '  Marie ',
    current_last_name: ' Rivera ',
    target_first_name: ' Alex ',
    target_middle_name: '  ',
    target_last_name: ' Jordan ',
    email: ' Alex@Example.COM ',
    phone_last4: '(555) 991-2481',
    county_residence: ' San Diego ',
    marriage_date: ' 2026-04-05 ',
    change_reasons: ['marriage', ' marriage ', ''],
    structured_intake: {
      spouseLastName: ' Jordan ',
      travelBookedSoon: 1,
      wantsDocumentIntakeHelp: undefined,
    },
    ...overrides,
  };
}

describe('nameChangeService normalization', () => {
  it('normalizes case input into stable, save-safe values', () => {
    const normalized = normalizeNameChangeCaseInput(makeCase());
    expect(normalized.current_first_name).toBe('Alex');
    expect(normalized.current_middle_name).toBe('Marie');
    expect(normalized.target_middle_name).toBeNull();
    expect(normalized.email).toBe('alex@example.com');
    expect(normalized.phone_last4).toBe('2481');
    expect(normalized.county_residence).toBe('San Diego');
    expect(normalized.marriage_date).toBe('2026-04-05');
    expect(normalized.change_reasons).toEqual(['marriage']);
    expect(normalized.structured_intake).toMatchObject({
      spouseLastName: 'Jordan',
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
    });
  });

  it('dedupes documents by kind and trims metadata', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: '  Marriage cert  ',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: ' cert.pdf ',
        issuing_authority: ' San Diego County ',
      },
      {
        document_kind: 'marriage_certificate',
        display_name: ' Final certificate ',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: ' final-cert.pdf ',
        issuing_authority: ' County Clerk ',
      },
    ];

    expect(normalizeNameChangeDocuments(documents)).toEqual([
      expect.objectContaining({
        document_kind: 'marriage_certificate',
        display_name: 'Final certificate',
        file_name_masked: 'final-cert.pdf',
        issuing_authority: 'County Clerk',
      }),
    ]);
  });

  it('drops blank extracted fields and dedupes by source + key', () => {
    const fields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: ' Spouse last name ',
        field_value_masked: ' Jordan ',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse surname',
        field_value_masked: ' Jordan-Smith ',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'county',
        field_label: 'County',
        field_value_masked: '   ',
        source_type: 'manual',
        is_verified: false,
      },
    ];

    expect(normalizeNameChangeExtractedFields(fields)).toEqual([
      {
        document_id: null,
        field_key: 'spouse_last_name',
        field_label: 'Spouse surname',
        field_value_masked: 'Jordan-Smith',
        source_type: 'manual',
        is_verified: true,
      },
    ]);
  });
});
