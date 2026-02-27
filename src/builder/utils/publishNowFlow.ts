import type { BuilderProject } from '../../types/builder/project';
import { getPublishIssue } from './publishReadiness';

export type PublishNowAction = 'skip' | 'fix-blockers' | 'publish';

export const getPublishNowAction = (
  shouldAutoPublish: boolean,
  project: BuilderProject | null | undefined
): PublishNowAction => {
  if (!shouldAutoPublish || !project) return 'skip';
  return getPublishIssue(project) ? 'fix-blockers' : 'publish';
};
