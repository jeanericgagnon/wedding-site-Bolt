import { BuilderProject } from '../../types/builder/project';
import { builderProjectService } from './builderProjectService';

export type PublishResult = {
  success: boolean;
  publishedAt: string;
  version: number;
  error?: string;
};

export const publishService = {
  async publish(project: BuilderProject): Promise<PublishResult> {
    try {
      await builderProjectService.saveDraft(project);
      await builderProjectService.publishProject(project.id, project.weddingId);

      return {
        success: true,
        publishedAt: new Date().toISOString(),
        version: (project.publishedVersion ?? 0) + 1,
      };
    } catch (err) {
      return {
        success: false,
        publishedAt: '',
        version: project.publishedVersion ?? 0,
        error: err instanceof Error ? err.message : 'Unknown publish error',
      };
    }
  },

  async saveDraft(project: BuilderProject): Promise<void> {
    return builderProjectService.saveDraft(project);
  },
};
