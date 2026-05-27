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

export interface SkeletonPickerSummary {
  filtered: CustomSectionSkeleton[];
  totalCount: number;
  filteredCount: number;
  selectedCategoryLabel: string;
  selectedSkeleton: CustomSectionSkeleton;
  detailTitle: string;
  detailText: string;
  actionText: string;
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

  return {
    filtered,
    totalCount: CUSTOM_SKELETONS.length,
    filteredCount: filtered.length,
    selectedCategoryLabel,
    selectedSkeleton,
    detailTitle: `${selectedSkeleton.label} keeps momentum high`,
    detailText: `${selectedSkeleton.description}. You can rewrite every block, so optimize for structure and pacing first.`,
    actionText: selectedSkeleton.category === 'blank'
      ? 'Use Blank only when you already know the section shape you want and do not need layout help.'
      : `Start with ${selectedSkeleton.label} if you want a ${selectedCategoryLabel.toLowerCase()} section without building the rhythm from scratch.`,
  };
}
