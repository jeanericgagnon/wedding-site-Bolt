import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';

export const canResumeQuickStartFollowUps = (
  showFollowUps: boolean,
  clarifyingState: ClarifyingPersistenceEnvelope | null,
) => {
  if (!showFollowUps) return false;
  return (clarifyingState?.clarifying.questions.length || 0) > 0;
};
