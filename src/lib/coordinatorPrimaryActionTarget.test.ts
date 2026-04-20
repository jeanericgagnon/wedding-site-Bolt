import { describe, expect, it } from 'vitest';
import { resolveCoordinatorPrimaryActionTarget } from './coordinatorPrimaryActionTarget';

describe('coordinatorPrimaryActionTarget', () => {
  it('routes door review into the check-in review workflow', () => {
    expect(resolveCoordinatorPrimaryActionTarget({ key: 'door-review', title: 'Resolve the next door exception', detail: 'Sam Lee needs a coordinator decision.' })).toEqual({
      panelFocus: 'check-in',
      reviewOnly: true,
    });
  });

  it('routes q&a and timeline actions to their command panels', () => {
    expect(resolveCoordinatorPrimaryActionTarget({ key: 'open-qna', title: 'Answer the next guest question', detail: 'Where do I park?' })).toEqual({
      panelFocus: 'qna',
      reviewOnly: false,
    });
    expect(resolveCoordinatorPrimaryActionTarget({ key: 'start-up-next', title: 'Prepare the next event transition', detail: 'Cocktails is next.' })).toEqual({
      panelFocus: 'timeline',
      reviewOnly: false,
    });
  });
});
