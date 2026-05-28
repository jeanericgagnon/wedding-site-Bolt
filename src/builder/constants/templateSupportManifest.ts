import { templateCatalog } from './templateCatalog';
import { BUILDER_TEMPLATE_PACKS } from './builderTemplatePacks';
import { getTemplateCompatibilityReport } from './templateCompatibilityMatrix';

export interface TemplateSupportManifest {
  templateId: string;
  templateName: string;
  templateExistsInBuilder: boolean;
  previewStatus: 'verified' | 'fallback';
  previewLabel: string;
  previewDetail: string;
  sectionsIncluded: number;
  modulesIncluded: number;
  highlightedSections: string[];
  compatibilityStatus: 'verified' | 'normalized' | 'risk';
  compatibilityLabel: string;
  compatibilityDetail: string;
  normalizedVariantCount: number;
  supportNotes: string[];
}

export function getTemplateSupportManifest(templateId: string): TemplateSupportManifest | null {
  const template = templateCatalog.find((entry) => entry.id === templateId);
  if (!template) return null;

  const pack = BUILDER_TEMPLATE_PACKS[templateId];
  const compatibility = getTemplateCompatibilityReport(templateId);
  const highlightedSections = (pack?.sectionComposition ?? [])
    .filter((section) => section.enabled)
    .slice(0, 5)
    .map((section) => section.type);

  const previewStatus = pack?.previewThumbnailPath ? 'verified' : 'fallback';
  const compatibilityLabel = compatibility.overallStatus === 'verified'
    ? 'V2 compatibility verified'
    : compatibility.overallStatus === 'normalized'
      ? 'V2 compatibility normalized'
      : 'V2 compatibility needs review';
  const compatibilityDetail = compatibility.overallStatus === 'verified'
    ? 'This template already lands on builder-native variants and stays aligned across V2 seed, runtime, and public rendering.'
    : compatibility.overallStatus === 'normalized'
      ? `This template is launch-safe, but ${compatibility.normalizedVariantCount} section ${compatibility.normalizedVariantCount === 1 ? 'variant is' : 'variants are'} normalized onto builder-native V2 options during seed.`
      : 'One or more sections still need a closer compatibility pass before this template should be treated as fully V2-safe.';

  const supportNotes = [
    'Populated preview is available before you choose it.',
    'You can switch templates later without losing core wedding details.',
    pack
      ? `${pack.sectionComposition.filter((section) => section.enabled).length} starter sections are preloaded in the first draft.`
      : 'This template currently relies on catalog metadata only.',
    compatibility.overallStatus === 'risk'
      ? 'Compatibility still needs a manual follow-up before this should be treated as the calmest V2 launch path.'
      : compatibility.normalizedVariantCount > 0
        ? `${compatibility.normalizedVariantCount} template variant ${compatibility.normalizedVariantCount === 1 ? 'maps' : 'map'} onto builder-native V2 behavior automatically.`
        : 'No template-era variant normalization is currently needed for this design.',
  ];

  return {
    templateId,
    templateName: template.name,
    templateExistsInBuilder: Boolean(pack),
    previewStatus,
    previewLabel: previewStatus === 'verified' ? 'Preview verified' : 'Fallback preview',
    previewDetail: previewStatus === 'verified'
      ? 'This template has a mapped preview asset tied to the builder pack.'
      : 'This template is currently falling back to generic preview coverage, so treat the screenshot as directional.',
    sectionsIncluded: pack?.sectionComposition.filter((section) => section.enabled).length ?? template.defaultSectionOrder.length,
    modulesIncluded: template.includedModules.length,
    highlightedSections,
    compatibilityStatus: compatibility.overallStatus,
    compatibilityLabel,
    compatibilityDetail,
    normalizedVariantCount: compatibility.normalizedVariantCount,
    supportNotes,
  };
}
