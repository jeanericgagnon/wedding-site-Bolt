import type { BuilderProject } from '../../types/builder/project';
import type { WeddingDataV1 } from '../../types/weddingData';
import { getPublishIssue } from './publishReadiness';

export type PublishNowAction = 'skip' | 'fix-blockers' | 'publish';

interface PublishNowOptions {
  isDirty?: boolean;
}

export const getPublishNowAction = (
  shouldAutoPublish: boolean,
  project: BuilderProject | null | undefined,
  weddingData?: WeddingDataV1 | null,
  options?: PublishNowOptions,
): PublishNowAction => {
  if (!shouldAutoPublish || !project) return 'skip';
  return getPublishIssue(project, weddingData, { isDirty: options?.isDirty === true }) ? 'fix-blockers' : 'publish';
};
