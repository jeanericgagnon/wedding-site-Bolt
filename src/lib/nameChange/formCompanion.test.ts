import { describe, expect, it } from 'vitest';
import { buildNameChangeFormCompanion, type NameChangeOfficialFormSource } from './formCompanion';
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

const payload: NameChangeFormPayloadSnapshot = {
  formCode: 'SSA-SS5',
  fields: [
    {
      fieldKey: 'applicant.currentFirstName',
      label: 'Current first name',
      required: true,
      value: 'Alex',
      source: 'canonical_case',
      confidence: 'high',
    },
    {
      fieldKey: 'applicant.currentLastName',
      label: 'Current last name',
      required: true,
      value: null,
      source: 'canonical_case',
      confidence: 'low',
    },
    {
      fieldKey: 'legal.marriageIssuingAuthority',
      label: 'Marriage certificate issuing authority',
      required: false,
      value: 'San Diego County Clerk',
      source: 'extracted_field',
      confidence: 'low',
      sourceDocumentKind: 'marriage_certificate',
    },
    {
      fieldKey: 'legal.marriageDate',
      label: 'Marriage date',
      required: true,
      value: '2026-04-05',
      source: 'canonical_case',
      confidence: 'high',
    },
  ],
  summary: {
    ready: 1,
    missing: 1,
    trustedReady: 1,
    lowConfidence: 0,
    extractedBacked: 1,
  },
};

describe('name change form companion', () => {
  it('turns a form payload into put-this-here field rows', () => {
    const companion = buildNameChangeFormCompanion(payload, source, {
      'applicant.currentFirstName': {
        section: 'Current legal name',
        officialFieldLabel: 'First name',
        userInstruction: 'Put this in the current first-name field.',
      },
      'applicant.currentLastName': {
        section: 'Current legal name',
        officialFieldLabel: 'Last name',
        userInstruction: 'Put this in the current last-name field.',
      },
      'legal.marriageIssuingAuthority': {
        section: 'Legal proof',
        officialFieldLabel: 'Issuing authority',
        userInstruction: 'Use this when the form asks who issued the proof.',
      },
      'legal.marriageDate': {
        section: 'Legal proof',
        officialFieldLabel: 'Marriage date',
        userInstruction: 'Use this when the form asks for the marriage date.',
      },
    });

    expect(companion.sections.map((section) => section.label)).toEqual(['Current legal name', 'Legal proof']);
    expect(companion.fields[0]).toMatchObject({
      officialFieldLabel: 'First name',
      value: 'Alex',
      copyValue: 'Alex',
      status: 'ready',
      sourceLabel: 'Saved intake',
    });
    expect(companion.fields[1]).toMatchObject({
      status: 'missing',
      reviewNote: 'Last name still needs a value before this draft is complete.',
    });
    expect(companion.fields[2]).toMatchObject({
      status: 'review',
      sourceLabel: 'Reviewed document detail',
    });
    expect(companion.fields[3]).toMatchObject({
      value: '2026-04-05',
      formattedValue: '04/05/2026',
      copyValue: '04/05/2026',
      valueFormatNote: 'Formatted for official forms as MM/DD/YYYY.',
    });
  });

  it('keeps official submission and stale-source warnings explicit', () => {
    const companion = buildNameChangeFormCompanion(payload, {
      ...source,
      verificationStatus: 'needs_review',
    }, {});

    expect(companion.reviewWarnings).toContain('SSA-SS5 source/version needs official review before generating production PDFs.');
    expect(companion.reviewWarnings).toContain('1 required field still needs a value.');
    expect(companion.reviewWarnings).toContain('1 field should be checked before use.');
    expect(companion.reviewWarnings).toContain('User must review, sign, and submit through Social Security instructions.');
  });
});
