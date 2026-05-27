import { describe, expect, it } from 'vitest';
import { createDefaultSectionInstance } from '../../types/builder/section';
import { getBuilderPageEditingSummary } from './builderPageEditingSummary';

describe('getBuilderPageEditingSummary', () => {
  it('keeps empty pages focused on adding an anchor section first', () => {
    const summary = getBuilderPageEditingSummary('Travel', []);

    expect(summary.focusTitle).toBe('Travel still needs its first real section');
    expect(summary.primaryAction).toEqual({
      kind: 'add-section',
      label: 'Add hero section',
      sectionType: 'hero',
    });
    expect(summary.secondaryAction).toEqual({
      kind: 'add-essential-kit',
      label: 'Add essential page kit',
      sectionTypes: ['hero', 'story', 'schedule', 'travel', 'rsvp', 'faq'],
    });
  });

  it('pushes pages with missing essentials toward the biggest guest gap first', () => {
    const sections = [
      createDefaultSectionInstance('hero', 'default', 0),
      createDefaultSectionInstance('venue', 'card', 1),
    ];

    const summary = getBuilderPageEditingSummary('Weekend', sections);

    expect(summary.missingEssentialLabels).toContain('Our Story');
    expect(summary.bestNextMove).toContain('Our Story');
    expect(summary.primaryAction).toEqual({
      kind: 'add-essential-kit',
      label: 'Add missing essentials (5)',
      sectionTypes: ['story', 'schedule', 'travel', 'rsvp', 'faq'],
    });
    expect(summary.secondaryAction).toEqual({
      kind: 'add-section',
      label: 'Add Our Story',
      sectionType: 'story',
    });
  });

  it('steers pages with hidden structure toward reviewing that section before adding more', () => {
    const hiddenFaq = {
      ...createDefaultSectionInstance('faq', 'default', 1),
      enabled: false,
    };
    const sections = [
      createDefaultSectionInstance('hero', 'default', 0),
      createDefaultSectionInstance('story', 'default', 1),
      createDefaultSectionInstance('schedule', 'default', 2),
      createDefaultSectionInstance('travel', 'list', 3),
      createDefaultSectionInstance('rsvp', 'default', 4),
      hiddenFaq,
    ];

    const summary = getBuilderPageEditingSummary('FAQ', sections);

    expect(summary.hiddenCount).toBe(1);
    expect(summary.primaryAction).toEqual({
      kind: 'select-section',
      label: 'Review hidden FAQ',
      sectionId: hiddenFaq.id,
    });
  });

  it('treats complete visible pages as refinement work instead of more sprawl', () => {
    const sections = [
      createDefaultSectionInstance('hero', 'default', 0),
      createDefaultSectionInstance('story', 'default', 1),
      createDefaultSectionInstance('schedule', 'default', 2),
      createDefaultSectionInstance('travel', 'list', 3),
      createDefaultSectionInstance('rsvp', 'default', 4),
      createDefaultSectionInstance('faq', 'default', 5),
    ];

    const summary = getBuilderPageEditingSummary('Home', sections);

    expect(summary.focusTitle).toBe('Home is ready for refinement, not more sprawl');
    expect(summary.primaryAction.kind).toBe('select-section');
    expect(summary.bestNextMove).toContain('Open Hero');
  });
});
