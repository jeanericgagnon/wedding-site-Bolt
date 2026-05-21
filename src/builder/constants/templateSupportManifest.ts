import { type TemplatePageBlueprint, templateCatalog } from './templateCatalog';
import { BUILDER_TEMPLATE_PACKS } from './builderTemplatePacks';

export interface TemplateSupportManifest {
  templateId: string;
  templateName: string;
  templateExistsInBuilder: boolean;
  previewStatus: 'verified' | 'fallback';
  previewLabel: string;
  previewDetail: string;
  sectionsIncluded: number;
  modulesIncluded: number;
  pageCount: number;
  pageFlowLabel: string;
  guestRoutes: string[];
  pageBlueprints: TemplatePageBlueprint[];
  readinessScore: number;
  readinessLabel: string;
  readinessGaps: string[];
  highlightedSections: string[];
  supportNotes: string[];
}

export function getTemplateSupportManifest(templateId: string): TemplateSupportManifest | null {
  const template = templateCatalog.find((entry) => entry.id === templateId);
  if (!template) return null;

  const pack = BUILDER_TEMPLATE_PACKS[templateId];
  const highlightedSections = (pack?.sectionComposition ?? [])
    .filter((section) => section.enabled)
    .slice(0, 5)
    .map((section) => section.type);

  const previewStatus = pack?.previewThumbnailPath ? 'verified' : 'fallback';

  const supportNotes = [
    'A filled-in preview is available before you choose it.',
    'You can switch designs later without losing core wedding details.',
    template.pageCount > 1
      ? `${template.pageCount} guest-facing pages are created by default: ${template.guestRoutes.join(', ')}.`
      : 'This design starts as one page with section links.',
    template.readinessGaps.length === 0
      ? 'Guest-critical content is covered by the starter structure.'
      : `Still worth reviewing: ${template.readinessGaps.join(', ')}.`,
    pack
      ? `${pack.sectionComposition.filter((section) => section.enabled).length} starter sections are preloaded in the first draft.`
      : 'This design starts with the standard wedding details.',
  ];

  return {
    templateId,
    templateName: template.name,
    templateExistsInBuilder: Boolean(pack),
    previewStatus,
    previewLabel: previewStatus === 'verified' ? 'Preview ready' : 'Sample preview',
    previewDetail: previewStatus === 'verified'
      ? 'This design has a preview image matched to its starter layout.'
      : 'This design uses a sample image, so treat the screenshot as a starting point.',
    sectionsIncluded: pack?.sectionComposition.filter((section) => section.enabled).length ?? template.defaultSectionOrder.length,
    modulesIncluded: template.includedModules.length,
    pageCount: template.pageCount,
    pageFlowLabel: template.pageCount > 1 ? `${template.pageCount} dedicated pages` : 'One page',
    guestRoutes: template.guestRoutes,
    pageBlueprints: template.pageBlueprints,
    readinessScore: template.readinessScore,
    readinessLabel: template.readinessLabel,
    readinessGaps: template.readinessGaps,
    highlightedSections,
    supportNotes,
  };
}
