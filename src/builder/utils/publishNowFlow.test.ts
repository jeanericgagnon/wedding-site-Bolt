import { describe, expect, it } from 'vitest';
import { createEmptyBuilderProject } from '../../types/builder/project';
import { createDefaultSectionInstance } from '../../types/builder/section';
import { getPublishNowAction } from './publishNowFlow';

describe('publishNowFlow', () => {
  it('skips when intent is false', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    expect(getPublishNowAction(false, project)).toBe('skip');
  });

  it('skips when project is missing', () => {
    expect(getPublishNowAction(true, null)).toBe('skip');
  });

  it('returns fix-blockers when project has blocker', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [createDefaultSectionInstance('hero', 'default', 0)];
    project.pages[0].sections[0].enabled = false;
    expect(getPublishNowAction(true, project)).toBe('fix-blockers');
  });

  it('returns publish when project is publish-ready', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [createDefaultSectionInstance('hero', 'default', 0)];
    project.pages[0].sections[0].enabled = true;
    expect(getPublishNowAction(true, project)).toBe('publish');
  });
});
