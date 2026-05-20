import { describe, expect, it } from 'vitest';
import { buildNameChangePopulationIntakeGapPlan } from './formPopulationIntakeGaps';
import type { NameChangeFormPopulationPlan } from './formPopulationPlan';

const populationPlan: NameChangeFormPopulationPlan = {
  primaryAction: 'Collect missing info.',
  populationPayloadJson: '{}',
  summary: {
    totalForms: 2,
    readyForPopulation: 0,
    needsAdapterMapping: 1,
    guidedOnline: 0,
    needsInput: 1,
    needsSecureSession: 0,
    pdfFillCandidates: 2,
  },
  items: [
    {
      formCode: 'SSA-SS5',
      formLabel: 'Social Security card update',
      officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
      officialRevisionLabel: 'Form SS-5 (12-2024) UF',
      adapterKind: 'official_pdf_fill',
      status: 'needs_input',
      statusLabel: 'Needs info',
      nextAction: 'Collect missing user information.',
      blockers: ['Date of birth is missing.'],
      fieldMappings: [
        {
          fieldKey: 'supplemental.dateOfBirth',
          officialFieldLabel: 'Date of birth',
          source: 'supplemental_intake',
          adapterFieldName: null,
          mappingStatus: 'blocked',
          value: null,
          hasValue: false,
          valueStatus: 'missing',
          sensitivity: 'sensitive',
          redactionPolicy: 'requires_consent',
          note: 'Date of birth needs a user value before this form can be populated.',
        },
        {
          fieldKey: 'supplemental.socialSecurityNumber',
          officialFieldLabel: 'Social Security number',
          source: 'supplemental_intake',
          adapterFieldName: null,
          mappingStatus: 'blocked',
          value: null,
          hasValue: false,
          valueStatus: 'secure_session_required',
          sensitivity: 'secure_session_only',
          redactionPolicy: 'requires_secure_session',
          note: 'Social Security number must be collected in a secure session.',
        },
      ],
    },
    {
      formCode: 'DS-11',
      formLabel: 'Passport application',
      officialUrl: 'https://travel.state.gov/',
      officialRevisionLabel: 'DS-11 06-2024',
      adapterKind: 'official_pdf_fill',
      status: 'needs_adapter_mapping',
      statusLabel: 'Needs PDF mapping',
      nextAction: 'Map missing PDF fields.',
      blockers: [],
      fieldMappings: [
        {
          fieldKey: 'supplemental.dateOfBirth',
          officialFieldLabel: 'Date of birth',
          source: 'supplemental_intake',
          adapterFieldName: null,
          mappingStatus: 'blocked',
          value: null,
          hasValue: false,
          valueStatus: 'missing',
          sensitivity: 'sensitive',
          redactionPolicy: 'requires_consent',
          note: 'Date of birth needs a user value before this form can be populated.',
        },
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
          note: 'Official PDF field names still need to be probed.',
        },
      ],
    },
  ],
};

describe('name change population intake gaps', () => {
  it('groups missing, secure, consent, and mapping blockers without leaking values', () => {
    const plan = buildNameChangePopulationIntakeGapPlan(populationPlan);

    expect(plan.summary).toMatchObject({
      totalGaps: 3,
      secureSession: 1,
      consent: 1,
      pdfMapping: 1,
      impactedForms: 2,
    });
    expect(plan.gaps.find((gap) => gap.fieldKey === 'supplemental.dateOfBirth')).toMatchObject({
      category: 'consent',
      formCodes: ['SSA-SS5', 'DS-11'],
      officialRevisionLabels: ['Form SS-5 (12-2024) UF', 'DS-11 06-2024'],
      currentValueKnown: false,
    });
    expect(plan.gaps.find((gap) => gap.fieldKey === 'supplemental.socialSecurityNumber')).toMatchObject({
      category: 'secure_session',
      statusLabel: 'Secure session',
    });
    expect(plan.gaps.find((gap) => gap.fieldKey === 'applicant.newLastName')).toMatchObject({
      category: 'pdf_mapping',
      currentValueKnown: true,
    });
    expect(plan.intakeGapJson).not.toContain('Jordan');
  });
});
