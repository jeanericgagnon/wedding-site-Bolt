import { BuilderSectionDefinitionWithMeta } from '../registry/sectionManifests';
import { BuilderSectionInstance, BuilderSectionType } from '../../types/builder/section';

const ESSENTIAL_SECTION_TYPES: BuilderSectionType[] = ['hero', 'story', 'schedule', 'travel', 'rsvp', 'faq'];

export interface BuilderSectionLibrarySummaryInput {
  manifests: BuilderSectionDefinitionWithMeta[];
  sections: BuilderSectionInstance[];
  searchQuery: string;
}

export interface BuilderSectionLibrarySummary {
  filteredManifests: BuilderSectionDefinitionWithMeta[];
  missingEssentialLabels: string[];
  currentPageCount: number;
  filteredCount: number;
  title: string;
  detail: string;
  nextMove: string;
}

export function getBuilderSectionLibrarySummary({
  manifests,
  sections,
  searchQuery,
}: BuilderSectionLibrarySummaryInput): BuilderSectionLibrarySummary {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredManifests = normalizedSearch.length === 0
    ? manifests
    : manifests.filter((manifest) => {
        const haystack = [
          manifest.label,
          manifest.type,
          manifest.defaultVariant,
          manifest.variantMeta.map((variant) => `${variant.label} ${variant.description}`).join(' '),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });

  const presentTypes = new Set(sections.map((section) => section.type));
  const missingEssentialLabels = ESSENTIAL_SECTION_TYPES
    .filter((type) => !presentTypes.has(type))
    .map((type) => manifests.find((manifest) => manifest.type === type)?.label ?? type);

  const title = missingEssentialLabels.length === 0
    ? 'This page has the core wedding sections in place'
    : `${missingEssentialLabels.length} core sections are still missing`;
  const detail = missingEssentialLabels.length === 0
    ? 'Add only the sections that sharpen guest understanding or elevate the story from here.'
    : `Most wedding pages still need ${missingEssentialLabels.slice(0, 3).join(', ')} before extras start paying off.`;
  const nextMove = normalizedSearch.length > 0
    ? 'Use search to jump straight to the section family you want, then choose the layout that needs the least rewriting.'
    : missingEssentialLabels.length > 0
      ? 'Fill the missing essentials first, then add extras once the guest path feels complete.'
      : 'Choose the next section based on what guests still need to understand, not on what looks fun to add.';

  return {
    filteredManifests,
    missingEssentialLabels,
    currentPageCount: sections.length,
    filteredCount: filteredManifests.length,
    title,
    detail,
    nextMove,
  };
}
