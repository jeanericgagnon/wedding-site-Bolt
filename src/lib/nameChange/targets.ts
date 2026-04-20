import { NAME_CHANGE_DMV_FORM_CONTRACT } from './dmvForm';
import { NAME_CHANGE_SS5_FORM_CONTRACT } from './ss5Form';
import type { NameChangeExecutionTargetDefinition } from './types';

export const NAME_CHANGE_EXECUTION_TARGETS: Record<'ssa' | 'dmv', NameChangeExecutionTargetDefinition> = {
  ssa: {
    key: 'ssa',
    label: 'Social Security Administration',
    lane: 'federal',
    recommendedFormCode: NAME_CHANGE_SS5_FORM_CONTRACT.formCode,
    prerequisiteRules: [],
    autofillTargetFields: [
      'applicant.current_first_name',
      'applicant.current_middle_name',
      'applicant.current_last_name',
      'applicant.target_last_name',
      'legal.marriage_date',
    ],
  },
  dmv: {
    key: 'dmv',
    label: 'California DMV',
    lane: 'state',
    recommendedFormCode: NAME_CHANGE_DMV_FORM_CONTRACT.formCode,
    prerequisiteRules: [
      {
        key: 'federal-ssa-progress',
        label: 'SSA execution completed before DMV prep',
        required: true,
        requiredStepId: 'federal-ssa',
        requiredStatuses: ['complete'],
        missingReason: 'SSA execution is not complete yet, so DMV sequencing is still blocked on the federal-first path.',
        attentionReason: 'SSA execution is in progress, so DMV should stay queued behind the federal-first path.',
        satisfiedReason: 'SSA execution is marked complete, so DMV sequencing can proceed on the federal-first path.',
      },
    ],
    autofillTargetFields: [
      'applicant.current_first_name',
      'applicant.current_middle_name',
      'applicant.current_last_name',
      'applicant.target_last_name',
      'applicant.county',
      'legal.marriage_date',
    ],
  },
};
