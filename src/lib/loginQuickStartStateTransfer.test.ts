import { beforeEach, describe, expect, it } from 'vitest';
import { persistQuickStartDraftSnapshot, readQuickStartDraftSnapshot } from './quickStartStateTransfer';

describe('login quick start state transfer', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('can persist a carried quick start draft before login/auth continuation', () => {
    persistQuickStartDraftSnapshot({
      initialSetupAnswers: { names: 'Alex & Jordan' },
      followUpAnswers: { 'event-1-time': '6:00 PM' },
      showFollowUps: true,
      viewState: 'followups',
    });

    expect(readQuickStartDraftSnapshot()?.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(readQuickStartDraftSnapshot()?.followUpAnswers['event-1-time']).toBe('6:00 PM');
  });
});
