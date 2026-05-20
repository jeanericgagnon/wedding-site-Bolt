import { describe, expect, it } from 'vitest';
import { buildNameChangeDraftReadinessPlan } from './formDraftReadiness';
import type { NameChangeConsentPlan } from './formConsentPlan';
import type { NameChangeFormCompanionIntakePrompt } from './formCompanionIntake';
import type { NameChangeFormPopulationPlan } from './formPopulationPlan';
import type { NameChangeSecureSessionPlan } from './formSecureSession';
import type { NameChangeSupplementalIntakePlan } from './formSupplementalIntake';

const emptySupplementalPlan: NameChangeSupplementalIntakePlan = {
  primaryAction: 'Supplemental details are ready.',
  summary: {
    total: 0,
    available: 0,
    missing: 0,
    secureSessionRequired: 0,
  },
  prompts: [],
};

const emptySecureSessionPlan: NameChangeSecureSessionPlan = {
  primaryAction: 'No secure session needed.',
  secureSessionJson: '{}',
  summary: {
    total: 0,
    ephemeralOnly: 0,
    saveWithConsent: 0,
    useExistingWithConsent: 0,
    missingPopulationForms: 0,
  },
  fields: [],
};

const emptyConsentPlan: NameChangeConsentPlan = {
  primaryAction: 'No consent needed.',
  consentPayloadJson: '{}',
  summary: {
    total: 0,
    needsConsent: 0,
    ephemeralAcknowledgments: 0,
    saveConsents: 0,
    useExistingConsents: 0,
  },
  items: [],
};

function makePopulationPlan(overrides: Partial<NameChangeFormPopulationPlan['summary']> = {}): NameChangeFormPopulationPlan {
  const summary = {
    totalForms: 1,
    readyForPopulation: 1,
    needsAdapterMapping: 0,
    guidedOnline: 0,
    needsInput: 0,
    needsSecureSession: 0,
    pdfFillCandidates: 1,
    ...overrides,
  };

  return {
    primaryAction: 'Ready.',
    populationPayloadJson: '{}',
    summary,
    items: [
      {
        formCode: 'SSA-SS5',
        formLabel: 'SS-5',
        officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
        officialRevisionLabel: 'Form SS-5 (12-2024) UF',
        adapterKind: 'official_pdf_fill',
        status: summary.readyForPopulation > 0 ? 'ready_for_population' : 'needs_adapter_mapping',
        statusLabel: summary.readyForPopulation > 0 ? 'Ready for population' : 'Needs PDF mapping',
        nextAction: 'Generate review-only draft.',
        blockers: [],
        fieldMappings: [],
      },
    ],
  };
}

describe('name change draft readiness plan', () => {
  it('prioritizes shared intake before secure, consent, or mapping work', () => {
    const prompts: NameChangeFormCompanionIntakePrompt[] = [
      {
        promptKey: 'missing:applicant.newLastName',
        fieldKey: 'applicant.newLastName',
        label: 'New last name',
        question: 'What last name should appear after the name change?',
        helperText: 'Answer once.',
        status: 'missing',
        statusLabel: 'Needs answer',
        priority: 0,
        currentValue: null,
        formattedValue: null,
        impactedForms: ['SSA-SS5'],
        sourceLabels: ['Saved intake'],
      },
    ];
    const secureSessionPlan: NameChangeSecureSessionPlan = {
      ...emptySecureSessionPlan,
      summary: {
        ...emptySecureSessionPlan.summary,
        total: 1,
        ephemeralOnly: 1,
      },
    };

    const plan = buildNameChangeDraftReadinessPlan(
      prompts,
      emptySupplementalPlan,
      secureSessionPlan,
      emptyConsentPlan,
      makePopulationPlan({ readyForPopulation: 0, needsAdapterMapping: 1 }),
    );

    expect(plan.status).toBe('needs_intake');
    expect(plan.summary).toMatchObject({
      missingInput: 1,
      secureEntryFields: 1,
      adapterMappingsNeeded: 1,
    });
    expect(plan.steps[0]).toMatchObject({
      stepKey: 'shared_intake',
      status: 'blocked',
      count: 1,
    });
  });

  it('requires consent for saved sensitive values without exposing them in readiness JSON', () => {
    const consentPlan: NameChangeConsentPlan = {
      ...emptyConsentPlan,
      summary: {
        total: 1,
        needsConsent: 1,
        ephemeralAcknowledgments: 0,
        saveConsents: 0,
        useExistingConsents: 1,
      },
      items: [
        {
          consentKey: 'consent.dateOfBirth',
          fieldKey: 'secure.dateOfBirth',
          label: 'Date of birth',
          consentType: 'use_existing_sensitive_value',
          status: 'needs_consent',
          statusLabel: 'Needs use consent',
          prompt: 'Confirm DayOf may use the saved date of birth for this review-only draft.',
          retentionPolicy: 'Use only for this review-only draft.',
          formCodes: ['SSA-SS5'],
        },
      ],
    };

    const plan = buildNameChangeDraftReadinessPlan(
      [],
      emptySupplementalPlan,
      {
        ...emptySecureSessionPlan,
        summary: {
          ...emptySecureSessionPlan.summary,
          total: 1,
          useExistingWithConsent: 1,
        },
      },
      consentPlan,
      makePopulationPlan({ readyForPopulation: 0, needsAdapterMapping: 1 }),
    );

    expect(plan.status).toBe('needs_consent');
    expect(plan.steps.find((step) => step.stepKey === 'consent')).toMatchObject({
      status: 'next',
      count: 1,
    });
    expect(plan.readinessPayloadJson).not.toContain('1994-08-14');
  });

  it('marks the draft path ready when intake, secure, consent, and mapping gates are clear', () => {
    const plan = buildNameChangeDraftReadinessPlan(
      [],
      emptySupplementalPlan,
      emptySecureSessionPlan,
      emptyConsentPlan,
      makePopulationPlan(),
    );

    expect(plan.status).toBe('ready_for_review_draft');
    expect(plan.summary).toMatchObject({
      reviewDraftForms: 1,
      blockingSteps: 0,
    });
    expect(plan.steps.at(-1)).toMatchObject({
      stepKey: 'draft_output',
      status: 'next',
    });
  });
});
