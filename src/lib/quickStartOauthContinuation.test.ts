import { beforeEach, describe, expect, it } from 'vitest';
import { persistQuickStartDraftSnapshot, readQuickStartDraftSnapshot } from './quickStartStateTransfer';
import { writeSignupReturnPath, readSignupReturnPath } from './signupContinuation';

describe('quick start oauth continuation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can synchronously persist both draft state and return path before auth redirect', () => {
    persistQuickStartDraftSnapshot({
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: { 'event-1-time': '6:00 PM' },
      showFollowUps: true,
      viewState: 'followups',
    });
    writeSignupReturnPath('/onboarding/quick-start?bypassPayment=1');

    expect(readQuickStartDraftSnapshot()?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(readQuickStartDraftSnapshot()?.followUpAnswers['event-1-time']).toBe('6:00 PM');
    expect(readSignupReturnPath()).toBe('/onboarding/quick-start?bypassPayment=1');
  });
});
