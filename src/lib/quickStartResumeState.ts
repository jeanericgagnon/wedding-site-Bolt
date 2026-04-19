import type { QuickStartDraftSnapshot } from './quickStartPersistence';

export const resolveQuickStartResumeViewState = (snapshot: Pick<QuickStartDraftSnapshot, 'showFollowUps' | 'viewState'>) => {
  if (snapshot.showFollowUps) return 'followups' as const;
  if (snapshot.viewState === 'thinking') return 'question' as const;
  return snapshot.viewState;
};
