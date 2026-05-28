import { describe, expect, it } from 'vitest';
import { getAuthEntryIntent } from './authEntryIntent';

describe('getAuthEntryIntent', () => {
  it('classifies builder review handoff as the draft-start path', () => {
    expect(getAuthEntryIntent({ explicitReturnPath: '/dashboard/builder' })).toBe('draft-start');
  });

  it('classifies quick-start continuation paths as quick-start intent', () => {
    expect(getAuthEntryIntent({ explicitReturnPath: '/onboarding/quick-start?bypassPayment=1' })).toBe('quick-start');
    expect(getAuthEntryIntent({ explicitReturnPath: '/onboarding/quick-start?bypassPayment=1&step=followups' })).toBe('quick-start');
  });

  it('classifies carried quick-start draft state as quick-start intent even without an explicit return path', () => {
    expect(getAuthEntryIntent({ hasMeaningfulQuickStartDraft: true })).toBe('quick-start');
  });

  it('classifies other onboarding continuations separately from quick-start', () => {
    expect(getAuthEntryIntent({ explicitReturnPath: '/onboarding?signup=1' })).toBe('onboarding');
  });

  it('falls back to the default auth entry when no continuation exists', () => {
    expect(getAuthEntryIntent({ explicitReturnPath: null, hasMeaningfulQuickStartDraft: false })).toBe('default');
  });
});
