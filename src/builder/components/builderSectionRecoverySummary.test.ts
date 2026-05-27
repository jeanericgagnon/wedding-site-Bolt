import { describe, expect, it } from 'vitest';
import {
  getBuilderSectionHealth,
  getBuilderSectionRecoverySummary,
  getBuilderStarterContentPatch,
} from './builderSectionRecoverySummary';

describe('getBuilderSectionHealth', () => {
  it('treats hidden sections as draft state', () => {
    expect(
      getBuilderSectionHealth({
        id: 'venue-1',
        type: 'venue',
        enabled: false,
      })
    ).toBe('draft');
  });

  it('treats sections with no real signals as empty', () => {
    expect(
      getBuilderSectionHealth({
        id: 'hero-1',
        type: 'hero',
        enabled: true,
        settings: { showTitle: true },
        bindings: {},
        styleOverrides: {},
      })
    ).toBe('empty');
  });
});

describe('getBuilderSectionRecoverySummary', () => {
  it('pushes first-section recovery when the page is blank', () => {
    const summary = getBuilderSectionRecoverySummary([]);

    expect(summary.focusTitle).toContain('first real section');
    expect(summary.primaryAction).toEqual({
      kind: 'add-essential',
      label: 'Add Hero',
      sectionType: 'hero',
    });
  });

  it('prioritizes hidden-only recovery before adding more', () => {
    const summary = getBuilderSectionRecoverySummary([
      { id: 'faq-1', type: 'faq', enabled: false },
      { id: 'story-1', type: 'story', enabled: false },
    ]);

    expect(summary.visible).toBe(0);
    expect(summary.focusTitle).toContain('all hidden');
    expect(summary.primaryAction.kind).toBe('review-hidden');
    expect(summary.watchout).toContain('abandoned work');
  });

  it('pushes empty-section recovery before missing-essential expansion', () => {
    const summary = getBuilderSectionRecoverySummary([
      { id: 'hero-1', type: 'hero', enabled: true, settings: { showTitle: true }, bindings: {}, styleOverrides: {} },
      { id: 'story-1', type: 'story', enabled: true, settings: { title: 'Our Story' }, bindings: {}, styleOverrides: {} },
    ]);

    expect(summary.empty).toBe(1);
    expect(summary.focusTitle).toContain('Hero');
    expect(summary.primaryAction.kind).toBe('start-empty');
    expect(summary.secondaryAction.kind).toBe('add-essential');
  });
});

describe('getBuilderStarterContentPatch', () => {
  it('adds starter copy and updates section metadata', () => {
    const patch = getBuilderStarterContentPatch({
      id: 'contact-1',
      type: 'contact',
      variant: 'default',
      enabled: true,
      locked: false,
      orderIndex: 0,
      settings: { showTitle: true },
      bindings: {},
      styleOverrides: {},
      meta: {
        createdAtISO: '2026-05-27T00:00:00.000Z',
        updatedAtISO: '2026-05-27T00:00:00.000Z',
      },
    });

    expect(patch.settings).toMatchObject({
      showTitle: true,
      title: 'Questions?',
    });
    expect(patch.meta?.updatedAtISO).toBeTruthy();
  });
});
