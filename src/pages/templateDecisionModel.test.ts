import { describe, expect, it } from 'vitest';

import type { TemplateCatalogItem } from '../builder/constants/templateCatalog';
import type { TemplateSupportManifest } from '../builder/constants/templateSupportManifest';
import {
  buildTemplateCompareBrief,
  buildTemplateFilterSummary,
  filterAndSortTemplates,
} from './templateDecisionModel';

const templates: TemplateCatalogItem[] = [
  {
    id: 'destination-minimal',
    name: 'Destination Minimal',
    previewImage: '/a.jpg',
    previewFallbackImage: '/a-fallback.jpg',
    styleTags: ['Destination', 'Modern'],
    seasonTags: ['Summer'],
    colorwayId: 'seafoam-sand',
    designFamily: 'destination-minimal',
    description: 'Travel-first weekend flow',
    bestFor: ['Destination weddings'],
    includedModules: ['Travel', 'Schedule', 'Registry'],
    defaultSectionOrder: ['Hero', 'Travel', 'Schedule', 'Registry', 'RSVP'],
  },
  {
    id: 'garden-romance',
    name: 'Garden Romance',
    previewImage: '/b.jpg',
    previewFallbackImage: '/b-fallback.jpg',
    styleTags: ['Floral', 'Romantic'],
    seasonTags: ['Spring'],
    colorwayId: 'blush-sage',
    designFamily: 'garden-romance',
    description: 'Soft floral storytelling',
    bestFor: ['Romantic weddings'],
    includedModules: ['Story', 'Gallery'],
    defaultSectionOrder: ['Hero', 'Story', 'Gallery', 'RSVP'],
  },
];

const manifests: Record<string, TemplateSupportManifest | null> = {
  'destination-minimal': {
    templateId: 'destination-minimal',
    templateName: 'Destination Minimal',
    templateExistsInBuilder: true,
    previewStatus: 'verified',
    previewLabel: 'Preview verified',
    previewDetail: 'Verified',
    sectionsIncluded: 8,
    modulesIncluded: 5,
    highlightedSections: ['Travel', 'Schedule'],
    compatibilityStatus: 'verified',
    compatibilityLabel: 'V2 compatibility verified',
    compatibilityDetail: 'Ready',
    normalizedVariantCount: 0,
    supportNotes: [],
  },
  'garden-romance': {
    templateId: 'garden-romance',
    templateName: 'Garden Romance',
    templateExistsInBuilder: false,
    previewStatus: 'fallback',
    previewLabel: 'Fallback preview',
    previewDetail: 'Fallback',
    sectionsIncluded: 5,
    modulesIncluded: 2,
    highlightedSections: ['Story'],
    compatibilityStatus: 'risk',
    compatibilityLabel: 'V2 compatibility needs review',
    compatibilityDetail: 'Needs review',
    normalizedVariantCount: 0,
    supportNotes: [],
  },
};

describe('templateDecisionModel', () => {
  it('filters and sorts templates using search and recommendation truth', () => {
    const filtered = filterAndSortTemplates({
      templates,
      style: 'all',
      season: 'all',
      colorway: 'all',
      searchQuery: 'travel',
      sortBy: 'recommended',
      recommendedTemplateIds: ['destination-minimal'],
    });

    expect(filtered.map((template) => template.id)).toEqual(['destination-minimal']);
  });

  it('builds a calm filter summary when recommendations stay visible', () => {
    const summary = buildTemplateFilterSummary({
      filtered: templates,
      style: 'all',
      season: 'all',
      colorway: 'all',
      searchQuery: '',
      selectedTemplateId: null,
      recommendedTemplateIds: ['destination-minimal'],
    });

    expect(summary.recommendedVisibleCount).toBe(1);
    expect(summary.headline).toMatch(/strong fit|especially strong/i);
    expect(summary.bestNextMove).toMatch(/compare|strongest fit/i);
  });

  it('builds an empty-state summary that tells the user to widen the search', () => {
    const summary = buildTemplateFilterSummary({
      filtered: [],
      style: 'Destination',
      season: 'Winter',
      colorway: 'seafoam-sand',
      searchQuery: 'alps',
      selectedTemplateId: null,
      recommendedTemplateIds: [],
    });

    expect(summary.empty).toBe(true);
    expect(summary.bestNextMove).toMatch(/clear|widen/i);
    expect(summary.watchout).toMatch(/zero-result/i);
  });

  it('builds a compare brief that favors the steadier template', () => {
    const brief = buildTemplateCompareBrief({
      comparedTemplates: templates,
      manifestsByTemplateId: manifests,
      recommendedTemplateIds: ['destination-minimal'],
      selectedTemplateId: null,
    });

    expect(brief?.recommendedWinnerId).toBe('destination-minimal');
    expect(brief?.title).toMatch(/steadier/i);
    expect(brief?.decisionRule).toMatch(/less cleanup|support truth/i);
  });
});
