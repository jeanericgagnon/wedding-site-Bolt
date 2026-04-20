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
  });
});
