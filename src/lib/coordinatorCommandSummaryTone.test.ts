import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandSummaryTone } from './coordinatorCommandSummaryTone';

describe('coordinatorCommandSummaryTone', () => {
  it('separates priority, secondary board work, and background context', () => {
    expect(getCoordinatorCommandSummaryTone({
      label: 'Check-in',
      priority: 'Check-in',
      detail: 'Working board target',
    })).toBe('priority');

    expect(getCoordinatorCommandSummaryTone({
      label: 'Timeline',
      priority: 'Check-in',
      detail: 'Board event available',
    })).toBe('secondary');

    expect(getCoordinatorCommandSummaryTone({
      label: 'Alerting',
      priority: 'Check-in',
      detail: 'Customized check-in reminder',
    })).toBe('background');
  });
});
