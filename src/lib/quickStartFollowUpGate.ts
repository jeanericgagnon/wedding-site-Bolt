import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';

export const canResumeQuickStartFollowUps = (
  showFollowUps: boolean,
  clarifyingState: ClarifyingPersistenceEnvelope | null,
) => {
  if (!showFollowUps) return false;
  return (clarifyingState?.clarifying.questions.some((question) => (
    question.status === 'pending' || question.status === 'unresolved'
  )) || false);
};
