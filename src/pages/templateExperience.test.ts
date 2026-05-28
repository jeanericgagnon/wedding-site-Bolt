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
        templateName: 'Destination Minimal',
        templateExistsInBuilder: true,
        previewStatus: 'verified',
        previewLabel: 'Verified preview',
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
      compareCount: 0,
    });

    expect(brief.confidenceLabel).toBe('High confidence');
    expect(brief.confidenceDetail).toMatch(/structure|builder behavior|trust/i);
    expect(brief.focusTitle).toMatch(/strongest fit|reduce cleanup/i);
    expect(brief.focusDetail).toMatch(/setup momentum|content clarity/i);
    expect(brief.bestNextStep).toMatch(/starting point|content clarity|design churn/i);
    expect(brief.launchUse).toMatch(/lowest-friction|starting point|guest-ready/i);
    expect(brief.bestFor).toMatch(/easiest path|first publish|guest-ready/i);
    expect(brief.decisionRule).toMatch(/minimizes structural cleanup|trust|tone|guest clarity/i);
    expect(brief.watchouts[0]).toMatch(/extra browsing|guest clarity|stop browsing/i);
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
        templateName: 'Modern Keepsake',
        templateExistsInBuilder: false,
        previewStatus: 'fallback',
        previewLabel: 'Fallback preview',
        previewDetail: 'Fallback',
        sectionsIncluded: 5,
        modulesIncluded: 2,
        highlightedSections: [],
        compatibilityStatus: 'risk',
        compatibilityLabel: 'V2 compatibility needs review',
        compatibilityDetail: 'Needs review',
        normalizedVariantCount: 0,
        supportNotes: [],
      },
      compareCount: 1,
    });

    expect(brief.watchouts[0]).toMatch(/builder/i);
    expect(brief.watchouts[1]).toMatch(/first-impression style|structural cleanup/i);
    expect(brief.confidenceDetail).toMatch(/promising|proven|cleanup/i);
    expect(brief.focusTitle).toMatch(/Compare the structure|promising until the structure proves itself/i);
    expect(brief.focusDetail).toMatch(/less section cleanup|guest story/i);
    expect(brief.launchUse).toMatch(/visual directions|cleanup later|committing/i);
    expect(brief.bestFor).toMatch(/strong moods|operational path|prettier card/i);
    expect(brief.decisionRule).toMatch(/less structural repair|aesthetics alone/i);
    expect(brief.launchSequence[1]?.detail).toMatch(/page order|guests|event/i);
  });

  it('keeps selected templates honest about restart churn', () => {
    const brief = buildTemplateExperienceBrief({
      name: 'Modern Keepsake',
      recommended: false,
      selected: true,
      supportManifest: {
        templateId: 'modern-keepsake',
        templateName: 'Modern Keepsake',
        templateExistsInBuilder: true,
        previewStatus: 'verified',
        previewLabel: 'Verified preview',
        previewDetail: 'Verified',
        sectionsIncluded: 6,
        modulesIncluded: 4,
        highlightedSections: [],
        compatibilityStatus: 'normalized',
        compatibilityLabel: 'V2 compatibility normalized',
        compatibilityDetail: 'Normalized',
        normalizedVariantCount: 2,
        supportNotes: [],
      },
      compareCount: 0,
    });

    expect(brief.watchouts[0]).toMatch(/restless browsing|momentum/i);
    expect(brief.decisionRule).toMatch(/fundamentally wrong|keep the momentum/i);
  });
});
