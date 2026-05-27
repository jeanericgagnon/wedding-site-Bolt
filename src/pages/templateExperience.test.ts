import { describe, expect, it } from 'vitest';
import { buildTemplateExperienceBrief } from './templateExperience';

describe('buildTemplateExperienceBrief', () => {
  it('adds a concrete next step for recommended templates', () => {
    const brief = buildTemplateExperienceBrief({
      name: 'Destination Minimal',
      recommended: true,
      selected: false,
      supportManifest: {
        templateId: 'destination-minimal',
        templateExistsInBuilder: true,
        previewStatus: 'verified',
        previewLabel: 'Verified preview',
        previewDetail: 'Verified',
        sectionsIncluded: 8,
        modulesIncluded: 5,
        highlightedSections: ['Travel', 'Schedule'],
      },
      compareCount: 0,
    });

    expect(brief.confidenceLabel).toBe('High confidence');
    expect(brief.bestNextStep).toMatch(/starting point|content clarity|design churn/i);
    expect(brief.launchUse).toMatch(/lowest-friction|starting point|guest-ready/i);
    expect(brief.watchouts).toEqual([]);
    expect(brief.launchSequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(brief.launchSequence[0]?.title).toMatch(/strongest fit|start/i);
  });

  it('flags unmapped builder support as a watchout', () => {
    const brief = buildTemplateExperienceBrief({
      name: 'Modern Keepsake',
      recommended: false,
      selected: false,
      supportManifest: {
        templateId: 'modern-keepsake',
        templateExistsInBuilder: false,
        previewStatus: 'planned',
        previewLabel: 'Planned preview',
        previewDetail: 'Planned',
        sectionsIncluded: 5,
        modulesIncluded: 2,
        highlightedSections: [],
      },
      compareCount: 1,
    });

    expect(brief.watchouts[0]).toMatch(/builder/i);
    expect(brief.launchUse).toMatch(/visual directions|cleanup later|committing/i);
    expect(brief.launchSequence[1]?.detail).toMatch(/page order|guests|event/i);
  });
});
