import { describe, expect, it } from 'vitest';
import { buildNameChangeFormCompanion, type NameChangeOfficialFormSource } from './formCompanion';
import { buildNameChangeFormCompanionPacket } from './formCompanionPacket';
import { buildNameChangeFormPopulationPlan } from './formPopulationPlan';
import { buildNameChangePdfAdapterCatalog } from './formPdfAdapterMap';
import type { NameChangeSupplementalIntakePlan } from './formSupplementalIntake';
import type { NameChangeFormPayloadSnapshot } from './types';

const source: NameChangeOfficialFormSource = {
  formCode: 'SSA-SS5',
  formLabel: 'Social Security Administration SS-5',
  officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
  officialFormsIndexUrl: 'https://www.ssa.gov/forms/',
  officialRevisionLabel: 'Form SS-5 (12-2024) UF',
  lastCheckedAt: '2026-05-20',
  verificationStatus: 'verified_current',
  submissionNote: 'User must review, sign, and submit through official instructions.',
};

function makeCompanion(formCode: string, value: string | null) {
  const payload: NameChangeFormPayloadSnapshot = {
    formCode,
    fields: [
      {
        fieldKey: 'applicant.newLastName',
        label: 'New last name',
        required: true,
        value,
        source: 'canonical_case',
        confidence: value ? 'high' : 'low',
      },
    ],
    summary: {
      ready: value ? 1 : 0,
      missing: value ? 0 : 1,
      trustedReady: value ? 1 : 0,
      lowConfidence: value ? 0 : 1,
      extractedBacked: 0,
    },
  };

  return buildNameChangeFormCompanion(payload, {
    ...source,
    formCode,
    formLabel: `${formCode} form`,
    officialUrl: formCode === 'CA-DL-44'
      ? 'https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/dl-id-online-app-edl-44/'
      : source.officialUrl,
  }, {
    'applicant.newLastName': {
      section: 'Name',
      officialFieldLabel: 'New last name',
      userInstruction: 'Use this as the new last name.',
    },
  });
}

describe('name change form population plan', () => {
  it('marks PDF forms as needing field probing before production fill', () => {
    const packet = buildNameChangeFormCompanionPacket([
      makeCompanion('SSA-SS5', 'Jordan'),
      makeCompanion('DS-82', 'Jordan'),
    ]);

    const plan = buildNameChangeFormPopulationPlan(packet);

    expect(plan.summary).toMatchObject({
      totalForms: 2,
      needsAdapterMapping: 2,
      pdfFillCandidates: 2,
    });
    expect(plan.items[0]).toMatchObject({
      adapterKind: 'official_pdf_fill',
      status: 'needs_adapter_mapping',
      statusLabel: 'Needs PDF mapping',
    });
    expect(plan.items[0].fieldMappings[0]).toMatchObject({
      source: 'companion_payload',
      adapterFieldName: null,
      mappingStatus: 'needs_pdf_field_probe',
      hasValue: true,
      redactionPolicy: 'none',
    });
  });

  it('keeps California DMV as guided online instead of a PDF fill target', () => {
    const packet = buildNameChangeFormCompanionPacket([
      makeCompanion('CA-DL-44', 'Jordan'),
    ]);

    const plan = buildNameChangeFormPopulationPlan(packet);

    expect(plan.summary).toMatchObject({
      guidedOnline: 1,
      pdfFillCandidates: 0,
    });
    expect(plan.items[0]).toMatchObject({
      adapterKind: 'guided_online_entry',
      status: 'guided_online',
      statusLabel: 'Guided online',
    });
  });

  it('marks PDF forms ready when current-revision adapter mappings cover the draft fields', () => {
    const packet = buildNameChangeFormCompanionPacket([
      makeCompanion('SSA-SS5', 'Jordan'),
    ]);
    const adapterCatalog = buildNameChangePdfAdapterCatalog([
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

    const plan = buildNameChangeFormPopulationPlan(packet, undefined, adapterCatalog);

    expect(plan.summary).toMatchObject({
      readyForPopulation: 1,
      needsAdapterMapping: 0,
    });
    expect(plan.items[0]).toMatchObject({
      status: 'ready_for_population',
      statusLabel: 'Ready for population',
    });
    expect(plan.items[0].fieldMappings[0]).toMatchObject({
      mappingStatus: 'mapped',
      adapterFieldName: 'LastName',
      adapterMappingConfidence: 'verified_probe',
    });
  });

  it('keeps PDF forms blocked on mapping when the adapter revision does not match', () => {
    const packet = buildNameChangeFormCompanionPacket([
      makeCompanion('SSA-SS5', 'Jordan'),
    ]);
    const adapterCatalog = buildNameChangePdfAdapterCatalog([
      {
        formCode: 'SSA-SS5',
        officialRevisionLabel: 'Form SS-5 (01-2027) UF',
        probeSourceLabel: 'stale ss-5.pdf probe',
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

    const plan = buildNameChangeFormPopulationPlan(packet, undefined, adapterCatalog);

    expect(plan.summary.needsAdapterMapping).toBe(1);
    expect(plan.items[0].fieldMappings[0]).toMatchObject({
      mappingStatus: 'needs_pdf_field_probe',
      adapterFieldName: null,
    });
  });

  it('blocks adapters when required user values are missing', () => {
    const packet = buildNameChangeFormCompanionPacket([
      makeCompanion('SSA-SS5', null),
    ]);

    const plan = buildNameChangeFormPopulationPlan(packet);

    expect(plan.primaryAction).toBe('Collect the missing user information first, then refresh the population plan.');
    expect(plan.items[0]).toMatchObject({
      status: 'needs_input',
      blockers: ['New last name is missing.'],
    });
    expect(plan.items[0].fieldMappings[0]).toMatchObject({
      mappingStatus: 'blocked',
      value: null,
      hasValue: false,
    });
  });

  it('feeds supplemental missing and secure-session requirements into population readiness', () => {
    const packet = buildNameChangeFormCompanionPacket([
      makeCompanion('SSA-SS5', 'Jordan'),
    ]);
    const supplementalPlan: NameChangeSupplementalIntakePlan = {
      primaryAction: 'Collect supplemental details.',
      summary: {
        total: 2,
        available: 0,
        missing: 1,
        secureSessionRequired: 1,
      },
      prompts: [
        {
          promptKey: 'dateOfBirth',
          label: 'Date of birth',
          question: 'What is your date of birth?',
          helperText: 'Needed for SSA.',
          formCodes: ['SSA-SS5'],
          sensitivity: 'sensitive',
          status: 'missing',
          statusLabel: 'Needs answer',
          currentValueLabel: null,
          priority: 0,
        },
        {
          promptKey: 'socialSecurityNumber',
          label: 'Social Security number',
          question: 'Enter your Social Security number in a secure form session.',
          helperText: 'Needed for SSA.',
          formCodes: ['SSA-SS5'],
          sensitivity: 'secure_session_only',
          status: 'secure_session_required',
          statusLabel: 'Secure session',
          currentValueLabel: null,
          priority: 1,
        },
      ],
    };

    const plan = buildNameChangeFormPopulationPlan(packet, supplementalPlan);

    expect(plan.summary.needsInput).toBe(1);
    expect(plan.items[0]).toMatchObject({
      status: 'needs_input',
      blockers: [
        'Date of birth is missing from supplemental intake.',
        'Social Security number requires a secure form session.',
      ],
    });
    expect(plan.items[0].fieldMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fieldKey: 'supplemental.dateOfBirth',
        officialFieldLabel: 'Date of birth',
        source: 'supplemental_intake',
        mappingStatus: 'blocked',
        valueStatus: 'missing',
        value: null,
        hasValue: false,
        redactionPolicy: 'requires_consent',
      }),
      expect.objectContaining({
        fieldKey: 'supplemental.socialSecurityNumber',
        officialFieldLabel: 'Social Security number',
        source: 'supplemental_intake',
        mappingStatus: 'blocked',
        valueStatus: 'secure_session_required',
        sensitivity: 'secure_session_only',
        redactionPolicy: 'requires_secure_session',
      }),
    ]));
  });

  it('redacts available sensitive supplemental values from copyable adapter JSON', () => {
    const packet = buildNameChangeFormCompanionPacket([
      makeCompanion('DS-82', 'Jordan'),
    ]);
    const supplementalPlan: NameChangeSupplementalIntakePlan = {
      primaryAction: 'Supplemental details represented.',
      summary: {
        total: 2,
        available: 2,
        missing: 0,
        secureSessionRequired: 0,
      },
      prompts: [
        {
          promptKey: 'dateOfBirth',
          label: 'Date of birth',
          question: 'What is your date of birth?',
          helperText: 'Needed for passport.',
          formCodes: ['DS-82'],
          sensitivity: 'sensitive',
          status: 'available',
          statusLabel: 'Available',
          currentValueLabel: '1994-08-14',
          priority: 2,
        },
        {
          promptKey: 'email',
          label: 'Email address',
          question: 'What email should agencies use?',
          helperText: 'Needed for passport.',
          formCodes: ['DS-82'],
          sensitivity: 'standard',
          status: 'available',
          statusLabel: 'Available',
          currentValueLabel: 'alex@example.com',
          priority: 3,
        },
      ],
    };

    const plan = buildNameChangeFormPopulationPlan(packet, supplementalPlan);

    expect(plan.items[0].fieldMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fieldKey: 'supplemental.dateOfBirth',
        value: null,
        hasValue: true,
        redactionPolicy: 'requires_consent',
      }),
      expect.objectContaining({
        fieldKey: 'supplemental.email',
        value: 'alex@example.com',
        hasValue: true,
        redactionPolicy: 'none',
      }),
    ]));
    expect(plan.populationPayloadJson).not.toContain('1994-08-14');
    expect(plan.populationPayloadJson).toContain('alex@example.com');
  });
});
