import { describe, expect, it } from 'vitest';
import { applyNameChangePdfAdapterCatalogToPopulationPlan } from './formPopulationCatalogApply';
import type { NameChangePdfAdapterCatalog } from './formPdfAdapterMap';
import type { NameChangeFormPopulationPlan } from './formPopulationPlan';

function makePopulationPlan(): NameChangeFormPopulationPlan {
  return {
    primaryAction: 'Probe official PDF field names for the PDF candidates before generating filled PDFs.',
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
        nextAction: 'Map New last name to an official PDF field name before generating a filled draft.',
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
            note: 'Needs mapping.',
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
}

const catalog: NameChangePdfAdapterCatalog = {
  adapterMapPayloadJson: '{}',
  summary: {
    totalAdapters: 1,
    mappedFields: 1,
    fieldsNeedingReview: 1,
    unmappedPdfFields: 0,
  },
  adapters: [
    {
      formCode: 'SSA-SS5',
      officialRevisionLabel: 'Form SS-5 (12-2024) UF',
      probeSourceLabel: 'PDF probe: /tmp/ss-5.pdf',
      lastMappedAt: '2026-05-20',
      fieldMappings: [
        {
          fieldKey: 'applicant.newLastName',
          pdfFieldName: 'LastName',
          confidence: 'manual_review',
        },
      ],
      unmappedPdfFieldNames: [],
    },
  ],
};

describe('name change population catalog apply', () => {
  it('applies matching current-revision catalog mappings and refreshes readiness', () => {
    const applied = applyNameChangePdfAdapterCatalogToPopulationPlan(makePopulationPlan(), catalog);

    expect(applied.summary).toMatchObject({
      readyForPopulation: 1,
      needsAdapterMapping: 0,
      guidedOnline: 1,
      appliedMappings: 1,
      unmappedFields: 0,
    });
    expect(applied.populationPlan.items[0]).toMatchObject({
      status: 'ready_for_population',
      statusLabel: 'Ready for population',
    });
    expect(applied.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      adapterFieldName: 'LastName',
      adapterMappingConfidence: 'manual_review',
      mappingStatus: 'mapped',
    });
  });

  it('keeps PDF forms needing mapping when the catalog revision does not match', () => {
    const staleCatalog: NameChangePdfAdapterCatalog = {
      ...catalog,
      adapters: [
        {
          ...catalog.adapters[0],
          officialRevisionLabel: 'Form SS-5 (01-2027) UF',
        },
      ],
    };

    const applied = applyNameChangePdfAdapterCatalogToPopulationPlan(makePopulationPlan(), staleCatalog);

    expect(applied.summary).toMatchObject({
      readyForPopulation: 0,
      needsAdapterMapping: 1,
      appliedMappings: 0,
      unmappedFields: 1,
    });
    expect(applied.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      adapterFieldName: null,
      mappingStatus: 'needs_pdf_field_probe',
    });
  });
});
