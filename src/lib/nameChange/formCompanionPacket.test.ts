import { describe, expect, it } from 'vitest';
import { buildNameChangeFormCompanion, type NameChangeOfficialFormSource } from './formCompanion';
import { buildNameChangeFormCompanionPacket } from './formCompanionPacket';
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

function makePayload(formCode: string, values: { firstName?: string | null; lastName?: string | null; marriageDate?: string | null; lowConfidence?: boolean }): NameChangeFormPayloadSnapshot {
  const firstName = Object.prototype.hasOwnProperty.call(values, 'firstName') ? values.firstName ?? null : 'Alex';
  const lastName = Object.prototype.hasOwnProperty.call(values, 'lastName') ? values.lastName ?? null : 'Jordan';
  const marriageDate = Object.prototype.hasOwnProperty.call(values, 'marriageDate') ? values.marriageDate ?? null : null;

  return {
    formCode,
    fields: [
      {
        fieldKey: 'applicant.firstName',
        label: 'First name',
        required: true,
        value: firstName,
        source: 'canonical_case',
        confidence: 'high',
      },
      {
        fieldKey: 'applicant.lastName',
        label: 'Last name',
        required: true,
        value: lastName,
        source: 'canonical_case',
        confidence: values.lowConfidence ? 'low' : 'high',
      },
      {
        fieldKey: 'legal.marriageDate',
        label: 'Marriage date',
        required: false,
        value: marriageDate,
        source: 'canonical_case',
        confidence: marriageDate ? 'high' : 'low',
      },
    ],
    summary: {
      ready: 2,
      missing: 0,
      trustedReady: 2,
      lowConfidence: values.lowConfidence ? 1 : 0,
      extractedBacked: 0,
    },
  };
}

describe('name change form companion packet', () => {
  it('summarizes readiness across multiple companions', () => {
    const readyCompanion = buildNameChangeFormCompanion(makePayload('SSA-SS5', {}), source, {
      'applicant.firstName': {
        section: 'Name',
        officialFieldLabel: 'First name',
        userInstruction: 'Use this for first name.',
      },
      'applicant.lastName': {
        section: 'Name',
        officialFieldLabel: 'Last name',
        userInstruction: 'Use this for last name.',
      },
      'legal.marriageDate': {
        section: 'Proof',
        officialFieldLabel: 'Marriage date',
        userInstruction: 'Use this for the marriage date.',
      },
    });
    const missingCompanion = buildNameChangeFormCompanion(makePayload('CA-DL-44', { lastName: null }), {
      ...source,
      formCode: 'CA-DL-44',
      formLabel: 'California DMV DL-44',
      officialUrl: 'https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/dl-id-online-app-edl-44/',
    }, {
      'applicant.firstName': {
        section: 'Name',
        officialFieldLabel: 'First name',
        userInstruction: 'Use this for first name.',
      },
      'applicant.lastName': {
        section: 'Name',
        officialFieldLabel: 'Last name',
        userInstruction: 'Use this for last name.',
      },
      'legal.marriageDate': {
        section: 'Proof',
        officialFieldLabel: 'Marriage date',
        userInstruction: 'Use this for the marriage date.',
      },
    });

    const packet = buildNameChangeFormCompanionPacket([readyCompanion, missingCompanion]);

    expect(packet.primaryStatus).toBe('missing');
    expect(packet.summary).toMatchObject({
      totalForms: 2,
      readyForms: 1,
      missingForms: 1,
      missingRequiredFields: 1,
    });
    expect(packet.items.find((item) => item.formCode === 'CA-DL-44')).toMatchObject({
      status: 'missing',
      missingRequiredFieldLabels: ['Last name'],
    });
    expect(packet.fillPayloads.find((payload) => payload.formCode === 'CA-DL-44')).toMatchObject({
      reviewOnly: true,
      adapterStatus: 'needs_user_input',
      blockers: ['Last name is missing.'],
    });
  });

  it('generates one copyable packet text for all form rows', () => {
    const companion = buildNameChangeFormCompanion(makePayload('DS-82', { lowConfidence: true, marriageDate: '2026-04-05' }), {
      ...source,
      formCode: 'DS-82',
      formLabel: 'U.S. Passport Renewal Application',
      officialUrl: 'https://eforms.state.gov/Forms/ds82_pdf.PDF',
      officialRevisionLabel: 'DS-82 04-2025',
    }, {
      'applicant.firstName': {
        section: 'Name requested on passport',
        officialFieldLabel: 'New first name',
        userInstruction: 'Use this for the first name on the updated passport.',
      },
      'applicant.lastName': {
        section: 'Name requested on passport',
        officialFieldLabel: 'New last name',
        userInstruction: 'Use this for the last name on the updated passport.',
      },
      'legal.marriageDate': {
        section: 'Name-change proof',
        officialFieldLabel: 'Marriage date',
        userInstruction: 'Use this for the marriage date.',
      },
    });

    const packet = buildNameChangeFormCompanionPacket([companion]);

    expect(packet.primaryStatus).toBe('review');
    expect(packet.packetText).toContain('DayOf name-change form companion packet');
    expect(packet.packetText).toContain('DS-82 - U.S. Passport Renewal Application');
    expect(packet.packetText).toContain('New last name: Jordan');
    expect(packet.packetText).toContain('Marriage date: 04/05/2026');
    expect(packet.packetText).toContain('Status: Review before using');
    expect(packet.fillPayloadJson).toContain('"reviewOnly": true');
    expect(packet.fillPayloadJson).toContain('"adapterStatus": "ready_for_adapter"');
    expect(packet.fillPayloadJson).toContain('"rawValue": "2026-04-05"');
    expect(packet.fillPayloadJson).toContain('"value": "04/05/2026"');
  });
});
