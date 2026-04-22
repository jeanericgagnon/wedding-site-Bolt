import type { QuickStartDraftSnapshot } from './quickStartPersistence';
import { canResumeQuickStartFollowUps } from './quickStartFollowUpGate';

export const resolveQuickStartResumeViewState = (snapshot: Pick<QuickStartDraftSnapshot, 'showFollowUps' | 'viewState' | 'clarifyingState'>) => {
  if (canResumeQuickStartFollowUps(snapshot.showFollowUps, snapshot.clarifyingState)) return 'followups' as const;
  if (snapshot.viewState === 'thinking') return 'question' as const;
  return snapshot.viewState === 'followups' ? 'question' : snapshot.viewState;
};
