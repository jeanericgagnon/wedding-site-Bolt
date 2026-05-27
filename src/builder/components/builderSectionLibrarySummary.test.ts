import { describe, expect, it } from 'vitest';
import { getBuilderSectionLibrarySummary } from './builderSectionLibrarySummary';
import type { BuilderSectionDefinitionWithMeta } from '../registry/sectionManifests';
import type { BuilderSectionInstance } from '../../types/builder/section';

function makeManifest(type: string, label: string): BuilderSectionDefinitionWithMeta {
  return {
    type: type as never,
    label,
    icon: 'Layout',
    defaultVariant: 'default',
    supportedVariants: ['default'],
    variantMeta: [{ id: 'default', label: 'Default', description: `${label} layout` }],
    settingsSchema: { fields: [] },
    bindingsSchema: { slots: [] },
    capabilities: {
      draggable: true,
      duplicable: true,
      deletable: true,
      mediaAware: false,
      hasSettings: true,
      hasBindings: false,
      locked: false,
    },
    previewImagePath: '/preview.jpg',
  };
}

function makeSection(type: string): BuilderSectionInstance {
  return {
    id: `${type}-1`,
    type: type as never,
    variant: 'default',
    enabled: true,
    locked: false,
    orderIndex: 0,
    settings: {},
    bindings: {},
    styleOverrides: {},
    meta: { createdAtISO: '2026-05-27T00:00:00.000Z', updatedAtISO: '2026-05-27T00:00:00.000Z' },
  };
}

describe('getBuilderSectionLibrarySummary', () => {
  const manifests = [
    makeManifest('hero', 'Hero'),
    makeManifest('story', 'Story'),
    makeManifest('schedule', 'Schedule'),
    makeManifest('travel', 'Travel'),
    makeManifest('rsvp', 'RSVP'),
    makeManifest('faq', 'FAQ'),
    makeManifest('gallery', 'Gallery'),
  ];

  it('reports missing essentials before extras', () => {
    const summary = getBuilderSectionLibrarySummary({
      manifests,
      sections: [makeSection('hero'), makeSection('story')],
      searchQuery: '',
    });

    expect(summary.missingEssentialLabels).toEqual(expect.arrayContaining(['Schedule', 'Travel', 'RSVP', 'FAQ']));
    expect(summary.title).toContain('core sections');
  });

  it('filters manifests by search query', () => {
    const summary = getBuilderSectionLibrarySummary({
      manifests,
      sections: [makeSection('hero'), makeSection('story'), makeSection('schedule'), makeSection('travel'), makeSection('rsvp'), makeSection('faq')],
      searchQuery: 'gall',
    });

    expect(summary.filteredManifests.map((manifest) => manifest.type)).toEqual(['gallery']);
    expect(summary.nextMove).toContain('search');
  });
});
