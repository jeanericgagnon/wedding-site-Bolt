import { describe, expect, it } from 'vitest';
import { getCoordinatorStablePromptTarget } from './coordinatorStablePromptTarget';

describe('coordinatorStablePromptTarget', () => {
  it('maps the stable prompt priority back to the right command surface target', () => {
    expect(getCoordinatorStablePromptTarget('Check-in')).toEqual({ panelFocus: 'check-in', reviewOnly: true });
    expect(getCoordinatorStablePromptTarget('Timeline')).toEqual({ panelFocus: 'timeline', reviewOnly: false });
    expect(getCoordinatorStablePromptTarget('Q&A')).toEqual({ panelFocus: 'qna', reviewOnly: false });
    expect(getCoordinatorStablePromptTarget('Alerting')).toEqual({ panelFocus: null, reviewOnly: false });
  });
});
