import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandModeLabel } from './coordinatorCommandModeLabel';

describe('coordinatorCommandModeLabel', () => {
  it('maps command sources to clear operator-facing labels', () => {
    expect(getCoordinatorCommandModeLabel('primary-action')).toBe('Suggested action view');
    expect(getCoordinatorCommandModeLabel('escalation')).toBe('Needs attention view');
    expect(getCoordinatorCommandModeLabel('correction')).toBe('Fix detail view');
  });

  it('falls back to a neutral live board label', () => {
    expect(getCoordinatorCommandModeLabel(null)).toBe('Day-of summary view');
  });
});
