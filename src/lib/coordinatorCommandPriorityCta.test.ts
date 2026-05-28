import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandPriorityCta } from './coordinatorCommandPriorityCta';

describe('coordinatorCommandPriorityCta', () => {
  it('returns a direct operator CTA for each priority surface', () => {
    expect(getCoordinatorCommandPriorityCta('Check-in')).toBe('Open door review');
    expect(getCoordinatorCommandPriorityCta('Timeline')).toBe('Open active timeline');
    expect(getCoordinatorCommandPriorityCta('Q&A')).toBe('Open guest question');
    expect(getCoordinatorCommandPriorityCta('Alerting')).toBe('Open alert draft');
  });
});
