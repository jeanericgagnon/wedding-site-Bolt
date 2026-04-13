import { templateCatalog } from './templateCatalog';
import { BUILDER_TEMPLATE_PACKS } from './builderTemplatePacks';

export interface TemplateSupportManifest {
  templateId: string;
  templateName: string;
  templateExistsInBuilder: boolean;
  previewStatus: 'verified' | 'fallback';
  sectionsIncluded: number;
  modulesIncluded: number;
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

  const supportNotes = [
    'Populated preview is available before you choose it.',
    'You can switch templates later without losing core wedding details.',
    pack
      ? `${pack.sectionComposition.filter((section) => section.enabled).length} starter sections are preloaded in the first draft.`
      : 'This template currently relies on catalog metadata only.',
  ];

  return {
    templateId,
    templateName: template.name,
    templateExistsInBuilder: Boolean(pack),
    previewStatus: pack?.previewThumbnailPath ? 'verified' : 'fallback',
    sectionsIncluded: pack?.sectionComposition.filter((section) => section.enabled).length ?? template.defaultSectionOrder.length,
    modulesIncluded: template.includedModules.length,
    highlightedSections,
    supportNotes,
  };
}
