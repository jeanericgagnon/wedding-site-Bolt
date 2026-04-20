import { describe, expect, it } from 'vitest';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';

describe('name change execution targets', () => {
  it('defines reusable SSA and DMV target declarations', () => {
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
    expect(NAME_CHANGE_EXECUTION_TARGETS.dmv.prerequisiteRules[0]).toMatchObject({
      requiredStepId: 'federal-ssa',
      requiredStatuses: ['complete'],
    });
  });
});
