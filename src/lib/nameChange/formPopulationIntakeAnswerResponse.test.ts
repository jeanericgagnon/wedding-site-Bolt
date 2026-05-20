import { describe, expect, it } from 'vitest';
import {
  buildNameChangePopulationIntakeAnswerResponse,
  type NameChangePopulationFilledIntakeAnswerTemplateField,
} from './formPopulationIntakeAnswerResponse';

function makeField(
  overrides: Partial<NameChangePopulationFilledIntakeAnswerTemplateField> = {},
): NameChangePopulationFilledIntakeAnswerTemplateField {
  const kind = overrides.kind ?? 'standard_answer';
  return {
    answerKey: overrides.answerKey ?? 'answer:user_info:applicant.county',
    gapKey: overrides.gapKey ?? 'user_info:applicant.county',
    fieldKey: overrides.fieldKey ?? 'applicant.county',
    kind,
    status: overrides.status ?? 'needs_answer',
    statusLabel: overrides.statusLabel ?? 'Needs answer',
    label: overrides.label ?? 'County of residence',
    prompt: overrides.prompt ?? 'What should DayOf use for county of residence?',
    helperText: overrides.helperText ?? 'Ask once, then reuse the answer.',
    formCodes: overrides.formCodes ?? ['SSA-SS5'],
    formLabels: overrides.formLabels ?? ['Social Security card update'],
    officialRevisionLabels: overrides.officialRevisionLabels ?? ['Form SS-5 (12-2024) UF'],
    answerContext: Object.hasOwn(overrides, 'answerContext') ? overrides.answerContext! : {
      formCodes: ['SSA-SS5'],
      officialRevisionLabels: ['Form SS-5 (12-2024) UF'],
      sources: ['companion_payload'],
    },
    answerValue: overrides.answerValue ?? null,
    consentToUseInDraft: overrides.consentToUseInDraft ?? null,
    consentToSave: overrides.consentToSave ?? null,
    retentionPolicy: overrides.retentionPolicy ?? 'normal_planner',
    secureSessionOnly: overrides.secureSessionOnly ?? false,
    mappingRequired: overrides.mappingRequired ?? false,
    currentValueKnown: overrides.currentValueKnown ?? false,
    nextAction: overrides.nextAction ?? 'Ask for County of residence once and refresh the population plan.',
  };
}

function expectReportReadinessContract(
  report: ReturnType<typeof buildNameChangePopulationIntakeAnswerResponse>['report'],
) {
  const countState = (state: string) => report.fieldReadiness.filter((field) => field.state === state).length;

  expect(report.fieldReadiness).toHaveLength(report.summary.totalFields);
  expect(report.summary.readyToConvertFields).toBe(countState('ready_to_convert'));
  expect(report.summary.missingAnswerFields).toBe(countState('needs_answer'));
  expect(report.summary.consentPendingFields).toBe(countState('needs_consent'));
  expect(report.summary.secureSessionPendingFields).toBe(countState('needs_secure_entry'));
  expect(report.summary.reviewerMappingTasks).toBe(countState('reviewer_mapping_task'));
  expect(report.summary.blockedFields).toBe(countState('blocked'));

  for (const field of report.fieldReadiness) {
    expect(field).not.toHaveProperty('answerValue');
    expect(field).not.toHaveProperty('value');
    if (field.state === 'blocked') {
      expect(field.issueCodes.length).toBeGreaterThan(0);
    } else {
      expect(field.issueCodes).toEqual([]);
    }
  }

  for (const issue of report.issues) {
    expect(
      report.fieldReadiness.some((field) => field.state === 'blocked' && field.issueCodes.includes(issue.code)),
    ).toBe(true);
  }
}

describe('name change population intake answer response', () => {
  it('converts filled template fields into an apply-ready answer payload', () => {
    const plan = buildNameChangePopulationIntakeAnswerResponse({
      source: 'filled intake fixture',
      fields: [
        makeField({ answerValue: 'Los Angeles' }),
        makeField({
          answerKey: 'answer:consent:supplemental.dateOfBirth',
          gapKey: 'consent:supplemental.dateOfBirth',
          fieldKey: 'supplemental.dateOfBirth',
          kind: 'consent_answer',
          status: 'needs_consent',
          label: 'Date of birth',
          answerValue: '1994-08-14',
          consentToUseInDraft: true,
          consentToSave: true,
          retentionPolicy: 'save_or_use_only_with_consent',
          answerContext: {
            formCodes: ['SSA-SS5', 'DS-11'],
            officialRevisionLabels: ['Form SS-5 (12-2024) UF', 'DS-11 06-2024'],
            sources: ['supplemental_intake'],
          },
        }),
        makeField({
          answerKey: 'answer:secure_session:supplemental.socialSecurityNumber',
          gapKey: 'secure_session:supplemental.socialSecurityNumber',
          fieldKey: 'supplemental.socialSecurityNumber',
          kind: 'secure_session_answer',
          status: 'needs_secure_entry',
          label: 'Social Security number',
          answerValue: '123-45-6789',
          consentToUseInDraft: true,
          retentionPolicy: 'ephemeral_only',
          secureSessionOnly: true,
          answerContext: {
            formCodes: ['SSA-SS5'],
            officialRevisionLabels: ['Form SS-5 (12-2024) UF'],
            sources: ['supplemental_intake'],
          },
        }),
        makeField({
          answerKey: 'answer:pdf_mapping:applicant.newLastName',
          gapKey: 'pdf_mapping:applicant.newLastName',
          fieldKey: 'applicant.newLastName',
          kind: 'pdf_mapping_task',
          status: 'needs_pdf_mapping',
          label: 'New last name',
          retentionPolicy: 'not_user_answer',
          mappingRequired: true,
        }),
      ],
    });

    expect(plan.report).toMatchObject({
      status: 'passed',
      containsUserValues: false,
      summary: {
        totalFields: 4,
        answerFields: 3,
        standardAnswers: 1,
        consentAnswers: 1,
        secureSessionAnswers: 1,
        readyToConvertFields: 3,
        blockedFields: 0,
        reviewerMappingTasks: 1,
        skippedMappingTasks: 1,
        issues: 0,
      },
    });
    expectReportReadinessContract(plan.report);
    expect(plan.report.fieldReadiness.map((field) => field.state)).toEqual([
      'ready_to_convert',
      'ready_to_convert',
      'ready_to_convert',
      'reviewer_mapping_task',
    ]);
    expect(plan.answerPayload).toMatchObject({
      reviewOnly: true,
      containsUserValues: true,
      answers: [
        {
          answerKey: 'answer:user_info:applicant.county',
          fieldKey: 'applicant.county',
          answerValue: 'Los Angeles',
          retentionPolicy: 'normal_planner',
        },
        {
          answerKey: 'answer:consent:supplemental.dateOfBirth',
          fieldKey: 'supplemental.dateOfBirth',
          answerValue: '1994-08-14',
          retentionPolicy: 'save_or_use_only_with_consent',
          consentToUseInDraft: true,
        },
        {
          answerKey: 'answer:secure_session:supplemental.socialSecurityNumber',
          fieldKey: 'supplemental.socialSecurityNumber',
          answerValue: '123-45-6789',
          retentionPolicy: 'ephemeral_only',
          consentToUseInDraft: true,
        },
      ],
    });
    expect(JSON.stringify(plan.report)).not.toContain('Los Angeles');
    expect(JSON.stringify(plan.report)).not.toContain('1994-08-14');
    expect(JSON.stringify(plan.report)).not.toContain('123-45-6789');
  });

  it('keeps blank user fields as app-ready follow-up tasks', () => {
    const plan = buildNameChangePopulationIntakeAnswerResponse({
      fields: [
        makeField(),
        makeField({
          answerKey: 'answer:consent:supplemental.dateOfBirth',
          gapKey: 'consent:supplemental.dateOfBirth',
          fieldKey: 'supplemental.dateOfBirth',
          kind: 'consent_answer',
          status: 'needs_consent',
          label: 'Date of birth',
          retentionPolicy: 'save_or_use_only_with_consent',
        }),
        makeField({
          answerKey: 'answer:secure_session:supplemental.socialSecurityNumber',
          gapKey: 'secure_session:supplemental.socialSecurityNumber',
          fieldKey: 'supplemental.socialSecurityNumber',
          kind: 'secure_session_answer',
          status: 'needs_secure_entry',
          label: 'Social Security number',
          retentionPolicy: 'ephemeral_only',
          secureSessionOnly: true,
        }),
        makeField({
          answerKey: 'answer:pdf_mapping:applicant.newLastName',
          gapKey: 'pdf_mapping:applicant.newLastName',
          fieldKey: 'applicant.newLastName',
          kind: 'pdf_mapping_task',
          status: 'needs_pdf_mapping',
          label: 'New last name',
          retentionPolicy: 'not_user_answer',
          mappingRequired: true,
        }),
      ],
    });

    expect(plan.report).toMatchObject({
      status: 'passed',
      summary: {
        answerFields: 0,
        missingAnswerFields: 1,
        consentPendingFields: 1,
        secureSessionPendingFields: 1,
        reviewerMappingTasks: 1,
        skippedBlankFields: 3,
        skippedMappingTasks: 1,
        issues: 0,
      },
    });
    expectReportReadinessContract(plan.report);
    expect(plan.report.fieldReadiness.map((field) => field.state)).toEqual([
      'needs_answer',
      'needs_consent',
      'needs_secure_entry',
      'reviewer_mapping_task',
    ]);
    expect(plan.answerPayload.answers).toHaveLength(0);
  });

  it('fails unsafe filled fields without writing them into the no-values report', () => {
    const plan = buildNameChangePopulationIntakeAnswerResponse({
      fields: [
        makeField({
          answerKey: 'answer:secure_session:supplemental.socialSecurityNumber',
          gapKey: 'secure_session:supplemental.socialSecurityNumber',
          fieldKey: 'supplemental.socialSecurityNumber',
          kind: 'secure_session_answer',
          status: 'needs_secure_entry',
          label: 'Social Security number',
          answerValue: '123-45-6789',
          consentToUseInDraft: true,
          retentionPolicy: 'save_or_use_only_with_consent',
          secureSessionOnly: true,
        }),
        makeField({
          answerKey: 'answer:pdf_mapping:applicant.newLastName',
          gapKey: 'pdf_mapping:applicant.newLastName',
          fieldKey: 'applicant.newLastName',
          kind: 'pdf_mapping_task',
          status: 'needs_pdf_mapping',
          label: 'New last name',
          answerValue: 'Jordan',
          retentionPolicy: 'not_user_answer',
          mappingRequired: true,
        }),
      ],
    });

    expect(plan.report).toMatchObject({
      status: 'failed',
      summary: {
        answerFields: 0,
        blockedFields: 2,
        skippedMappingTasks: 1,
        issues: 2,
      },
      issues: [
        {
          code: 'secure_retention_policy_invalid',
          fieldKey: 'supplemental.socialSecurityNumber',
        },
        {
          code: 'pdf_mapping_answer_not_supported',
          fieldKey: 'applicant.newLastName',
        },
      ],
    });
    expectReportReadinessContract(plan.report);
    expect(plan.report.fieldReadiness.map((field) => field.issueCodes)).toEqual([
      ['secure_retention_policy_invalid'],
      ['pdf_mapping_answer_not_supported'],
    ]);
    expect(plan.answerPayload.answers).toHaveLength(0);
    expect(JSON.stringify(plan.report)).not.toContain('123-45-6789');
    expect(JSON.stringify(plan.report)).not.toContain('Jordan');
  });

  it('fails duplicate filled template fields before building any answers', () => {
    const plan = buildNameChangePopulationIntakeAnswerResponse({
      fields: [
        makeField({ answerValue: 'Los Angeles' }),
        makeField({ answerValue: 'Orange' }),
      ],
    });

    expect(plan.report).toMatchObject({
      status: 'failed',
      summary: {
        answerFields: 0,
        duplicateTemplateFields: 2,
        blockedFields: 2,
        issues: 1,
      },
      issues: [
        {
          code: 'duplicate_template_field',
          fieldKey: 'applicant.county',
        },
      ],
    });
    expectReportReadinessContract(plan.report);
    expect(plan.report.fieldReadiness).toEqual([
      expect.objectContaining({
        state: 'blocked',
        issueCodes: ['duplicate_template_field'],
      }),
      expect.objectContaining({
        state: 'blocked',
        issueCodes: ['duplicate_template_field'],
      }),
    ]);
    expect(plan.answerPayload.answers).toHaveLength(0);
    expect(JSON.stringify(plan.report)).not.toContain('Los Angeles');
    expect(JSON.stringify(plan.report)).not.toContain('Orange');
  });

  it('turns malformed template entries into blocked readiness items instead of crashing', () => {
    const plan = buildNameChangePopulationIntakeAnswerResponse({
      fields: [null as never],
    });

    expect(plan.report).toMatchObject({
      status: 'failed',
      summary: {
        totalFields: 1,
        answerFields: 0,
        malformedFields: 1,
        blockedFields: 1,
        issues: 1,
      },
      issues: [
        {
          code: 'template_field_invalid_entry',
          fieldKey: 'template.fields[0]',
        },
      ],
    });
    expectReportReadinessContract(plan.report);
    expect(plan.report.fieldReadiness[0]).toMatchObject({
      kind: 'unknown',
      state: 'blocked',
      issueCodes: ['template_field_invalid_entry'],
    });
    expect(plan.answerPayload.answers).toHaveLength(0);
  });

  it('fails answered fields with missing answer context before building any answers', () => {
    const plan = buildNameChangePopulationIntakeAnswerResponse({
      fields: [
        makeField({
          answerValue: 'Los Angeles',
          answerContext: undefined,
        }),
      ],
    });

    expect(plan.report).toMatchObject({
      status: 'failed',
      summary: {
        answerFields: 0,
        contextMissingFields: 1,
        blockedFields: 1,
        issues: 1,
      },
      issues: [
        {
          code: 'answer_context_missing',
          fieldKey: 'applicant.county',
        },
      ],
    });
    expectReportReadinessContract(plan.report);
    expect(plan.report.fieldReadiness[0]).toMatchObject({
      state: 'blocked',
      issueCodes: ['answer_context_missing'],
    });
    expect(plan.answerPayload.answers).toHaveLength(0);
    expect(JSON.stringify(plan.report)).not.toContain('Los Angeles');
  });

  it('fails malformed answer kinds before retention checks', () => {
    const plan = buildNameChangePopulationIntakeAnswerResponse({
      fields: [
        makeField({
          answerValue: 'Los Angeles',
          kind: 'surprise_answer' as never,
          retentionPolicy: 'normal_planner',
        }),
      ],
    });

    expect(plan.report).toMatchObject({
      status: 'failed',
      summary: {
        answerFields: 0,
        malformedFields: 1,
        blockedFields: 1,
        issues: 1,
      },
      issues: [
        {
          code: 'invalid_answer_kind',
          fieldKey: 'applicant.county',
        },
      ],
    });
    expectReportReadinessContract(plan.report);
    expect(plan.report.fieldReadiness[0]).toMatchObject({
      kind: 'surprise_answer',
      state: 'blocked',
      issueCodes: ['invalid_answer_kind'],
    });
    expect(plan.answerPayload.answers).toHaveLength(0);
    expect(JSON.stringify(plan.report)).not.toContain('Los Angeles');
  });
});
