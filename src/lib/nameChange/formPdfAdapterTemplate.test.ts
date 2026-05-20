import { describe, expect, it } from 'vitest';
import { buildNameChangePdfAdapterTemplatePlan } from './formPdfAdapterTemplate';
import type { NameChangeFormPopulationPlan } from './formPopulationPlan';

const populationPlan: NameChangeFormPopulationPlan = {
  primaryAction: 'Probe PDFs.',
  populationPayloadJson: '{}',
  summary: {
    totalForms: 2,
    readyForPopulation: 0,
    needsAdapterMapping: 1,
    guidedOnline: 1,
    needsInput: 0,
    needsSecureSession: 0,
    pdfFillCandidates: 1,
  },
  items: [
    {
      formCode: 'SSA-SS5',
      formLabel: 'SS-5',
      officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
      officialRevisionLabel: 'Form SS-5 (12-2024) UF',
      adapterKind: 'official_pdf_fill',
      status: 'needs_adapter_mapping',
      statusLabel: 'Needs PDF mapping',
      nextAction: 'Map fields.',
      blockers: [],
      fieldMappings: [
        {
          fieldKey: 'applicant.newLastName',
          officialFieldLabel: 'New last name',
          source: 'companion_payload',
          adapterFieldName: null,
          mappingStatus: 'needs_pdf_field_probe',
          value: 'Jordan',
          hasValue: true,
          valueStatus: 'ready',
          redactionPolicy: 'none',
          note: 'Needs probe.',
        },
        {
          fieldKey: 'supplemental.dateOfBirth',
          officialFieldLabel: 'Date of birth',
          source: 'supplemental_intake',
          adapterFieldName: null,
          mappingStatus: 'needs_pdf_field_probe',
          value: null,
          hasValue: true,
          valueStatus: 'available',
          sensitivity: 'sensitive',
          redactionPolicy: 'requires_consent',
          note: 'Needs probe.',
        },
      ],
    },
    {
      formCode: 'CA-DL-44',
      formLabel: 'California DMV',
      officialUrl: 'https://www.dmv.ca.gov/',
      officialRevisionLabel: 'CA DMV online',
      adapterKind: 'guided_online_entry',
      status: 'guided_online',
      statusLabel: 'Guided online',
      nextAction: 'Guide online.',
      blockers: [],
      fieldMappings: [],
    },
  ],
};

describe('name change PDF adapter template', () => {
  it('suggests likely PDF field candidates from probe output', () => {
    const plan = buildNameChangePdfAdapterTemplatePlan(populationPlan, [
      {
        formCode: 'SSA-SS5',
        filePath: '/tmp/ss-5.pdf',
        fieldCount: 3,
        fieldNames: ['LastName', 'DOB', 'UnrelatedField'],
        probeStatus: 'raw_fields_found',
      },
    ]);

    expect(plan.summary).toMatchObject({
      totalForms: 2,
      readyForReview: 1,
      guidedOnline: 1,
      fieldsToMap: 2,
    });
    expect(plan.items[0]).toMatchObject({
      formCode: 'SSA-SS5',
      status: 'ready_for_review',
    });
    expect(plan.items[0].fields[0].candidatePdfFields[0]).toMatchObject({
      pdfFieldName: 'LastName',
    });
    expect(plan.items[0].fields[1].candidatePdfFields[0]).toMatchObject({
      pdfFieldName: 'DOB',
    });
    expect(plan.items[0].unmappedPdfFieldNames).toContain('UnrelatedField');
  });

  it('marks PDF forms as needing a probe when no raw field names are supplied', () => {
    const plan = buildNameChangePdfAdapterTemplatePlan(populationPlan, []);

    expect(plan.summary).toMatchObject({
      needsPdfProbe: 1,
      fieldsToMap: 0,
    });
    expect(plan.items[0]).toMatchObject({
      status: 'needs_pdf_probe',
      probeSourceLabel: 'No PDF probe result supplied',
    });
  });
});
