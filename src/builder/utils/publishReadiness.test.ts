import { describe, expect, it } from 'vitest';
import { createEmptyBuilderProject } from '../../types/builder/project';
import type { BuilderSectionInstance } from '../../types/builder/section';
import { buildPublishReadiness, getPublishIssue, getPublishValidationError } from './publishReadiness';
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
    expect(getPublishValidationError(project)).toBe('Add at least one page before going live.');
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
    expect(getPublishValidationError(project)).toBe('Turn on at least one section before going live.');
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
    expect(getPublishValidationError(project, data)).toBe('Add both partner names before going live.');
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

  it('blocks publish when event date is missing even if names and RSVP are configured', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = true;

    expect(getPublishIssue(project, data)?.kind).toBe('missing-event-date');
    expect(getPublishValidationError(project, data)).toBe('Add your wedding date before going live.');
  });

  it('blocks publish when venue is missing even if names, date, and RSVP are configured', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;

    expect(getPublishIssue(project, data)?.kind).toBe('missing-venue');
    expect(getPublishValidationError(project, data)).toBe('Add at least one venue before going live.');
  });

  it('blocks publish when RSVP is disabled even if names, date, and venue are configured', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = false;

    expect(getPublishIssue(project, data)?.kind).toBe('rsvp-disabled');
    expect(getPublishValidationError(project, data)).toBe('Turn RSVP on before going live.');
  });

  it('marks RSVP readiness incomplete when wedding data disables replies', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.rsvp.enabled = false;

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'rsvp')).toEqual({
      id: 'rsvp',
      label: 'RSVP is turned on',
      done: false,
      detail: 'Turn RSVP on or remove RSVP calls to action.',
    });
  });

  it('marks names readiness incomplete when either partner name is blank whitespace', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = '   ';

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'names')).toEqual({
      id: 'names',
      label: 'Couple names are filled in',
      done: false,
      detail: 'Add both names exactly how you want them shown.',
    });
  });

  it('marks venue readiness incomplete when venue fields are only whitespace', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.venues = [{ id: 'v1', name: '   ', address: '   ' }];

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: false,
      detail: 'Add at least one venue name or address.',
    });
  });

  it('marks date readiness incomplete when the wedding date is an empty string', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.event.weddingDateISO = '';

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'date')).toEqual({
      id: 'date',
      label: 'Wedding date is set',
      done: false,
      detail: 'Add your wedding date.',
    });
  });

  it('treats whitespace wedding dates as missing for publish truth', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '   ';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = true;

    expect(getPublishIssue(project, data)?.kind).toBe('missing-event-date');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'date')).toEqual({
      id: 'date',
      label: 'Wedding date is set',
      done: false,
      detail: 'Add your wedding date.',
    });
  });

  it('marks saved readiness incomplete when the builder has unsaved changes', () => {
    const project = createEmptyBuilderProject('w1', 'classic');

    expect(buildPublishReadiness(project, undefined, { isDirty: true }).find((item) => item.id === 'saved')).toEqual({
      id: 'saved',
      label: 'Latest edits are saved',
      done: false,
      detail: 'Save your latest draft changes before going live.',
    });
  });

  it('marks saved readiness complete when the builder is clean', () => {
    const project = createEmptyBuilderProject('w1', 'classic');

    expect(buildPublishReadiness(project, undefined, { isDirty: false }).find((item) => item.id === 'saved')).toEqual({
      id: 'saved',
      label: 'Latest edits are saved',
      done: true,
      detail: 'Everything is saved.',
    });
  });

  it('marks current-page readiness incomplete when there is no page yet', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [];

    expect(buildPublishReadiness(project).find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for the current page.',
    });
  });

  it('marks sections readiness complete with singular visible-section copy', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];

    expect(buildPublishReadiness(project).find((item) => item.id === 'sections')).toEqual({
      id: 'sections',
      label: 'At least one section is turned on',
      done: true,
      detail: '1 section visible',
    });
  });

  it('marks sections readiness complete with plural visible-section copy', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [
      makeSection({ id: 'sec-a', enabled: true }),
      makeSection({ id: 'sec-b', enabled: true, orderIndex: 1 }),
    ];

    expect(buildPublishReadiness(project).find((item) => item.id === 'sections')).toEqual({
      id: 'sections',
      label: 'At least one section is turned on',
      done: true,
      detail: '2 sections visible',
    });
  });

  it('marks page readiness with singular page copy when only one page exists', () => {
    const project = createEmptyBuilderProject('w1', 'classic');

    expect(buildPublishReadiness(project).find((item) => item.id === 'page')).toEqual({
      id: 'page',
      label: 'A page exists',
      done: true,
      detail: '1 page ready',
    });
  });

  it('marks page readiness with plural page copy when multiple pages exist', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages.push({
      ...project.pages[0],
      id: 'page-2',
      title: 'Schedule',
      slug: 'schedule',
      orderIndex: 1,
      sections: [],
    });

    expect(buildPublishReadiness(project).find((item) => item.id === 'page')).toEqual({
      id: 'page',
      label: 'A page exists',
      done: true,
      detail: '2 pages ready',
    });
  });

  it('keeps current-page readiness tied to the requested active page even when another page is empty', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: 'page-1',
        title: 'Home',
        orderIndex: 0,
        sections: [makeSection({ id: 'home-live', enabled: true })],
      },
      {
        ...project.pages[0],
        id: 'page-2',
        title: 'Travel',
        orderIndex: 1,
        sections: [],
      },
    ];

    expect(buildPublishReadiness(project, undefined, { activePageId: 'page-2' }).find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Travel.',
    });
  });

  it('shows current-page readiness against the active page, not just the first page', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: 'page-1',
        title: 'Home',
        orderIndex: 0,
        sections: [makeSection({ id: 'home-hidden', enabled: false })],
      },
      {
        ...project.pages[0],
        id: 'page-2',
        title: 'Schedule',
        orderIndex: 1,
        sections: [makeSection({ id: 'schedule-live', enabled: true })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'page-2' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Schedule has visible sections.',
    });
  });

  it('falls back to the first page when the requested active page is missing', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].title = 'Home';
    project.pages[0].sections = [makeSection({ id: 'home-live', enabled: true })];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'missing-page' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Home has visible sections.',
    });
  });

  it('shows a current-page blocker when the fallback page has no visible sections', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].title = 'Home';
    project.pages[0].sections = [makeSection({ id: 'home-hidden', enabled: false })];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'missing-page' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Home.',
    });
  });

  it('falls back to the first page when activePageId is null', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].title = 'Home';
    project.pages[0].sections = [makeSection({ id: 'home-live', enabled: true })];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: null });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Home has visible sections.',
    });
  });

  it('falls back to the first page when activePageId is an empty string', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].title = 'Home';
    project.pages[0].sections = [makeSection({ id: 'home-live', enabled: true })];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: '' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Home has visible sections.',
    });
  });
});
