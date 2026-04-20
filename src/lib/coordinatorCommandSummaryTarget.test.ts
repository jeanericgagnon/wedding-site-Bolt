import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandSummaryTarget } from './coordinatorCommandSummaryTarget';

describe('coordinatorCommandSummaryTarget', () => {
  it('routes each summary chip to the right coordinator surface', () => {
    expect(getCoordinatorCommandSummaryTarget('Check-in')).toEqual({ panelFocus: 'check-in', reviewOnly: true });
    expect(getCoordinatorCommandSummaryTarget('Timeline')).toEqual({ panelFocus: 'timeline', reviewOnly: false });
    expect(getCoordinatorCommandSummaryTarget('Q&A')).toEqual({ panelFocus: 'qna', reviewOnly: false });
    expect(getCoordinatorCommandSummaryTarget('Alerting')).toEqual({ panelFocus: null, reviewOnly: false });
  });
});
