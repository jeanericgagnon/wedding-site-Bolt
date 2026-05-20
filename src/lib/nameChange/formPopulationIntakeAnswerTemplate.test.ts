import { describe, expect, it } from 'vitest';
import { buildNameChangePopulationIntakeAnswerTemplate } from './formPopulationIntakeAnswerTemplate';
import type { NameChangePopulationIntakeGapPlan } from './formPopulationIntakeGaps';

const gapPlan: NameChangePopulationIntakeGapPlan = {
  reviewOnly: true,
  safePayload: true,
  containsUserValues: false,
  primaryAction: 'Collect missing user answers once.',
  intakeGapJson: '{}',
  summary: {
    totalGaps: 4,
    userInfo: 1,
    secureSession: 1,
    consent: 1,
    pdfMapping: 1,
    impactedForms: 2,
  },
  gaps: [
    {
      gapKey: 'user_info:applicant.county',
      category: 'user_info',
      statusLabel: 'Needs answer',
      fieldKey: 'applicant.county',
      label: 'County of residence',
      prompt: 'What county should DayOf use?',
      helperText: 'Ask once.',
      formCodes: ['SSA-SS5'],
      formLabels: ['Social Security card update'],
      officialRevisionLabels: ['Form SS-5 (12-2024) UF'],
      sources: ['companion_payload'],
      redactionPolicy: 'none',
      currentValueKnown: false,
      priority: 0,
      nextAction: 'Ask for County of residence once.',
    },
    {
      gapKey: 'secure_session:supplemental.socialSecurityNumber',
      category: 'secure_session',
      statusLabel: 'Secure session',
      fieldKey: 'supplemental.socialSecurityNumber',
      label: 'Social Security number',
      prompt: 'Enter Social Security number in a secure session.',
      helperText: 'Do not store it.',
      formCodes: ['SSA-SS5'],
      formLabels: ['Social Security card update'],
      officialRevisionLabels: ['Form SS-5 (12-2024) UF'],
      sources: ['supplemental_intake'],
      redactionPolicy: 'requires_secure_session',
      currentValueKnown: false,
      priority: 1,
      nextAction: 'Open secure intake.',
    },
    {
      gapKey: 'consent:supplemental.dateOfBirth',
      category: 'consent',
      statusLabel: 'Consent needed',
      fieldKey: 'supplemental.dateOfBirth',
      label: 'Date of birth',
      prompt: 'Collect date of birth with explicit consent.',
      helperText: 'Use only with consent.',
      formCodes: ['SSA-SS5', 'DS-11'],
      formLabels: ['Social Security card update', 'Passport application'],
      officialRevisionLabels: ['Form SS-5 (12-2024) UF', 'DS-11 06-2024'],
      sources: ['supplemental_intake'],
      redactionPolicy: 'requires_consent',
      currentValueKnown: false,
      priority: 2,
      nextAction: 'Collect Date of birth and capture consent.',
    },
    {
      gapKey: 'pdf_mapping:applicant.newLastName',
      category: 'pdf_mapping',
      statusLabel: 'PDF mapping',
      fieldKey: 'applicant.newLastName',
      label: 'New last name',
      prompt: 'Which official PDF field should receive new last name?',
      helperText: 'Map this field.',
      formCodes: ['DS-11'],
      formLabels: ['Passport application'],
      officialRevisionLabels: ['DS-11 06-2024'],
      sources: ['companion_payload'],
      redactionPolicy: 'none',
      currentValueKnown: true,
      priority: 3,
      nextAction: 'Visually map New last name.',
    },
  ],
};

describe('name change population intake answer template', () => {
  it('turns no-value intake gaps into blank answer fields by retention lane', () => {
    const template = buildNameChangePopulationIntakeAnswerTemplate(gapPlan);

    expect(template.summary).toMatchObject({
      totalFields: 4,
      standardAnswers: 1,
      consentAnswers: 1,
      secureSessionAnswers: 1,
      pdfMappingTasks: 1,
      impactedForms: 2,
    });
    expect(template.fields.find((field) => field.kind === 'secure_session_answer')).toMatchObject({
      answerValue: null,
      retentionPolicy: 'ephemeral_only',
      secureSessionOnly: true,
      answerContext: {
        formCodes: ['SSA-SS5'],
        officialRevisionLabels: ['Form SS-5 (12-2024) UF'],
        sources: ['supplemental_intake'],
      },
    });
    expect(template.fields.find((field) => field.kind === 'consent_answer')).toMatchObject({
      consentToSave: null,
      consentToUseInDraft: null,
      retentionPolicy: 'save_or_use_only_with_consent',
    });
    expect(template.fields.find((field) => field.kind === 'pdf_mapping_task')).toMatchObject({
      mappingRequired: true,
      retentionPolicy: 'not_user_answer',
    });
    expect(template.answerTemplateJson).not.toContain('Jordan');
  });
});
