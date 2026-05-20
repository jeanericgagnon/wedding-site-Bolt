import { describe, expect, it } from 'vitest';
import { buildNameChangePdfAdapterCatalog, findNameChangePdfAdapterFieldMapping } from './formPdfAdapterMap';

describe('name change PDF adapter map', () => {
  it('normalizes duplicate field mappings and summarizes review state', () => {
    const catalog = buildNameChangePdfAdapterCatalog([
      {
        formCode: 'SSA-SS5',
        officialRevisionLabel: 'Form SS-5 (12-2024) UF',
        probeSourceLabel: 'local ss-5.pdf probe',
        lastMappedAt: '2026-05-20',
        fieldMappings: [
          {
            fieldKey: 'applicant.newLastName',
            pdfFieldName: 'LastName',
            confidence: 'verified_probe',
          },
          {
            fieldKey: 'applicant.newLastName',
            pdfFieldName: 'DuplicateLastName',
            confidence: 'manual_review',
          },
          {
            fieldKey: 'supplemental.dateOfBirth',
            pdfFieldName: 'DOB',
            confidence: 'manual_review',
          },
        ],
        unmappedPdfFieldNames: ['OtherName', 'OtherName'],
      },
    ]);

    expect(catalog.summary).toMatchObject({
      totalAdapters: 1,
      mappedFields: 2,
      fieldsNeedingReview: 1,
      unmappedPdfFields: 1,
    });
    expect(catalog.adapterMapPayloadJson).toContain('"reviewOnly": true');
  });

  it('only returns mappings for the matching official revision', () => {
    const catalog = buildNameChangePdfAdapterCatalog([
      {
        formCode: 'SSA-SS5',
        officialRevisionLabel: 'Form SS-5 (12-2024) UF',
        probeSourceLabel: 'local ss-5.pdf probe',
        lastMappedAt: '2026-05-20',
        fieldMappings: [
          {
            fieldKey: 'applicant.newLastName',
            pdfFieldName: 'LastName',
            confidence: 'verified_probe',
          },
        ],
      },
    ]);

    expect(findNameChangePdfAdapterFieldMapping(catalog, 'SSA-SS5', 'Form SS-5 (12-2024) UF', 'applicant.newLastName')).toMatchObject({
      pdfFieldName: 'LastName',
    });
    expect(findNameChangePdfAdapterFieldMapping(catalog, 'SSA-SS5', 'Form SS-5 (01-2027) UF', 'applicant.newLastName')).toBeNull();
  });
});
