import { describe, expect, it } from 'vitest';
import { createEmptyBuilderProject } from '../../types/builder/project';
import type { BuilderSectionInstance } from '../../types/builder/section';
import { getPublishIssue, getPublishValidationError } from './publishReadiness';
import { createEmptyWeddingData } from '../../types/weddingData';

function makeSection(overrides?: Partial<BuilderSectionInstance>): BuilderSectionInstance {
  const now = new Date().toISOString();
  return {
    id: `s_${Math.random().toString(36).slice(2)}`,
    type: 'hero',
    variant: 'default',
    enabled: true,
    locked: false,
    orderIndex: 0,
    settings: {},
    bindings: {},
    styleOverrides: {},
    meta: { createdAtISO: now, updatedAtISO: now },
    ...overrides,
  };
}

describe('publishReadiness', () => {
  it('returns no-pages issue when project has no pages', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [];

    const issue = getPublishIssue(project);
    expect(issue?.kind).toBe('no-pages');
    expect(getPublishValidationError(project)).toBe('Add at least one page before publishing.');
  });

  it('returns no-enabled-sections issue when sections are all disabled', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    const pageId = project.pages[0].id;
    const section = makeSection({ id: 'sec1', enabled: false });
    project.pages[0].sections = [section];

    const issue = getPublishIssue(project);
    expect(issue?.kind).toBe('no-enabled-sections');
    if (issue?.kind === 'no-enabled-sections') {
      expect(issue.firstPageId).toBe(pageId);
      expect(issue.firstSectionId).toBe('sec1');
    }
    expect(getPublishValidationError(project)).toBe('Enable at least one section before publishing.');
  });

  it('returns null when publish requirements are met', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];

    expect(getPublishIssue(project)).toBeNull();
    expect(getPublishValidationError(project)).toBeNull();
  });

  it('blocks publish when couple names are missing', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();

    const issue = getPublishIssue(project, data);
    expect(issue?.kind).toBe('missing-couple-names');
    expect(getPublishValidationError(project, data)).toBe('Add both partner names before publishing.');
  });

  it('passes data preflight when names/date/venue/rsvp are configured', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = true;

    expect(getPublishIssue(project, data)).toBeNull();
    expect(getPublishValidationError(project, data)).toBeNull();
  });
});
