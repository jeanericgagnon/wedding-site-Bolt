import { describe, expect, it } from 'vitest';
import { resolveCoordinatorOverrideDisplayCue } from './coordinatorOverrideDisplayCue';

describe('coordinatorOverrideDisplayCue', () => {
  it('prefers the freshest override cue when both alert and manual overrides exist', () => {
    expect(resolveCoordinatorOverrideDisplayCue({
      alertOverrideLabel: 'Manual alert override: draft diverged from live event update',
      alertOverrideUpdatedAt: 200,
      manualOverrideLabel: 'Manual override: working a different guest than the board target',
      manualOverrideUpdatedAt: 100,
    })).toEqual({
      kind: 'alert-override',
      label: 'Manual alert override: draft diverged from live event update',
      updatedAt: 200,
    });

    expect(resolveCoordinatorOverrideDisplayCue({
      alertOverrideLabel: 'Manual alert override: draft diverged from live event update',
      alertOverrideUpdatedAt: 100,
      manualOverrideLabel: 'Manual override: working a different guest than the board target',
      manualOverrideUpdatedAt: 200,
    })).toEqual({
      kind: 'manual-override',
      label: 'Manual override: working a different guest than the board target',
      updatedAt: 200,
    });
  });

  it('falls back cleanly when only one override exists', () => {
    expect(resolveCoordinatorOverrideDisplayCue({
      alertOverrideLabel: null,
      alertOverrideUpdatedAt: null,
      manualOverrideLabel: 'Manual override: working a different event than the board target',
      manualOverrideUpdatedAt: 300,
    })?.kind).toBe('manual-override');
  });
});
