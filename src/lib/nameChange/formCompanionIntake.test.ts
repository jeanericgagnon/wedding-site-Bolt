import { describe, expect, it } from 'vitest';
import { buildNameChangeFormCompanion, type NameChangeOfficialFormSource } from './formCompanion';
import { buildNameChangeFormCompanionIntakePrompts } from './formCompanionIntake';
import type { NameChangeFormPayloadSnapshot } from './types';

const source: NameChangeOfficialFormSource = {
  formCode: 'SSA-SS5',
  formLabel: 'Social Security Administration SS-5',
  officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
  officialFormsIndexUrl: 'https://www.ssa.gov/forms/',
  officialRevisionLabel: 'Form SS-5 (12-2024) UF',
  lastCheckedAt: '2026-05-20',
  verificationStatus: 'verified_current',
  submissionNote: 'User must review, sign, and submit through Social Security instructions.',
};

function makeCompanion(formCode: string, marriageDate: string | null, certificateNumber: string | null) {
  const payload: NameChangeFormPayloadSnapshot = {
    formCode,
    fields: [
      {
        fieldKey: 'legal.marriageDate',
        label: 'Marriage date',
        required: true,
        value: marriageDate,
        source: 'canonical_case',
        confidence: marriageDate ? 'high' : 'low',
      },
      {
        fieldKey: 'legal.marriageCertificateNumber',
        label: 'Marriage certificate number',
        required: false,
        value: certificateNumber,
        source: 'extracted_field',
        confidence: certificateNumber ? 'low' : 'low',
      },
    ],
    summary: {
      ready: 0,
      missing: marriageDate ? 0 : 1,
      trustedReady: marriageDate ? 1 : 0,
      lowConfidence: certificateNumber ? 1 : 0,
      extractedBacked: certificateNumber ? 1 : 0,
    },
  };

  return buildNameChangeFormCompanion(payload, {
    ...source,
    formCode,
    formLabel: `${formCode} form`,
  }, {
    'legal.marriageDate': {
      section: 'Proof',
      officialFieldLabel: 'Marriage date',
      userInstruction: 'Use this for marriage date.',
    },
    'legal.marriageCertificateNumber': {
      section: 'Proof',
      officialFieldLabel: 'Marriage certificate number',
      userInstruction: 'Use this for the certificate number.',
    },
  });
}

describe('name change form companion intake prompts', () => {
  it('deduplicates missing answers across forms', () => {
    const prompts = buildNameChangeFormCompanionIntakePrompts([
      makeCompanion('SSA-SS5', null, null),
      makeCompanion('CA-DL-44', null, null),
      makeCompanion('DS-82', '2026-04-05', null),
    ]);

    expect(prompts[0]).toMatchObject({
      fieldKey: 'legal.marriageDate',
      label: 'Marriage date',
      status: 'missing',
      impactedForms: ['SSA-SS5', 'CA-DL-44'],
    });
    expect(prompts[0].question).toBe('What date is listed on the certified marriage record?');
  });

  it('keeps review prompts after missing prompts', () => {
    const prompts = buildNameChangeFormCompanionIntakePrompts([
      makeCompanion('SSA-SS5', null, 'MC-2026-7781'),
      makeCompanion('DS-82', '2026-04-05', 'MC-2026-7781'),
    ]);

    expect(prompts.map((prompt) => prompt.status)).toEqual(['missing', 'review']);
    expect(prompts[1]).toMatchObject({
      fieldKey: 'legal.marriageCertificateNumber',
      status: 'review',
      currentValue: 'MC-2026-7781',
      impactedForms: ['SSA-SS5', 'DS-82'],
    });
  });
});
