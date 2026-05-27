import { describe, expect, it } from 'vitest';

import { createEmptyBuilderProject } from '../../types/builder/project';
import { createDefaultSectionInstance } from '../../types/builder/section';
import { createEmptyWeddingData } from '../../types/weddingData';
import { getBuilderLaunchPrepSummary } from './builderLaunchPrepSummary';

const createLaunchReadyWeddingData = () => {
  const weddingData = createEmptyWeddingData();
  weddingData.couple.partner1Name = 'Alex';
  weddingData.couple.partner2Name = 'Jordan';
  weddingData.event.weddingDateISO = '2026-06-15T16:00';
  weddingData.rsvp.enabled = true;
  weddingData.venues = [{ id: 'venue-1', name: 'Sunset Estate', address: '123 Main' }];
  return weddingData;
};

describe('getBuilderLaunchPrepSummary', () => {
  it('turns no-page launch blockers into page-recovery guidance', () => {
    const project = createEmptyBuilderProject('w1', 'modern-luxe');
    project.pages = [];

    const summary = getBuilderLaunchPrepSummary({
      project,
      weddingData: null,
      isDirty: false,
      activePageId: null,
      isPublished: false,
    });

    expect(summary.issue?.kind).toBe('no-pages');
    expect(summary.primaryAction).toEqual({ kind: 'add-page', label: 'Add first page' });
    expect(summary.checklistItems.find((item) => item.id === 'page')?.action).toEqual({
      kind: 'add-page',
      label: 'Add first page',
    });
  });

  it('turns unsaved launch blockers into save-first guidance', () => {
    const project = createEmptyBuilderProject('w1', 'modern-luxe');
    project.pages[0].sections = [createDefaultSectionInstance('hero', 'default', 0)];
    project.pages[0].sections[0].enabled = true;

    const summary = getBuilderLaunchPrepSummary({
      project,
      weddingData: createLaunchReadyWeddingData(),
      isDirty: true,
      activePageId: project.pages[0].id,
      isPublished: false,
    });

    expect(summary.issue?.kind).toBe('unsaved-changes');
    expect(summary.primaryAction).toEqual({ kind: 'save-draft', label: 'Save draft first' });
    expect(summary.checklistItems.find((item) => item.id === 'saved')?.action).toEqual({
      kind: 'save-draft',
      label: 'Save now',
    });
  });

  it('routes section launch blockers through the active page recovery action', () => {
    const project = createEmptyBuilderProject('w1', 'modern-luxe');
    project.pages[0].sections = [createDefaultSectionInstance('faq', 'default', 0)];
    project.pages[0].sections[0].enabled = false;

    const summary = getBuilderLaunchPrepSummary({
      project,
      weddingData: createLaunchReadyWeddingData(),
      isDirty: false,
      activePageId: project.pages[0].id,
      isPublished: false,
    });

    expect(summary.issue?.kind).toBe('no-enabled-sections');
    expect(summary.primaryAction).toEqual({
      kind: 'apply-page-guide',
      label: 'Add missing essentials (5)',
      pageId: project.pages[0].id,
      pageAction: {
        kind: 'add-essential-kit',
        label: 'Add missing essentials (5)',
        sectionTypes: ['hero', 'story', 'schedule', 'travel', 'rsvp'],
      },
    });
    expect(summary.checklistItems.find((item) => item.id === 'sections')?.action).toEqual(summary.primaryAction);
  });

  it('treats clean drafts as publish-ready launch prep', () => {
    const project = createEmptyBuilderProject('w1', 'modern-luxe');
    project.pages[0].sections = [createDefaultSectionInstance('hero', 'default', 0)];
    project.pages[0].sections[0].enabled = true;

    const summary = getBuilderLaunchPrepSummary({
      project,
      weddingData: createLaunchReadyWeddingData(),
      isDirty: false,
      activePageId: project.pages[0].id,
      isPublished: false,
    });

    expect(summary.issue).toBeNull();
    expect(summary.primaryAction).toEqual({ kind: 'publish', label: 'Publish with confidence' });
    expect(summary.blockerHints).toEqual([
      'Use the launch check to confirm the draft, then publish from a stable state.',
    ]);
  });
});
