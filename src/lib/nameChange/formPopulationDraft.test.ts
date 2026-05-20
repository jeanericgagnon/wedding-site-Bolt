import { describe, expect, it } from 'vitest';
import { buildNameChangePopulationDraftPlan } from './formPopulationDraft';
import type { NameChangeFormPopulationPlan } from './formPopulationPlan';

function makePopulationPlan(fieldOverrides: Partial<NameChangeFormPopulationPlan['items'][number]['fieldMappings'][number]> = {}): NameChangeFormPopulationPlan {
  const field = {
    fieldKey: 'applicant.newLastName',
    officialFieldLabel: 'New last name',
    source: 'companion_payload' as const,
    adapterFieldName: 'LastName',
    adapterMappingConfidence: 'verified_probe' as const,
    mappingStatus: 'mapped' as const,
    value: 'Jordan',
    hasValue: true,
    valueStatus: 'ready' as const,
    redactionPolicy: 'none' as const,
    note: 'Mapped.',
    ...fieldOverrides,
  };

  return {
    primaryAction: 'Generate review-only draft outputs.',
    populationPayloadJson: '{}',
    summary: {
      totalForms: 1,
      readyForPopulation: 1,
      needsAdapterMapping: 0,
      guidedOnline: 0,
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
        status: 'ready_for_population',
        statusLabel: 'Ready for population',
        nextAction: 'Generate review-only draft.',
        blockers: [],
        fieldMappings: [field],
      },
    ],
  };
}

describe('name change population draft plan', () => {
  it('creates safe PDF field assignments for mapped non-sensitive fields', () => {
    const plan = buildNameChangePopulationDraftPlan(makePopulationPlan());

    expect(plan.summary).toMatchObject({
      readyDrafts: 1,
      assignments: 1,
      blockedFields: 0,
    });
    expect(plan.items[0].assignments[0]).toMatchObject({
      fieldKey: 'applicant.newLastName',
      pdfFieldName: 'LastName',
      value: 'Jordan',
      source: 'saved_value',
    });
  });

  it('blocks redacted sensitive fields instead of leaking their values into the draft JSON', () => {
    const plan = buildNameChangePopulationDraftPlan(makePopulationPlan({
      fieldKey: 'supplemental.dateOfBirth',
      officialFieldLabel: 'Date of birth',
      source: 'supplemental_intake',
      adapterFieldName: 'DOB',
      value: null,
      hasValue: true,
      valueStatus: 'available',
      sensitivity: 'sensitive',
      redactionPolicy: 'requires_consent',
    }));

    expect(plan.summary).toMatchObject({
      readyDrafts: 0,
      blockedDrafts: 1,
      assignments: 0,
      blockedFields: 1,
    });
    expect(plan.items[0].blockers[0].reason).toContain('requires explicit consent');
    expect(plan.draftPayloadJson).not.toContain('1994-08-14');
  });

  it('blocks fields that have not been mapped to PDF field names', () => {
    const plan = buildNameChangePopulationDraftPlan(makePopulationPlan({
      adapterFieldName: null,
      mappingStatus: 'needs_pdf_field_probe',
    }));

    expect(plan.items[0]).toMatchObject({
      status: 'blocked',
      assignments: [],
    });
    expect(plan.items[0].blockers[0].reason).toBe('New last name is not mapped to a PDF field yet.');
  });
});
