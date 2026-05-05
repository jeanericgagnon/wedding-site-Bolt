import { BuilderProject } from '../../types/builder/project';
import { WeddingDataV1 } from '../../types/weddingData';
import { builderProjectService } from './builderProjectService';
import { serializeBuilderProject } from '../serializers/projectSerializer';
import { customerSafeErrorMessage } from '../../lib/customerSafeError';

export type PublishResult = {
  success: boolean;
  publishedAt: string;
  version: number;
  error?: string;
};

export const publishService = {
  async publish(project: BuilderProject): Promise<PublishResult> {
    try {
      const normalizedProject = serializeBuilderProject(project);
      await builderProjectService.saveDraft(normalizedProject);
      const publishMeta = await builderProjectService.publishProject(normalizedProject.id, normalizedProject.weddingId);

      return {
        success: true,
        publishedAt: publishMeta.publishedAt,
        version: publishMeta.version,
      };
    } catch (err) {
      return {
        success: false,
        publishedAt: '',
        version: project.publishedVersion ?? 0,
        error: customerSafeErrorMessage(err, 'Couldn’t update the live site yet.'),
      };
    }
  },

  async saveDraft(project: BuilderProject, weddingData?: WeddingDataV1): Promise<void> {
    return builderProjectService.saveDraft(project, weddingData);
  },
};
