import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandModeGuidance } from './coordinatorCommandModeGuidance';

describe('coordinatorCommandModeGuidance', () => {
  it('gives mode-specific operator guidance', () => {
    expect(getCoordinatorCommandModeGuidance('primary-action')).toContain('suggested action');
    expect(getCoordinatorCommandModeGuidance('escalation')).toContain('needs attention');
    expect(getCoordinatorCommandModeGuidance('correction')).toContain('focused panel');
  });

  it('falls back to neutral live-board guidance', () => {
    expect(getCoordinatorCommandModeGuidance(null)).toContain('day-of summary');
  });
});
