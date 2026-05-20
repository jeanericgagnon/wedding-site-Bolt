import { describe, expect, it } from 'vitest';
import { applyNameChangePopulationIntakeAnswers, type NameChangePopulationIntakeAnswerPayload } from './formPopulationIntakeAnswerApply';
import type { NameChangeFormPopulationPlan } from './formPopulationPlan';

function makePopulationPlan(): NameChangeFormPopulationPlan {
  return {
    primaryAction: 'Collect missing user information.',
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
        formLabel: 'Social Security card update',
        officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
        officialRevisionLabel: 'Form SS-5 (12-2024) UF',
        adapterKind: 'official_pdf_fill',
        status: 'needs_input',
        statusLabel: 'Needs info',
        nextAction: 'Collect missing info.',
        blockers: ['County of residence is missing.'],
        fieldMappings: [
          {
            fieldKey: 'applicant.county',
            officialFieldLabel: 'County of residence',
            source: 'companion_payload',
            adapterFieldName: 'County',
            mappingStatus: 'blocked',
            value: null,
            hasValue: false,
            valueStatus: 'missing',
            redactionPolicy: 'none',
            note: 'County of residence needs a user value before any population adapter can use it.',
          },
        ],
      },
    ],
  };
}

function makeAnswerContext(source: 'companion_payload' | 'supplemental_intake' = 'companion_payload') {
  return {
    formCodes: ['SSA-SS5'],
    officialRevisionLabels: ['Form SS-5 (12-2024) UF'],
    sources: [source],
  };
}

describe('name change population intake answer apply', () => {
  it('applies a standard answer once and refreshes population readiness', () => {
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:user_info:applicant.county',
          fieldKey: 'applicant.county',
          kind: 'standard_answer',
          answerContext: {
            formCodes: ['SSA-SS5'],
            officialRevisionLabels: ['Form SS-5 (12-2024) UF'],
            sources: ['companion_payload'],
          },
          answerValue: 'Los Angeles',
          retentionPolicy: 'normal_planner',
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(makePopulationPlan(), answers);

    expect(plan.summary).toMatchObject({
      matchedAnswers: 1,
      appliedAnswers: 1,
      contextMismatchedAnswers: 0,
      duplicateAnswers: 0,
      kindMismatchedAnswers: 0,
      retentionMismatchedAnswers: 0,
      unmatchedAnswers: 0,
      readyForPopulation: 1,
      needsInput: 0,
      issues: 0,
    });
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: 'Los Angeles',
      hasValue: true,
      mappingStatus: 'mapped',
      redactionPolicy: 'none',
    });
  });

  it('requires explicit draft-use consent for consent answers', () => {
    const populationPlan = makePopulationPlan();
    populationPlan.items[0].fieldMappings[0] = {
      ...populationPlan.items[0].fieldMappings[0],
      fieldKey: 'supplemental.dateOfBirth',
      officialFieldLabel: 'Date of birth',
      source: 'supplemental_intake',
      redactionPolicy: 'requires_consent',
    };
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          fieldKey: 'supplemental.dateOfBirth',
          kind: 'consent_answer',
          answerContext: makeAnswerContext('supplemental_intake'),
          answerValue: '1994-08-14',
          retentionPolicy: 'save_or_use_only_with_consent',
          consentToUseInDraft: false,
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(populationPlan, answers);

    expect(plan.summary.issues).toBe(1);
    expect(plan.issues[0]).toMatchObject({
      code: 'draft_use_consent_missing',
      fieldKey: 'supplemental.dateOfBirth',
    });
    expect(plan.populationPlan.items[0].fieldMappings[0].value).toBeNull();
  });

  it('defaults consent answer audits to consent-scoped retention', () => {
    const populationPlan = makePopulationPlan();
    populationPlan.items[0].fieldMappings[0] = {
      ...populationPlan.items[0].fieldMappings[0],
      fieldKey: 'supplemental.dateOfBirth',
      officialFieldLabel: 'Date of birth',
      source: 'supplemental_intake',
      redactionPolicy: 'requires_consent',
    };
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          fieldKey: 'supplemental.dateOfBirth',
          kind: 'consent_answer',
          answerContext: makeAnswerContext('supplemental_intake'),
          answerValue: '1994-08-14',
          consentToUseInDraft: true,
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(populationPlan, answers);

    expect(plan.summary).toMatchObject({
      appliedAnswers: 1,
      retentionMismatchedAnswers: 0,
      issues: 0,
    });
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: '1994-08-14',
      redactionPolicy: 'none',
      intakeAnswerAudit: expect.objectContaining({
        kind: 'consent_answer',
        retentionPolicy: 'save_or_use_only_with_consent',
        consentToUseInDraft: true,
      }),
    });
  });

  it('marks secure-session answers as ephemeral when applied', () => {
    const populationPlan = makePopulationPlan();
    populationPlan.items[0].fieldMappings[0] = {
      ...populationPlan.items[0].fieldMappings[0],
      fieldKey: 'supplemental.socialSecurityNumber',
      officialFieldLabel: 'Social Security number',
      source: 'supplemental_intake',
      redactionPolicy: 'requires_secure_session',
    };
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          fieldKey: 'supplemental.socialSecurityNumber',
          kind: 'secure_session_answer',
          answerContext: makeAnswerContext('supplemental_intake'),
          answerValue: '123-45-6789',
          retentionPolicy: 'ephemeral_only',
          consentToUseInDraft: true,
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(populationPlan, answers);

    expect(plan.summary).toMatchObject({
      appliedAnswers: 1,
      readyForPopulation: 1,
      issues: 0,
    });
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: '123-45-6789',
      redactionPolicy: 'none',
      intakeAnswerAudit: expect.objectContaining({
        kind: 'secure_session_answer',
        retentionPolicy: 'ephemeral_only',
        consentToUseInDraft: true,
      }),
    });
  });

  it('fails stale answer files when answers do not match the current population plan', () => {
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:user_info:passport.bookNumber',
          fieldKey: 'passport.bookNumber',
          kind: 'standard_answer',
          answerValue: 'A1234567',
          retentionPolicy: 'normal_planner',
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(makePopulationPlan(), answers);

    expect(plan.summary).toMatchObject({
      matchedAnswers: 0,
      appliedAnswers: 0,
      unmatchedAnswers: 1,
      issues: 1,
      needsInput: 1,
    });
    expect(plan.issues[0]).toMatchObject({
      code: 'unmatched_answer',
      fieldKey: 'passport.bookNumber',
      answerKey: 'answer:user_info:passport.bookNumber',
    });
    expect(plan.issues[0].message).not.toContain('A1234567');
  });

  it('fails malformed answer entries without crashing or writing values into issues', () => {
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        null as never,
        {
          fieldKey: 'applicant.county',
          kind: 'surprise_answer' as never,
          answerValue: 'Los Angeles',
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(makePopulationPlan(), answers);

    expect(plan.summary).toMatchObject({
      answers: 2,
      matchedAnswers: 0,
      appliedAnswers: 0,
      malformedAnswers: 2,
      unmatchedAnswers: 0,
      issues: 2,
      needsInput: 1,
    });
    expect(plan.issues).toEqual([
      expect.objectContaining({
        code: 'malformed_answer',
        fieldKey: 'answers[0]',
      }),
      expect.objectContaining({
        code: 'malformed_answer',
        fieldKey: 'applicant.county',
      }),
    ]);
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: null,
      hasValue: false,
    });
    expect(JSON.stringify(plan.issues)).not.toContain('Los Angeles');
  });

  it('fails answers that match the field key but come from another form context', () => {
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:user_info:applicant.county',
          fieldKey: 'applicant.county',
          kind: 'standard_answer',
          answerContext: {
            formCodes: ['DS-11'],
            officialRevisionLabels: ['DS-11 06-2024'],
            sources: ['companion_payload'],
          },
          answerValue: 'Los Angeles',
          retentionPolicy: 'normal_planner',
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(makePopulationPlan(), answers);

    expect(plan.summary).toMatchObject({
      matchedAnswers: 1,
      appliedAnswers: 0,
      contextMismatchedAnswers: 1,
      unmatchedAnswers: 0,
      issues: 1,
      needsInput: 1,
    });
    expect(plan.issues[0]).toMatchObject({
      code: 'answer_context_mismatch',
      fieldKey: 'applicant.county',
      answerKey: 'answer:user_info:applicant.county',
    });
    expect(plan.issues[0].message).not.toContain('Los Angeles');
  });

  it('fails direct answers that omit form context before applying values', () => {
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:user_info:applicant.county',
          fieldKey: 'applicant.county',
          kind: 'standard_answer',
          answerValue: 'Los Angeles',
          retentionPolicy: 'normal_planner',
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(makePopulationPlan(), answers);

    expect(plan.summary).toMatchObject({
      matchedAnswers: 1,
      appliedAnswers: 0,
      contextMissingAnswers: 1,
      contextMismatchedAnswers: 0,
      unmatchedAnswers: 0,
      issues: 1,
      needsInput: 1,
    });
    expect(plan.issues[0]).toMatchObject({
      code: 'answer_context_missing',
      fieldKey: 'applicant.county',
      answerKey: 'answer:user_info:applicant.county',
    });
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: null,
      hasValue: false,
    });
    expect(plan.issues[0].message).not.toContain('Los Angeles');
  });

  it('fails duplicate answers for the same template field without leaking either value', () => {
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:user_info:applicant.county',
          fieldKey: 'applicant.county',
          kind: 'standard_answer',
          answerValue: 'Los Angeles',
          retentionPolicy: 'normal_planner',
        },
        {
          answerKey: 'answer:user_info:applicant.county',
          fieldKey: 'applicant.county',
          kind: 'standard_answer',
          answerValue: 'Orange',
          retentionPolicy: 'normal_planner',
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(makePopulationPlan(), answers);

    expect(plan.summary).toMatchObject({
      answers: 2,
      matchedAnswers: 0,
      appliedAnswers: 0,
      duplicateAnswers: 1,
      unmatchedAnswers: 0,
      issues: 1,
      needsInput: 1,
    });
    expect(plan.issues[0]).toMatchObject({
      code: 'duplicate_answer',
      fieldKey: 'applicant.county',
      answerKey: 'answer:user_info:applicant.county',
    });
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: null,
      redactionPolicy: 'none',
    });
    expect(plan.issues[0].message).not.toContain('Los Angeles');
    expect(plan.issues[0].message).not.toContain('Orange');
  });

  it('fails mislabeled answers for consent-gated fields before removing redaction', () => {
    const populationPlan = makePopulationPlan();
    populationPlan.items[0].fieldMappings[0] = {
      ...populationPlan.items[0].fieldMappings[0],
      fieldKey: 'supplemental.dateOfBirth',
      officialFieldLabel: 'Date of birth',
      source: 'supplemental_intake',
      redactionPolicy: 'requires_consent',
    };
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:user_info:supplemental.dateOfBirth',
          fieldKey: 'supplemental.dateOfBirth',
          kind: 'standard_answer',
          answerContext: makeAnswerContext('supplemental_intake'),
          answerValue: '1994-08-14',
          retentionPolicy: 'normal_planner',
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(populationPlan, answers);

    expect(plan.summary).toMatchObject({
      matchedAnswers: 1,
      appliedAnswers: 0,
      kindMismatchedAnswers: 1,
      issues: 1,
      needsInput: 1,
    });
    expect(plan.issues[0]).toMatchObject({
      code: 'answer_kind_mismatch',
      fieldKey: 'supplemental.dateOfBirth',
    });
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: null,
      redactionPolicy: 'requires_consent',
    });
    expect(plan.issues[0].message).not.toContain('1994-08-14');
  });

  it('fails mislabeled answers for secure-session fields before removing redaction', () => {
    const populationPlan = makePopulationPlan();
    populationPlan.items[0].fieldMappings[0] = {
      ...populationPlan.items[0].fieldMappings[0],
      fieldKey: 'supplemental.socialSecurityNumber',
      officialFieldLabel: 'Social Security number',
      source: 'supplemental_intake',
      redactionPolicy: 'requires_secure_session',
      valueStatus: 'secure_session_required',
    };
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:user_info:supplemental.socialSecurityNumber',
          fieldKey: 'supplemental.socialSecurityNumber',
          kind: 'standard_answer',
          answerContext: makeAnswerContext('supplemental_intake'),
          answerValue: '123-45-6789',
          retentionPolicy: 'normal_planner',
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(populationPlan, answers);

    expect(plan.summary).toMatchObject({
      matchedAnswers: 1,
      appliedAnswers: 0,
      kindMismatchedAnswers: 1,
      issues: 1,
      needsSecureSession: 1,
    });
    expect(plan.issues[0]).toMatchObject({
      code: 'answer_kind_mismatch',
      fieldKey: 'supplemental.socialSecurityNumber',
    });
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: null,
      redactionPolicy: 'requires_secure_session',
    });
    expect(plan.issues[0].message).not.toContain('123-45-6789');
  });

  it('fails consent answers with the wrong retention policy before applying values', () => {
    const populationPlan = makePopulationPlan();
    populationPlan.items[0].fieldMappings[0] = {
      ...populationPlan.items[0].fieldMappings[0],
      fieldKey: 'supplemental.dateOfBirth',
      officialFieldLabel: 'Date of birth',
      source: 'supplemental_intake',
      redactionPolicy: 'requires_consent',
    };
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:consent:supplemental.dateOfBirth',
          fieldKey: 'supplemental.dateOfBirth',
          kind: 'consent_answer',
          answerContext: makeAnswerContext('supplemental_intake'),
          answerValue: '1994-08-14',
          retentionPolicy: 'normal_planner',
          consentToUseInDraft: true,
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(populationPlan, answers);

    expect(plan.summary).toMatchObject({
      matchedAnswers: 1,
      appliedAnswers: 0,
      retentionMismatchedAnswers: 1,
      issues: 1,
      needsInput: 1,
    });
    expect(plan.issues[0]).toMatchObject({
      code: 'answer_retention_mismatch',
      fieldKey: 'supplemental.dateOfBirth',
    });
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: null,
      redactionPolicy: 'requires_consent',
    });
    expect(plan.issues[0].message).not.toContain('1994-08-14');
  });

  it('fails secure-session answers with non-ephemeral retention before applying values', () => {
    const populationPlan = makePopulationPlan();
    populationPlan.items[0].fieldMappings[0] = {
      ...populationPlan.items[0].fieldMappings[0],
      fieldKey: 'supplemental.socialSecurityNumber',
      officialFieldLabel: 'Social Security number',
      source: 'supplemental_intake',
      redactionPolicy: 'requires_secure_session',
      valueStatus: 'secure_session_required',
    };
    const answers: NameChangePopulationIntakeAnswerPayload = {
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:secure_session:supplemental.socialSecurityNumber',
          fieldKey: 'supplemental.socialSecurityNumber',
          kind: 'secure_session_answer',
          answerContext: makeAnswerContext('supplemental_intake'),
          answerValue: '123-45-6789',
          retentionPolicy: 'save_or_use_only_with_consent',
          consentToUseInDraft: true,
        },
      ],
    };

    const plan = applyNameChangePopulationIntakeAnswers(populationPlan, answers);

    expect(plan.summary).toMatchObject({
      matchedAnswers: 1,
      appliedAnswers: 0,
      retentionMismatchedAnswers: 1,
      issues: 1,
      needsSecureSession: 1,
    });
    expect(plan.issues[0]).toMatchObject({
      code: 'secure_retention_policy_invalid',
      fieldKey: 'supplemental.socialSecurityNumber',
    });
    expect(plan.populationPlan.items[0].fieldMappings[0]).toMatchObject({
      value: null,
      redactionPolicy: 'requires_secure_session',
    });
    expect(plan.issues[0].message).not.toContain('123-45-6789');
  });
});
