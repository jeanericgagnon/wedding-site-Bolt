import { beforeEach, describe, expect, it, vi } from 'vitest';

const { saveDraftMock, publishProjectMock } = vi.hoisted(() => ({
  saveDraftMock: vi.fn(),
  publishProjectMock: vi.fn(),
}));

vi.mock('./builderProjectService', () => ({
  builderProjectService: {
    saveDraft: saveDraftMock,
    publishProject: publishProjectMock,
  },
}));

import { createEmptyBuilderProject } from '../../types/builder/project';
import { publishService } from './publishService';

describe('publishService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a safe publish failure instead of raw backend/provider copy', async () => {
    const project = createEmptyBuilderProject('site-1', 'modern-luxe');
    saveDraftMock.mockResolvedValue(project);
    publishProjectMock.mockRejectedValue(new Error('functions/v1/publish-site token expired'));

    const result = await publishService.publish(project);

    expect(result).toEqual({
      success: false,
      publishedAt: '',
      version: 0,
      error: 'Could not update the live site right now. Please try again.',
    });
  });
});
