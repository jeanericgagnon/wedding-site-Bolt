import { CUSTOM_SKELETONS, CustomSectionSkeleton } from '../../sections/variants/custom/skeletons';

export const CATEGORY_LABELS: Record<string, string> = {
  blank: 'Blank',
  announcement: 'Announcements',
  content: 'Content',
  cta: 'Call to Action',
  details: 'Details',
  stats: 'Stats',
  numbers: 'Numbers',
};

interface GuidanceStep {
  title: string;
  detail: string;
}

export interface SkeletonPickerSummary {
  filtered: CustomSectionSkeleton[];
  totalCount: number;
  filteredCount: number;
  selectedCategoryLabel: string;
  selectedSkeleton: CustomSectionSkeleton;
  focusTitle: string;
  focusDetail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  currentStep: GuidanceStep;
  nextStep: GuidanceStep;
  thenStep: GuidanceStep;
}

export function getSkeletonPickerSummary({
  activeCategory,
  search,
  selectedId,
}: {
  activeCategory: string;
  search: string;
  selectedId: string;
}): SkeletonPickerSummary {
  const normalizedSearch = search.trim().toLowerCase();
  const categoryFiltered = activeCategory === 'all'
    ? CUSTOM_SKELETONS
    : CUSTOM_SKELETONS.filter((skeleton) => skeleton.category === activeCategory);
  const filtered = normalizedSearch.length === 0
    ? categoryFiltered
    : categoryFiltered.filter((skeleton) => {
        const haystack = [
          skeleton.label,
          skeleton.description,
          skeleton.category,
          ...skeleton.blocks.flatMap((block) => [
            block.content ?? '',
            block.buttonLabel ?? '',
            block.variant ?? '',
          ]),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  const selectedSkeleton = CUSTOM_SKELETONS.find((skeleton) => skeleton.id === selectedId) ?? filtered[0] ?? CUSTOM_SKELETONS[0];
  const selectedCategoryLabel = activeCategory === 'all' ? 'All layouts' : CATEGORY_LABELS[activeCategory] ?? 'Layouts';
  const searchActive = normalizedSearch.length > 0;
  const selectionLabel = searchActive
    ? `Search results for “${search.trim()}”`
    : selectedCategoryLabel;
  const isBlank = selectedSkeleton.category === 'blank';
  const filteredEmpty = filtered.length === 0;

  return {
    filtered,
    totalCount: CUSTOM_SKELETONS.length,
    filteredCount: filtered.length,
    selectedCategoryLabel,
    selectedSkeleton,
    focusTitle: filteredEmpty
      ? `No ${selectionLabel.toLowerCase()} matched yet`
      : `${selectedSkeleton.label} keeps momentum high`,
    focusDetail: filteredEmpty
      ? 'The current category or search is too narrow, so the picker is no longer helping you choose structure with confidence.'
      : `${selectedSkeleton.description}. You can rewrite every block, so optimize for structure and pacing first.`,
    bestNextMove: filteredEmpty
      ? 'Loosen the search or step back to a broader category before choosing a layout.'
      : isBlank
        ? 'Use Blank only when you already know the section shape you want and do not need layout help.'
        : `Start with ${selectedSkeleton.label} if you want a ${selectionLabel.toLowerCase()} section without building the rhythm from scratch.`,
    decisionRule: filteredEmpty
      ? 'If the picker stops showing viable options, widen the structural search instead of forcing a weak match.'
      : isBlank
        ? 'Choose Blank only when your content structure is already clear enough that preset rhythm would slow you down.'
        : 'Choose the layout that already has the right pacing and block hierarchy, even if the copy is only directionally close.',
    watchout: filteredEmpty
      ? 'Over-filtering makes it easy to miss stronger layouts that are structurally right but described with different words.'
      : isBlank
        ? 'Blank sections create the most freedom, but they also create the most avoidable editorial work if the structure is not already settled.'
        : 'Do not pick the prettiest thumbnail if the block rhythm is wrong for the story you are trying to tell.',
    currentStep: filteredEmpty
      ? {
          title: 'Broaden the option set',
          detail: 'Reset the category or search so the picker can show real structural candidates again.',
        }
      : {
          title: 'Choose the structural fit',
          detail: isBlank
            ? 'Confirm you truly want to build the section rhythm from scratch.'
            : `Use ${selectedSkeleton.label} as the starting structure if the pacing already feels close.`,
        },
    nextStep: filteredEmpty
      ? {
          title: 'Pick the strongest candidate',
          detail: 'Once the option set is healthy again, choose the layout with the clearest pacing match.',
        }
      : {
          title: 'Rewrite the blocks',
          detail: 'Treat the skeleton copy as scaffolding and reshape the section content around your real story.',
        },
    thenStep: {
      title: 'Polish only after structure works',
      detail: 'Once the section rhythm feels right, move into visual tuning or copy detail instead of swapping layouts again.',
    },
  };
}
