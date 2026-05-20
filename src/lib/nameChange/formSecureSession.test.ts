import { describe, expect, it } from 'vitest';
import { buildNameChangeSecureSessionPlan } from './formSecureSession';
import type { NameChangeFormPopulationPlan } from './formPopulationPlan';
import type { NameChangeSupplementalIntakePlan } from './formSupplementalIntake';

const populationPlan: NameChangeFormPopulationPlan = {
  primaryAction: 'Collect missing details.',
  populationPayloadJson: '{}',
  summary: {
    totalForms: 1,
    readyForPopulation: 0,
    needsAdapterMapping: 0,
    guidedOnline: 0,
    needsInput: 1,
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
      status: 'needs_input',
      statusLabel: 'Needs info',
      nextAction: 'Collect missing user information.',
      blockers: ['Date of birth is missing from supplemental intake.'],
      fieldMappings: [],
    },
  ],
};

const supplementalPlan: NameChangeSupplementalIntakePlan = {
  primaryAction: 'Collect supplemental details.',
  summary: {
    total: 4,
    available: 2,
    missing: 1,
    secureSessionRequired: 1,
  },
  prompts: [
    {
      promptKey: 'socialSecurityNumber',
      label: 'Social Security number',
      question: 'Enter your Social Security number in a secure form session.',
      helperText: 'Do not store this in the normal planner.',
      formCodes: ['SSA-SS5'],
      sensitivity: 'secure_session_only',
      status: 'secure_session_required',
      statusLabel: 'Secure session',
      currentValueLabel: null,
      priority: 1,
    },
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
      promptKey: 'placeOfBirth',
      label: 'Place of birth',
      question: 'What city and state or country are listed as your place of birth?',
      helperText: 'Needed for SSA.',
      formCodes: ['SSA-SS5'],
      sensitivity: 'sensitive',
      status: 'available',
      statusLabel: 'Available',
      currentValueLabel: 'Boston, Massachusetts',
      priority: 2,
    },
    {
      promptKey: 'email',
      label: 'Email address',
      question: 'What email should agencies use?',
      helperText: 'Already available.',
      formCodes: ['SSA-SS5'],
      sensitivity: 'standard',
      status: 'available',
      statusLabel: 'Available',
      currentValueLabel: 'alex@example.com',
      priority: 3,
    },
  ],
};

describe('name change secure session plan', () => {
  it('separates ephemeral-only fields from save-with-consent fields', () => {
    const plan = buildNameChangeSecureSessionPlan(supplementalPlan, populationPlan);

    expect(plan.summary).toMatchObject({
      total: 3,
      ephemeralOnly: 1,
      saveWithConsent: 1,
      useExistingWithConsent: 1,
      missingPopulationForms: 1,
    });
    expect(plan.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fieldKey: 'secure.socialSecurityNumber',
        policy: 'ephemeral_only',
        statusLabel: 'Secure entry only',
      }),
      expect.objectContaining({
        fieldKey: 'secure.dateOfBirth',
        policy: 'save_with_consent',
        statusLabel: 'Save only with consent',
        hasCurrentValue: false,
      }),
      expect.objectContaining({
        fieldKey: 'secure.placeOfBirth',
        policy: 'use_existing_with_consent',
        statusLabel: 'Use only with consent',
        currentValueLabel: null,
        hasCurrentValue: true,
      }),
    ]));
    expect(plan.secureSessionJson).toContain('Do not store in normal planner state.');
    expect(plan.secureSessionJson).not.toContain('Boston, Massachusetts');
  });
});
