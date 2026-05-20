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

  it('treats non-boolean enabled section flags as disabled for publish truth', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    const pageId = project.pages[0].id;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    const section = makeSection({ id: 'sec-string-enabled', enabled: 'true' });
    project.pages[0].sections = [section];

    const issue = getPublishIssue(project);
    expect(issue?.kind).toBe('no-enabled-sections');
    if (issue?.kind === 'no-enabled-sections') {
      expect(issue.firstPageId).toBe(pageId);
      expect(issue.firstSectionId).toBe('sec-string-enabled');
    }
    expect(buildPublishReadiness(project).find((item) => item.id === 'sections')).toEqual({
      id: 'sections',
      label: 'At least one section is turned on',
      done: false,
      detail: 'Turn on a section before going live.',
    });
    expect(buildPublishReadiness(project).find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Home.',
    });
  });

  it('picks the lowest-order section as the first blocker target when section arrays are out of order', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    const pageId = project.pages[0].id;
    project.pages[0].sections = [
      makeSection({ id: 'sec-late', enabled: false, orderIndex: 5 }),
      makeSection({ id: 'sec-early', enabled: false, orderIndex: 1 }),
    ];

    const issue = getPublishIssue(project);
    expect(issue?.kind).toBe('no-enabled-sections');
    if (issue?.kind === 'no-enabled-sections') {
      expect(issue.firstPageId).toBe(pageId);
      expect(issue.firstSectionId).toBe('sec-early');
    }
  });

  it('picks the lowest-order section when persisted section order indexes are numeric strings', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    const pageId = project.pages[0].id;
    project.pages[0].sections = [
      // @ts-expect-error exercising runtime guard for incomplete persisted data
      makeSection({ id: 'sec-late', enabled: false, orderIndex: '5' }),
      // @ts-expect-error exercising runtime guard for incomplete persisted data
      makeSection({ id: 'sec-early', enabled: false, orderIndex: '1' }),
    ];

    const issue = getPublishIssue(project);
    expect(issue?.kind).toBe('no-enabled-sections');
    if (issue?.kind === 'no-enabled-sections') {
      expect(issue.firstPageId).toBe(pageId);
      expect(issue.firstSectionId).toBe('sec-early');
    }
  });

  it('breaks tied section order indexes by section title so blocker targeting stays deterministic', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    const pageId = project.pages[0].id;
    project.pages[0].sections = [
      makeSection({ id: 'sec-zeta', enabled: false, orderIndex: 1, displayName: 'Zeta section' }),
      makeSection({ id: 'sec-alpha', enabled: false, orderIndex: 1, displayName: 'Alpha section' }),
    ];

    const issue = getPublishIssue(project);
    expect(issue?.kind).toBe('no-enabled-sections');
    if (issue?.kind === 'no-enabled-sections') {
      expect(issue.firstPageId).toBe(pageId);
      expect(issue.firstSectionId).toBe('sec-alpha');
    }
  });

  it('breaks tied section order indexes by section id when titles are also tied', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    const pageId = project.pages[0].id;
    project.pages[0].sections = [
      makeSection({ id: 'sec-zeta', enabled: false, orderIndex: 1, displayName: 'Same section' }),
      makeSection({ id: 'sec-alpha', enabled: false, orderIndex: 1, displayName: 'Same section' }),
    ];

    const issue = getPublishIssue(project);
    expect(issue?.kind).toBe('no-enabled-sections');
    if (issue?.kind === 'no-enabled-sections') {
      expect(issue.firstPageId).toBe(pageId);
      expect(issue.firstSectionId).toBe('sec-alpha');
    }
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
    expect(getPublishValidationError(project, data)).toBe('Add both names exactly how you want them shown before going live.');
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

  it('blocks publish when latest draft edits are still unsaved', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = true;

    expect(getPublishIssue(project, data, { isDirty: true })?.kind).toBe('unsaved-changes');
    expect(getPublishIssue(project, data, { isDirty: false })).toBeNull();
    expect(getPublishValidationError(project, data, { isDirty: true })).toBe('Save your latest draft changes before going live.');
    expect(getPublishValidationError(project, data, { isDirty: false })).toBeNull();
    expect(buildPublishReadiness(project, data, { isDirty: true }).find((item) => item.id === 'saved')).toEqual({
      id: 'saved',
      label: 'Latest edits are saved',
      done: false,
      detail: 'Save your latest draft changes before going live.',
    });
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
    expect(getPublishValidationError(project, data)).toBe('Add at least one venue name or address before going live.');
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

  it('blocks publish when persisted wedding data is missing the RSVP enabled flag', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.rsvp.enabled;

    expect(getPublishIssue(project, data)?.kind).toBe('rsvp-disabled');
    expect(getPublishValidationError(project, data)).toBe('Turn RSVP on before going live.');
  });

  it('blocks publish when persisted wedding data is missing the RSVP object entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.rsvp;

    expect(getPublishIssue(project, data)?.kind).toBe('rsvp-disabled');
    expect(getPublishValidationError(project, data)).toBe('Turn RSVP on before going live.');
  });

  it('blocks publish when persisted wedding data has a non-object RSVP shape', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.rsvp = 'broken';

    expect(getPublishIssue(project, data)?.kind).toBe('rsvp-disabled');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'rsvp')).toEqual({
      id: 'rsvp',
      label: 'RSVP is turned on',
      done: false,
      detail: 'Turn RSVP on or remove RSVP calls to action.',
    });
  });

  it('blocks publish when persisted wedding data is missing the venues array entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.venues;

    expect(getPublishIssue(project, data)?.kind).toBe('missing-venue');
    expect(getPublishValidationError(project, data)).toBe('Add at least one venue name or address before going live.');
  });

  it('blocks publish when persisted wedding data is missing the couple object entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.event.weddingDateISO = '2027-06-12';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.couple;

    expect(getPublishIssue(project, data)?.kind).toBe('missing-couple-names');
    expect(getPublishValidationError(project, data)).toBe('Add both names exactly how you want them shown before going live.');
  });

  it('blocks publish when persisted wedding data has a non-object couple shape', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.event.weddingDateISO = '2027-06-12';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.couple = 'broken';

    expect(getPublishIssue(project, data)?.kind).toBe('missing-couple-names');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'names')).toEqual({
      id: 'names',
      label: 'Couple names are filled in',
      done: false,
      detail: 'Add both names exactly how you want them shown.',
    });
  });

  it('blocks publish when persisted wedding data is missing the event object entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.event;

    expect(getPublishIssue(project, data)?.kind).toBe('missing-event-date');
    expect(getPublishValidationError(project, data)).toBe('Add your wedding date before going live.');
  });

  it('blocks publish when persisted wedding data has a non-object event shape', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.event = 'broken';

    expect(getPublishIssue(project, data)?.kind).toBe('missing-event-date');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'date')).toEqual({
      id: 'date',
      label: 'Wedding date is set',
      done: false,
      detail: 'Add your wedding date.',
    });
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

  it('marks RSVP readiness incomplete when wedding data is missing an explicit RSVP flag', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.rsvp.enabled;

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'rsvp')).toEqual({
      id: 'rsvp',
      label: 'RSVP is turned on',
      done: false,
      detail: 'Turn RSVP on or remove RSVP calls to action.',
    });
  });

  it('marks RSVP readiness incomplete when wedding data is missing the RSVP object entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.rsvp;

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'rsvp')).toEqual({
      id: 'rsvp',
      label: 'RSVP is turned on',
      done: false,
      detail: 'Turn RSVP on or remove RSVP calls to action.',
    });
  });

  it('marks names readiness incomplete when persisted wedding data is missing the couple object entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.couple;

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'names')).toEqual({
      id: 'names',
      label: 'Couple names are filled in',
      done: false,
      detail: 'Add both names exactly how you want them shown.',
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

  it('blocks publish and marks names incomplete when persisted wedding data is missing one partner name field entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.couple.partner2Name;

    expect(getPublishIssue(project, data)?.kind).toBe('missing-couple-names');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'names')).toEqual({
      id: 'names',
      label: 'Couple names are filled in',
      done: false,
      detail: 'Add both names exactly how you want them shown.',
    });
  });

  it('blocks publish and marks names incomplete when persisted couple data contains a null partner entry', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.couple.partner1Name = null;
    data.couple.partner2Name = 'Jordan';

    expect(getPublishIssue(project, data)?.kind).toBe('missing-couple-names');
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

  it('marks venue readiness incomplete when persisted wedding data is missing the venues array entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.venues;

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: false,
      detail: 'Add at least one venue name or address.',
    });
  });

  it('blocks publish and marks venue incomplete when persisted venue entries are null', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.venues = [null];

    expect(getPublishIssue(project, data)?.kind).toBe('missing-venue');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: false,
      detail: 'Add at least one venue name or address.',
    });
  });

  it('blocks publish and marks venue incomplete when persisted venue entries are missing both name and address fields', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    data.venues = [{ id: 'v1' }];

    expect(getPublishIssue(project, data)?.kind).toBe('missing-venue');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: false,
      detail: 'Add at least one venue name or address.',
    });
  });

  it('blocks publish and marks venue incomplete when persisted venues are not an array', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.venues = { broken: true };

    expect(getPublishIssue(project, data)?.kind).toBe('missing-venue');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: false,
      detail: 'Add at least one venue name or address.',
    });
  });

  it('blocks publish and marks venue incomplete when persisted venue arrays contain only non-object junk', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.venues = ['broken-venue'];

    expect(getPublishIssue(project, data)?.kind).toBe('missing-venue');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: false,
      detail: 'Add at least one venue name or address.',
    });
  });

  it('blocks publish and marks venue incomplete when venue objects are missing string ids', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.venues = [{ name: 'Test Venue', address: '123 Main St' }];

    expect(getPublishIssue(project, data)?.kind).toBe('missing-venue');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: false,
      detail: 'Add at least one venue name or address.',
    });
  });

  it('accepts numeric venue ids from persisted data when venue details are otherwise valid', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    data.venues = [
      // @ts-expect-error exercising runtime guard for incomplete persisted data
      { id: 7, name: 'Test Venue', address: '123 Main St' },
    ];

    expect(getPublishIssue(project, data)).toBeNull();
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: true,
      detail: 'Venue details are ready.',
    });
  });

  it('still treats venue data as ready when persisted venues are out of order but a later sorted venue has the usable details', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    data.venues = [
      { id: 'venue-2', name: '   ', address: '   ' },
      // @ts-expect-error exercising runtime guard for incomplete persisted data
      { id: 'venue-1', orderIndex: '0', name: 'Sunset Cliffs', address: '   ' },
    ];

    expect(getPublishIssue(project, data)).toBeNull();
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: true,
      detail: 'Venue details are ready.',
    });
  });

  it('breaks tied venue order indexes by venue name so venue readiness stays deterministic', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    data.venues = [
      { id: 'venue-zeta', orderIndex: 1, name: '   ', address: '   ' },
      { id: 'venue-alpha', orderIndex: 1, name: 'Sunset Cliffs', address: '   ' },
      ] as unknown as typeof data.venues;

    expect(getPublishIssue(project, data)).toBeNull();
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: true,
      detail: 'Venue details are ready.',
    });
  });

  it('breaks tied venue order indexes by venue id when venue names are also tied', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.rsvp.enabled = true;
    data.venues = [
      { id: 'venue-zeta', orderIndex: 1, name: 'Same Venue', address: '   ' },
      { id: 'venue-alpha', orderIndex: 1, name: 'Same Venue', address: '123 Main St' },
      ] as unknown as typeof data.venues;

    expect(getPublishIssue(project, data)).toBeNull();
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: true,
      detail: 'Venue details are ready.',
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

  it('marks date readiness complete when the wedding date has surrounding whitespace but real content', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.event.weddingDateISO = ' 2027-06-12 ';

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'date')).toEqual({
      id: 'date',
      label: 'Wedding date is set',
      done: true,
      detail: 'Date is ready.',
    });
  });

  it('marks date readiness incomplete when persisted wedding data is missing the event object entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete data.event;

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'date')).toEqual({
      id: 'date',
      label: 'Wedding date is set',
      done: false,
      detail: 'Add your wedding date.',
    });
  });

  it('blocks publish and marks date incomplete when persisted event data contains a null wedding date', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    data.rsvp.enabled = true;
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.event.weddingDateISO = null;

    expect(getPublishIssue(project, data)?.kind).toBe('missing-event-date');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'date')).toEqual({
      id: 'date',
      label: 'Wedding date is set',
      done: false,
      detail: 'Add your wedding date.',
    });
  });

  it('treats whitespace partner-one names as missing for publish truth', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = '   ';
    data.couple.partner2Name = 'Jordan';

    expect(getPublishIssue(project, data)?.kind).toBe('missing-couple-names');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'names')).toEqual({
      id: 'names',
      label: 'Couple names are filled in',
      done: false,
      detail: 'Add both names exactly how you want them shown.',
    });
  });

  it('treats non-string partner names as missing for publish truth', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.couple.partner1Name = 42;
    data.couple.partner2Name = 'Jordan';

    expect(getPublishIssue(project, data)?.kind).toBe('missing-couple-names');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'names')).toEqual({
      id: 'names',
      label: 'Couple names are filled in',
      done: false,
      detail: 'Add both names exactly how you want them shown.',
    });
  });

  it('treats whitespace partner-two names as missing for publish truth', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = '   ';

    expect(getPublishIssue(project, data)?.kind).toBe('missing-couple-names');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'names')).toEqual({
      id: 'names',
      label: 'Couple names are filled in',
      done: false,
      detail: 'Add both names exactly how you want them shown.',
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

  it('marks saved readiness complete when a non-boolean dirty flag leaks in from runtime state', () => {
    const project = createEmptyBuilderProject('w1', 'classic');

    expect(buildPublishReadiness(project, undefined, { isDirty: 'yes' as never }).find((item) => item.id === 'saved')).toEqual({
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

  it('marks current-page readiness complete when the active page has one enabled section among disabled siblings', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].title = 'Home';
    project.pages[0].sections = [
      makeSection({ id: 'sec-disabled', enabled: false }),
      makeSection({ id: 'sec-enabled', enabled: true, orderIndex: 1 }),
    ];

    expect(buildPublishReadiness(project, undefined, { activePageId: project.pages[0].id }).find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Home has visible sections.',
    });
  });

  it('uses generic current-page success copy when the active page title is blank', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].title = '   ';
    project.pages[0].sections = [makeSection({ id: 'home-live', enabled: true })];

    expect(buildPublishReadiness(project, undefined, { activePageId: project.pages[0].id }).find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Current page has visible sections.',
    });
  });

  it('marks current-page readiness incomplete when the requested active page exists but all of its sections are disabled', () => {
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
        title: 'Details',
        orderIndex: 1,
        sections: [makeSection({ id: 'details-hidden', enabled: false })],
      },
    ];

    expect(buildPublishReadiness(project, undefined, { activePageId: 'page-2' }).find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Details.',
    });
  });

  it('strips trailing punctuation from current-page blocker titles before building the sentence', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].title = 'Details...';
    project.pages[0].sections = [makeSection({ id: 'details-hidden', enabled: false })];

    expect(buildPublishReadiness(project, undefined, { activePageId: project.pages[0].id }).find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Details.',
    });
  });

  it('strips trailing punctuation from current-page success titles before building the sentence', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].title = 'Schedule:';
    project.pages[0].sections = [makeSection({ id: 'schedule-live', enabled: true })];

    expect(buildPublishReadiness(project, undefined, { activePageId: project.pages[0].id }).find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Schedule has visible sections.',
    });
  });

  it('falls back to generic current-page copy when the active page title is blank', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].title = '';
    project.pages[0].sections = [makeSection({ id: 'home-hidden', enabled: false })];

    expect(buildPublishReadiness(project, undefined, { activePageId: project.pages[0].id }).find((item) => item.id === 'current-page')).toEqual({
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

  it('marks names readiness complete when both names have surrounding whitespace but real content', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = ' Alex ';
    data.couple.partner2Name = ' Jordan ';

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'names')).toEqual({
      id: 'names',
      label: 'Couple names are filled in',
      done: true,
      detail: 'Names are ready for guests.',
    });
  });

  it('marks venue readiness complete when venue name has surrounding whitespace but real content', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.venues = [{ id: 'v1', name: ' Sunset Cliffs ', address: '   ' }];

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: true,
      detail: 'Venue details are ready.',
    });
  });

  it('marks venue readiness complete when only the address has surrounding whitespace but real content', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.venues = [{ id: 'v1', name: '   ', address: ' 123 Main St ' }];

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'venue')).toEqual({
      id: 'venue',
      label: 'Venue details are set',
      done: true,
      detail: 'Venue details are ready.',
    });
  });

  it('marks RSVP readiness complete when replies are enabled in wedding data', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.rsvp.enabled = true;

    expect(buildPublishReadiness(project, data).find((item) => item.id === 'rsvp')).toEqual({
      id: 'rsvp',
      label: 'RSVP is turned on',
      done: true,
      detail: 'Guests can reply.',
    });
  });

  it('treats non-boolean RSVP enabled values as disabled for publish truth', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages[0].sections = [makeSection({ id: 'sec-ok', enabled: true })];
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Alex';
    data.couple.partner2Name = 'Jordan';
    data.event.weddingDateISO = '2027-06-12';
    data.venues = [{ id: 'v1', name: 'Test Venue', address: '123 Main St' }];
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    data.rsvp.enabled = 'true';

    expect(getPublishIssue(project, data)?.kind).toBe('rsvp-disabled');
    expect(buildPublishReadiness(project, data).find((item) => item.id === 'rsvp')).toEqual({
      id: 'rsvp',
      label: 'RSVP is turned on',
      done: false,
      detail: 'Turn RSVP on or remove RSVP calls to action.',
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

  it('uses the requested active page when the page id is padded with harmless whitespace', () => {
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
        title: 'Details',
        orderIndex: 1,
        sections: [makeSection({ id: 'details-hidden', enabled: false })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: ' page-2 ' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Details.',
    });
  });

  it('matches persisted active pages even when stored page ids include harmless whitespace padding', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: ' page-1 ',
        title: 'Home',
        orderIndex: 0,
        sections: [makeSection({ id: 'home-live', enabled: true })],
      },
      {
        ...project.pages[0],
        id: ' page-2 ',
        title: 'Details',
        orderIndex: 1,
        sections: [makeSection({ id: 'details-hidden', enabled: false })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'page-2' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Details.',
    });
  });

  it('matches persisted active pages when runtime activePageId leaks in as a number', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        // @ts-expect-error exercising runtime guard for incomplete persisted data
        id: 101,
        title: 'Home',
        orderIndex: 0,
        sections: [makeSection({ id: 'home-live', enabled: true })],
      },
      {
        ...project.pages[0],
        // @ts-expect-error exercising runtime guard for incomplete persisted data
        id: 202,
        title: 'Details',
        orderIndex: 1,
        sections: [makeSection({ id: 'details-hidden', enabled: false })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 202 as never });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Details.',
    });
  });

  it('trims blocker target ids when persisted page and section ids include harmless whitespace', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: ' page-1 ',
        title: 'Home',
        orderIndex: 0,
        sections: [makeSection({ id: ' sec-1 ', enabled: false })],
      },
    ];

    expect(getPublishIssue(project)).toEqual({
      kind: 'no-enabled-sections',
      message: 'Turn on at least one section before going live.',
      firstPageId: 'page-1',
      firstSectionId: 'sec-1',
    });
  });

  it('falls back to the first page when activePageId is only whitespace', () => {
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
        title: 'Details',
        orderIndex: 1,
        sections: [makeSection({ id: 'details-hidden', enabled: false })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: '   ' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Home has visible sections.',
    });
  });

  it('falls back to no visible current-page content when persisted active page sections are missing entirely', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    delete project.pages[0].sections;

    const readiness = buildPublishReadiness(project, undefined, { activePageId: project.pages[0].id });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Home.',
    });
  });

  it('falls back to no visible current-page content when persisted active page sections contain null entries', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    project.pages[0].sections = [null];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: project.pages[0].id });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Home.',
    });
  });

  it('falls back to no visible current-page content when persisted page sections are not arrays', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    project.pages[0].sections = { broken: true };

    const readiness = buildPublishReadiness(project, undefined, { activePageId: project.pages[0].id });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Home.',
    });
  });

  it('treats non-object section entries as absent for publish truth', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    project.pages[0].sections = ['broken-section'];

    expect(getPublishIssue(project)).toEqual({
      kind: 'no-enabled-sections',
      message: 'Turn on at least one section before going live.',
      firstSectionId: undefined,
      firstPageId: undefined,
    });
    expect(buildPublishReadiness(project).find((item) => item.id === 'sections')).toEqual({
      id: 'sections',
      label: 'At least one section is turned on',
      done: false,
      detail: 'Turn on a section before going live.',
    });
  });

  it('treats section objects without string ids as absent for publish truth', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    project.pages[0].sections = [{ enabled: false, orderIndex: 0 }];

    expect(getPublishIssue(project)).toEqual({
      kind: 'no-enabled-sections',
      message: 'Turn on at least one section before going live.',
      firstSectionId: undefined,
      firstPageId: undefined,
    });
    expect(buildPublishReadiness(project).find((item) => item.id === 'sections')).toEqual({
      id: 'sections',
      label: 'At least one section is turned on',
      done: false,
      detail: 'Turn on a section before going live.',
    });
  });

  it('falls back to the first real page when persisted page arrays contain null entries', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      // @ts-expect-error exercising runtime guard for incomplete persisted data
      null,
      {
        ...project.pages[0],
        id: 'page-1',
        title: 'Home',
        orderIndex: 0,
        sections: [makeSection({ id: 'home-live', enabled: true })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'missing-page' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Home has visible sections.',
    });
  });

  it('falls back to the lowest-order real page when persisted page arrays are out of order', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: 'page-2',
        title: 'Details',
        orderIndex: 2,
        sections: [makeSection({ id: 'details-hidden', enabled: false })],
      },
      {
        ...project.pages[0],
        id: 'page-1',
        title: 'Home',
        orderIndex: 0,
        sections: [makeSection({ id: 'home-live', enabled: true })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'missing-page' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Home has visible sections.',
    });
    expect(buildPublishReadiness(project).find((item) => item.id === 'page')).toEqual({
      id: 'page',
      label: 'A page exists',
      done: true,
      detail: '2 pages ready',
    });
  });

  it('falls back to the lowest-order real page when persisted page order indexes are numeric strings', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: 'page-2',
        title: 'Details',
        // @ts-expect-error exercising runtime guard for incomplete persisted data
        orderIndex: '2',
        sections: [makeSection({ id: 'details-hidden', enabled: false })],
      },
      {
        ...project.pages[0],
        id: 'page-1',
        title: 'Home',
        // @ts-expect-error exercising runtime guard for incomplete persisted data
        orderIndex: '0',
        sections: [makeSection({ id: 'home-live', enabled: true })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'missing-page' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Home has visible sections.',
    });
  });

  it('breaks tied page order indexes by page title so fallback targeting stays deterministic', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: 'page-alpha',
        title: 'Zulu',
        orderIndex: 1,
        sections: [makeSection({ id: 'details-hidden', enabled: false })],
      },
      {
        ...project.pages[0],
        id: 'page-zeta',
        title: 'Alpha',
        orderIndex: 1,
        sections: [makeSection({ id: 'home-live', enabled: true })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'missing-page' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Alpha has visible sections.',
    });
  });

  it('breaks tied page order indexes by page id when titles are also tied', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: 'page-zeta',
        title: 'Same title',
        orderIndex: 1,
        sections: [makeSection({ id: 'details-hidden', enabled: false })],
      },
      {
        ...project.pages[0],
        id: 'page-alpha',
        title: 'Same title',
        orderIndex: 1,
        sections: [makeSection({ id: 'home-live', enabled: true })],
      },
    ];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'missing-page' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: true,
      detail: 'Same title has visible sections.',
    });
  });

  it('ignores whitespace-only string order indexes when picking fallback pages and sections', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        id: 'page-2',
        title: 'Details',
        // @ts-expect-error exercising runtime guard for incomplete persisted data
        orderIndex: '   ',
        sections: [
          // @ts-expect-error exercising runtime guard for incomplete persisted data
          makeSection({ id: 'details-late', enabled: false, orderIndex: '   ' }),
        ],
      },
      {
        ...project.pages[0],
        id: 'page-1',
        title: 'Home',
        orderIndex: 0,
        sections: [makeSection({ id: 'home-early', enabled: false, orderIndex: 0 })],
      },
    ];

    const issue = getPublishIssue(project);
    expect(issue?.kind).toBe('no-enabled-sections');
    if (issue?.kind === 'no-enabled-sections') {
      expect(issue.firstPageId).toBe('page-1');
      expect(issue.firstSectionId).toBe('home-early');
    }

    const readiness = buildPublishReadiness(project, undefined, { activePageId: 'missing-page' });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for Home.',
    });
  });

  it('returns no-pages when persisted page arrays contain only null entries', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      // @ts-expect-error exercising runtime guard for incomplete persisted data
      null,
    ];

    expect(getPublishIssue(project)).toEqual({
      kind: 'no-pages',
      message: 'Add at least one page before going live.',
    });
  });

  it('returns no-pages when persisted page collections are not arrays', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    project.pages = { broken: true };

    expect(getPublishIssue(project)).toEqual({
      kind: 'no-pages',
      message: 'Add at least one page before going live.',
    });
    expect(buildPublishReadiness(project).find((item) => item.id === 'page')).toEqual({
      id: 'page',
      label: 'A page exists',
      done: false,
      detail: 'Add a page or apply a starting design.',
    });
  });

  it('returns no-pages when persisted page arrays contain only non-page junk entries', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    project.pages = ['broken-page'];

    expect(getPublishIssue(project)).toEqual({
      kind: 'no-pages',
      message: 'Add at least one page before going live.',
    });
    expect(buildPublishReadiness(project).find((item) => item.id === 'page')).toEqual({
      id: 'page',
      label: 'A page exists',
      done: false,
      detail: 'Add a page or apply a starting design.',
    });
  });

  it('returns no-pages when persisted page objects are missing string ids', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    project.pages = [{ title: 'Broken page', orderIndex: 0, sections: [] }];

    expect(getPublishIssue(project)).toEqual({
      kind: 'no-pages',
      message: 'Add at least one page before going live.',
    });
    expect(buildPublishReadiness(project).find((item) => item.id === 'page')).toEqual({
      id: 'page',
      label: 'A page exists',
      done: false,
      detail: 'Add a page or apply a starting design.',
    });
  });

  it('accepts numeric page ids from persisted data when resolving blocker targets', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      {
        ...project.pages[0],
        // @ts-expect-error exercising runtime guard for incomplete persisted data
        id: 42,
        title: 'Home',
        orderIndex: 0,
        sections: [makeSection({ id: 'sec-1', enabled: false })],
      },
    ];

    expect(getPublishIssue(project)).toEqual({
      kind: 'no-enabled-sections',
      message: 'Turn on at least one section before going live.',
      firstPageId: '42',
      firstSectionId: 'sec-1',
    });
  });

  it('shows zero page readiness when persisted page arrays contain only null entries', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    project.pages = [
      // @ts-expect-error exercising runtime guard for incomplete persisted data
      null,
    ];

    expect(buildPublishReadiness(project).find((item) => item.id === 'page')).toEqual({
      id: 'page',
      label: 'A page exists',
      done: false,
      detail: 'Add a page or apply a starting design.',
    });
  });

  it('falls back to generic current-page copy when persisted active page title is not a string', () => {
    const project = createEmptyBuilderProject('w1', 'classic');
    // @ts-expect-error exercising runtime guard for incomplete persisted data
    project.pages[0].title = { text: 'Home' };
    project.pages[0].sections = [makeSection({ id: 'home-hidden', enabled: false })];

    const readiness = buildPublishReadiness(project, undefined, { activePageId: project.pages[0].id });
    expect(readiness.find((item) => item.id === 'current-page')).toEqual({
      id: 'current-page',
      label: 'Current page has visible content',
      done: false,
      detail: 'Turn on content for the current page.',
    });
  });
});
