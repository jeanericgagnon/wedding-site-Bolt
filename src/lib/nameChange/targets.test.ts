import { describe, expect, it } from 'vitest';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';

describe('name change execution targets', () => {
  it('defines reusable SSA, DMV, and passport target declarations', () => {
    expect(NAME_CHANGE_EXECUTION_TARGETS.ssa).toMatchObject({
      key: 'ssa',
      lane: 'federal',
      recommendedFormCode: 'SSA-SS5',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.dmv).toMatchObject({
      key: 'dmv',
      lane: 'state',
      recommendedFormCode: 'CA-DL-44',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.passport).toMatchObject({
      key: 'passport',
      lane: 'federal',
      recommendedFormCode: 'DS-82',
      formBuilderKey: 'passport',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.employer).toMatchObject({
      key: 'employer',
      lane: 'state',
      recommendedFormCode: 'EMPLOYER-HR-PACKET',
      formBuilderKey: 'employer',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.banks).toMatchObject({
      key: 'banks',
      lane: 'state',
      recommendedFormCode: 'BANK-ACCOUNT-UPDATE-PACKET',
      formBuilderKey: 'banks',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.insurance).toMatchObject({
      key: 'insurance',
      lane: 'state',
      recommendedFormCode: 'INSURANCE-POLICY-UPDATE-PACKET',
      formBuilderKey: 'insurance',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.medical).toMatchObject({
      key: 'medical',
      lane: 'state',
      recommendedFormCode: 'MEDICAL-PROVIDER-RECORD-UPDATE',
      formBuilderKey: 'medical',
      sequenceProfile: 'medical',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.utilities).toMatchObject({
      key: 'utilities',
      lane: 'state',
      recommendedFormCode: 'UTILITIES-LEASE-RECORD-UPDATE',
      formBuilderKey: 'utilities',
      sequenceProfile: 'utilities',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.courtesy).toMatchObject({
      key: 'courtesy',
      lane: 'state',
      recommendedFormCode: 'COURTESY-SOCIAL-IDENTITY-SYNC',
      formBuilderKey: 'courtesy',
      sequenceProfile: 'courtesy',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.courtOrder).toMatchObject({
      key: 'courtOrder',
      lane: 'state',
      recommendedFormCode: 'COURT-ORDER-PATH-REVIEW',
      formBuilderKey: 'courtOrder',
      sequenceProfile: 'courtOrder',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.voter).toMatchObject({
      key: 'voter',
      lane: 'state',
      recommendedFormCode: 'CA-VOTER-REGISTRATION-UPDATE',
      formBuilderKey: 'voter',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.tsa).toMatchObject({
      key: 'tsa',
      lane: 'federal',
      recommendedFormCode: 'TSA-TRAVEL-PROFILE-UPDATE',
      formBuilderKey: 'tsa',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.legalGovernment).toMatchObject({
      key: 'legalGovernment',
      label: 'County recorder and immigration record alignment',
      formBuilderKey: 'taxes',
      sequenceProfile: 'legalGovernment',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.licenses).toMatchObject({
      key: 'licenses',
      lane: 'state',
      recommendedFormCode: 'PROFESSIONAL-LICENSE-UPDATE-PACKET',
      formBuilderKey: 'licenses',
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.dmv.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'federal-ssa',
      requiredStatuses: ['complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.passport.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'federal-ssa',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.employer.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'federal-ssa',
      requiredStatuses: ['complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.banks.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'state-dmv',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.insurance.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'state-dmv',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.medical.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'state-dmv',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.utilities.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'state-dmv',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.courtesy.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'institution-banks',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.voter.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'state-dmv',
      requiredStatuses: ['complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.tsa.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'state-dmv',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.tsa.prerequisiteRules[1]).toMatchObject({
      requiredStepId: 'federal-passport',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.legalGovernment.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'federal-ssa',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(NAME_CHANGE_EXECUTION_TARGETS.licenses.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'state-dmv',
      requiredStatuses: ['in_progress', 'complete'],
    });
    expect(
      NAME_CHANGE_EXECUTION_TARGETS.passport.checklistSpecs.find(
        (check) => check.key === 'out-of-state-marriage-certificate-grounding',
      ),
    ).toMatchObject({
      attentionReason:
        'Passport follow-through still needs grounded county, certificate-number extraction, and issuing-authority metadata from the out-of-state marriage certificate.',
    });
    expect(
      NAME_CHANGE_EXECUTION_TARGETS.tsa.checklistSpecs.find(
        (check) => check.key === 'out-of-state-marriage-certificate-grounding',
      ),
    ).toMatchObject({
      attentionReason:
        'TSA / travel-profile follow-through still needs grounded county, certificate-number extraction, and issuing-authority metadata from the out-of-state marriage certificate.',
    });
  });
});
