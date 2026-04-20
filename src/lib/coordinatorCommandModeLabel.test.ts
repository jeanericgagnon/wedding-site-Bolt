import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandModeLabel } from './coordinatorCommandModeLabel';

describe('coordinatorCommandModeLabel', () => {
  it('maps command sources to clear operator-facing labels', () => {
    expect(getCoordinatorCommandModeLabel('primary-action')).toBe('Primary action mode');
    expect(getCoordinatorCommandModeLabel('escalation')).toBe('Escalation mode');
    expect(getCoordinatorCommandModeLabel('correction')).toBe('Correction mode');
  });

  it('falls back to a neutral live board label', () => {
    expect(getCoordinatorCommandModeLabel(null)).toBe('Live board mode');
  });
});
