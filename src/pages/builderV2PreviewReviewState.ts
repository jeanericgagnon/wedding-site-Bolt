import type { BuilderV2ReviewPageSnapshot } from './builderV2DocumentReviewState';
import type { BuilderV2LaunchGatePreviewCoverage } from './builderV2LaunchGate';

type Device = 'desktop' | 'mobile';

export type BuilderV2PreviewReviewedPages = Record<Device, Record<string, string>>;

const getVisiblePages = (pages: BuilderV2ReviewPageSnapshot[]) => (
  pages.filter((page) => !page.hidden && page.sections.some((section) => section.enabled))
);

export const buildBuilderV2PreviewReviewKey = (page: BuilderV2ReviewPageSnapshot): string => JSON.stringify({
  id: page.id,
  title: page.title,
  slug: page.slug,
  hidden: page.hidden,
  isHome: page.isHome,
  sections: page.sections.map((section) => ({
    id: section.id,
    title: section.title,
    type: section.type,
    enabled: section.enabled,
    blockCount: section.blockCount,
    warningCount: section.warningCount,
    reviewSignature: section.reviewSignature ?? JSON.stringify({
      title: section.title,
      type: section.type,
      enabled: section.enabled,
      blockCount: section.blockCount,
      warningCount: section.warningCount,
    }),
  })),
});

export const buildBuilderV2PreviewCoverage = ({
  pages,
  reviewedPages,
  activePageId,
}: {
  pages: BuilderV2ReviewPageSnapshot[];
  reviewedPages: Record<string, string>;
  activePageId: string;
}): BuilderV2LaunchGatePreviewCoverage => {
  const visiblePages = getVisiblePages(pages);
  const reviewedPageIds = visiblePages
    .filter((page) => reviewedPages[page.id] === buildBuilderV2PreviewReviewKey(page))
    .map((page) => page.id);
  const reviewedPageIdSet = new Set(reviewedPageIds);
  const nextPage = visiblePages.find((page) => !reviewedPageIdSet.has(page.id)) ?? null;

  return {
    reviewedPageCount: reviewedPageIds.length,
    totalPageCount: visiblePages.length,
    currentPageReviewed: reviewedPageIdSet.has(activePageId),
    nextPageId: nextPage?.id ?? null,
    nextPageTitle: nextPage?.title ?? null,
  };
};
