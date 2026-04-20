import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandModeGuidance } from './coordinatorCommandModeGuidance';

describe('coordinatorCommandModeGuidance', () => {
  it('gives mode-specific operator guidance', () => {
    expect(getCoordinatorCommandModeGuidance('primary-action')).toContain('top priority');
    expect(getCoordinatorCommandModeGuidance('escalation')).toContain('flagged issue');
    expect(getCoordinatorCommandModeGuidance('correction')).toContain('recovery controls');
  });

  it('falls back to neutral live-board guidance', () => {
    expect(getCoordinatorCommandModeGuidance(null)).toContain('neutral live board view');
  });
});
