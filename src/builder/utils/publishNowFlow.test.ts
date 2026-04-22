import { describe, expect, it } from 'vitest';
import { createEmptyBuilderProject } from '../../types/builder/project';
import { createDefaultSectionInstance } from '../../types/builder/section';
import { createEmptyWeddingData } from '../../types/weddingData';
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

  it('returns fix-blockers when publish intent includes incomplete wedding data', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [createDefaultSectionInstance('hero', 'default', 0)];
    project.pages[0].sections[0].enabled = true;
    const weddingData = createEmptyWeddingData();

    expect(getPublishNowAction(true, project, weddingData)).toBe('fix-blockers');
  });

  it('returns publish when project and wedding data are both launch-ready', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [createDefaultSectionInstance('hero', 'default', 0)];
    project.pages[0].sections[0].enabled = true;
    const weddingData = createEmptyWeddingData();
    weddingData.couple.partner1Name = 'Alex';
    weddingData.couple.partner2Name = 'Jordan';
    weddingData.event.weddingDateISO = '2027-06-12';
    weddingData.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    weddingData.rsvp.enabled = true;

    expect(getPublishNowAction(true, project, weddingData)).toBe('publish');
  });

  it('keeps returning skip when both intent and project are missing', () => {
    expect(getPublishNowAction(false, null)).toBe('skip');
  });
});
