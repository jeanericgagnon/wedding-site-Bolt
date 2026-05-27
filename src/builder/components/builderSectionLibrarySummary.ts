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
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: string;
  nextStep: string;
  thenStep: string;
  primarySuggestedType: BuilderSectionType | null;
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
  const firstMissingEssentialType = ESSENTIAL_SECTION_TYPES.find((type) => !presentTypes.has(type)) ?? null;

  const focusTitle = normalizedSearch.length > 0
    ? 'You are already narrowing the library'
    : missingEssentialLabels.length > 0
      ? 'This page still needs its guest essentials'
      : 'The page is ready for selective expansion';
  const focusDetail = normalizedSearch.length > 0
    ? 'Stay intentional: search should help you land on the right section family fast, not invite random layout shopping.'
    : missingEssentialLabels.length > 0
      ? `Before adding decorative or bonus sections, fill the guest gaps around ${missingEssentialLabels.slice(0, 3).join(', ')}.`
      : 'The structure is already credible, so the next section should solve a specific communication need instead of simply adding more surface area.';
  const bestNextMove = normalizedSearch.length > 0
    ? nextMove
    : missingEssentialLabels.length > 0
      ? `Add ${missingEssentialLabels[0]} first, then reassess whether the page still needs more.`
      : 'Choose the next section only if it improves clarity, emotion, or action for guests.';
  const decisionRule = missingEssentialLabels.length > 0
    ? 'A page missing the basics should earn extras only after the core guest questions are covered.'
    : 'If a new section does not remove a real guest question or strengthen the first read, it can probably wait.';
  const watchout = normalizedSearch.length > 0
    ? 'Search can make it too easy to jump straight into a section that matches a word but not the actual page need.'
    : missingEssentialLabels.length > 0
      ? 'A page with stylish extras but missing essentials still feels unfinished to guests.'
      : 'Once the page already feels complete, new sections can quietly make it longer without making it better.';
  const currentStep = missingEssentialLabels.length > 0
    ? 'Audit the page for the missing essential guests would notice first.'
    : normalizedSearch.length > 0
      ? 'Use the narrowed list to choose the section family with the least rewriting cost.'
      : 'Identify the next guest question or emotional beat the page should carry.';
  const nextStep = missingEssentialLabels.length > 0
    ? `Add ${missingEssentialLabels[0]} and make it earn its place before browsing extras again.`
    : normalizedSearch.length > 0
      ? 'Open the best-fit section family and choose the layout that already wants to say the right thing.'
      : 'Add one section and shape it until the page still feels simple at first glance.';
  const thenStep = missingEssentialLabels.length > 0
    ? 'Once the essentials are in place, return for any extras that genuinely strengthen the story.'
    : 'After the new section is working, stop and review the page as a guest instead of immediately adding another block.';

  return {
    filteredManifests,
    missingEssentialLabels,
    currentPageCount: sections.length,
    filteredCount: filteredManifests.length,
    title,
    detail,
    nextMove,
    focusTitle,
    focusDetail,
    bestNextMove,
    decisionRule,
    watchout,
    currentStep,
    nextStep,
    thenStep,
    primarySuggestedType: firstMissingEssentialType,
  };
}
