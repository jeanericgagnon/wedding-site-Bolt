import { describe, expect, it } from 'vitest';
import { buildNameChangePdfAdapterCatalogFromTemplate } from './formPdfAdapterCatalogFromTemplate';
import type { NameChangePdfAdapterTemplatePlan } from './formPdfAdapterTemplate';

function makeTemplate(selectedPdfFieldName: string | null): NameChangePdfAdapterTemplatePlan {
  return {
    primaryAction: 'Review mappings.',
    templatePayloadJson: '{}',
    summary: {
      totalForms: 1,
      readyForReview: 1,
      needsPdfProbe: 0,
      guidedOnline: 0,
      fieldsToMap: 1,
      candidateMatches: 1,
    },
    items: [
      {
        formCode: 'SSA-SS5',
        formLabel: 'SS-5',
        officialRevisionLabel: 'Form SS-5 (12-2024) UF',
        probeStatus: 'raw_fields_found',
        probeSourceLabel: 'PDF probe: /tmp/ss-5.pdf',
        status: 'ready_for_review',
        statusLabel: 'Ready for review',
        nextAction: 'Review mapping.',
        fields: [
          {
            fieldKey: 'applicant.newLastName',
            officialFieldLabel: 'New last name',
            source: 'companion_payload',
            redactionPolicy: 'none',
            valueStatus: 'ready',
            selectedPdfFieldName,
            visualReviewConfirmed: true,
            reviewedAt: '2026-05-20',
            reviewerNote: 'Checked against local probe smoke.',
            mappingConfidence: 'manual_review',
            candidatePdfFields: [
              {
                pdfFieldName: 'LastName',
                score: 40,
                reasons: ['last token'],
              },
            ],
            note: 'Review candidates against the visual official PDF.',
          },
        ],
        unmappedPdfFieldNames: ['OtherField'],
      },
    ],
  };
}

describe('name change PDF adapter catalog from template', () => {
  it('promotes reviewed selected fields into an adapter catalog', () => {
    const plan = buildNameChangePdfAdapterCatalogFromTemplate(makeTemplate('LastName'), '2026-05-20');

    expect(plan.summary).toMatchObject({
      reviewedForms: 1,
      catalogAdapters: 1,
      mappedFields: 1,
      issues: 0,
    });
    expect(plan.catalog.adapters[0]).toMatchObject({
      formCode: 'SSA-SS5',
      officialRevisionLabel: 'Form SS-5 (12-2024) UF',
      lastMappedAt: '2026-05-20',
      fieldMappings: [
        expect.objectContaining({
          fieldKey: 'applicant.newLastName',
          pdfFieldName: 'LastName',
          confidence: 'manual_review',
          reviewAudit: {
            visualReviewConfirmed: true,
            reviewedAt: '2026-05-20',
            reviewerNote: 'Checked against local probe smoke.',
          },
        }),
      ],
    });
  });

  it('blocks catalog generation when a field has no selected PDF field', () => {
    const plan = buildNameChangePdfAdapterCatalogFromTemplate(makeTemplate(null), '2026-05-20');

    expect(plan.summary).toMatchObject({
      catalogAdapters: 0,
      mappedFields: 0,
      issues: 1,
    });
    expect(plan.issues[0]).toMatchObject({
      fieldKey: 'applicant.newLastName',
      reason: 'New last name needs a selected PDF field name.',
    });
  });

  it('blocks catalog generation when a selected field was not in the PDF probe output', () => {
    const plan = buildNameChangePdfAdapterCatalogFromTemplate(makeTemplate('NotInProbe'), '2026-05-20');

    expect(plan.summary.issues).toBe(1);
    expect(plan.issues[0].reason).toContain('was not present in the PDF probe output');
  });

  it('blocks catalog generation when a selected field is not date-stamped as reviewed', () => {
    const template = makeTemplate('LastName');
    template.items[0].fields[0].reviewedAt = null;

    const plan = buildNameChangePdfAdapterCatalogFromTemplate(template, '2026-05-20');

    expect(plan.summary.issues).toBe(1);
    expect(plan.issues[0].reason).toContain('needs reviewedAt in YYYY-MM-DD format');
    expect(plan.catalog.adapters).toEqual([]);
  });

  it('blocks catalog generation when two semantic fields use the same PDF field', () => {
    const template = makeTemplate('LastName');
    template.items[0].fields.push({
      ...template.items[0].fields[0],
      fieldKey: 'applicant.priorLastName',
      officialFieldLabel: 'Prior last name',
      selectedPdfFieldName: 'LastName',
    });

    const plan = buildNameChangePdfAdapterCatalogFromTemplate(template, '2026-05-20');

    expect(plan.summary.issues).toBe(1);
    expect(plan.issues[0].reason).toContain('selected for multiple DayOf fields');
    expect(plan.catalog.adapters).toEqual([]);
  });
});
