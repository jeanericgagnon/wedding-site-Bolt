import {
  getBuilderV2HiddenSectionTitles,
  getBuilderV2VisibleSectionTitles,
  type BuilderV2ReviewPageSnapshot,
  type BuilderV2ReviewSectionSnapshot,
} from './builderV2DocumentReviewState';

export type BuilderV2ImportComparisonEntry = {
  pageTitle: string;
  sectionTitle: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged';
  detail: string;
};

export type BuilderV2ImportComparison = {
  headline: string;
  detail: string;
  keyStats: string[];
  entries: BuilderV2ImportComparisonEntry[];
  incomingVisibleOrder: string[];
  incomingHiddenTitles: string[];
  incomingPageSummaries: string[];
};

type Params = {
  currentPages: BuilderV2ReviewPageSnapshot[];
  incomingPages: BuilderV2ReviewPageSnapshot[];
};

const flattenPages = (pages: BuilderV2ReviewPageSnapshot[]) => (
  pages.flatMap((page) => page.sections.map((section) => ({
    pageId: page.id,
    pageTitle: page.title,
    pageHidden: page.hidden,
    section,
  })))
);

const describeChange = (
  current: BuilderV2ReviewSectionSnapshot,
  incoming: BuilderV2ReviewSectionSnapshot,
  currentPageTitle: string,
  incomingPageTitle: string,
) => {
  const changes: string[] = [];
  if (current.blockCount !== incoming.blockCount) {
    changes.push(`${current.blockCount} -> ${incoming.blockCount} block${incoming.blockCount === 1 ? '' : 's'}`);
  }
  if (current.enabled !== incoming.enabled) {
    changes.push(incoming.enabled ? 'becomes visible' : 'moves hidden');
  }
  if (currentPageTitle !== incomingPageTitle) {
    changes.push(`moves from ${currentPageTitle} to ${incomingPageTitle}`);
  }
  if (current.type !== incoming.type) {
    changes.push(`${current.type} -> ${incoming.type}`);
  }
  return changes.join(' · ') || `${incoming.blockCount} block${incoming.blockCount === 1 ? '' : 's'} stays steady.`;
};

export const buildBuilderV2ImportComparison = ({
  currentPages,
  incomingPages,
}: Params): BuilderV2ImportComparison => {
  const currentSections = flattenPages(currentPages);
  const incomingSections = flattenPages(incomingPages);
  const currentById = new Map(currentSections.map((entry) => [entry.section.id, entry]));
  const incomingById = new Map(incomingSections.map((entry) => [entry.section.id, entry]));

  const entries: BuilderV2ImportComparisonEntry[] = [];

  for (const incoming of incomingSections) {
    const current = currentById.get(incoming.section.id);
    if (!current) {
      entries.push({
        pageTitle: incoming.pageTitle,
        sectionTitle: incoming.section.title,
        status: 'added',
        detail: `${incoming.section.enabled && !incoming.pageHidden ? 'Visible' : 'Hidden'} incoming lane with ${incoming.section.blockCount} block${incoming.section.blockCount === 1 ? '' : 's'} on ${incoming.pageTitle}.`,
      });
      continue;
    }

    const changed =
      current.section.title !== incoming.section.title
      || current.section.type !== incoming.section.type
      || current.section.enabled !== incoming.section.enabled
      || current.section.blockCount !== incoming.section.blockCount
      || current.pageTitle !== incoming.pageTitle
      || current.pageHidden !== incoming.pageHidden;

    entries.push({
      pageTitle: incoming.pageTitle,
      sectionTitle: incoming.section.title,
      status: changed ? 'changed' : 'unchanged',
      detail: changed
        ? describeChange(current.section, incoming.section, current.pageTitle, incoming.pageTitle)
        : `${incoming.section.blockCount} block${incoming.section.blockCount === 1 ? '' : 's'} stays steady on ${incoming.pageTitle}.`,
    });
  }

  for (const current of currentSections) {
    if (incomingById.has(current.section.id)) continue;
    entries.push({
      pageTitle: current.pageTitle,
      sectionTitle: current.section.title,
      status: 'removed',
      detail: `Current lane with ${current.section.blockCount} block${current.section.blockCount === 1 ? '' : 's'} on ${current.pageTitle} would be replaced out of the draft.`,
    });
  }

  const addedCount = entries.filter((entry) => entry.status === 'added').length;
  const removedCount = entries.filter((entry) => entry.status === 'removed').length;
  const changedCount = entries.filter((entry) => entry.status === 'changed').length;
  const unchangedCount = entries.filter((entry) => entry.status === 'unchanged').length;

  let headline = 'Incoming layout is close to the current draft';
  let detail = 'Review the replacement impact, then import if the incoming structure is the truer version of the document.';

  if (removedCount > 0) {
    headline = `${removedCount} current lane${removedCount === 1 ? '' : 's'} would be replaced`;
    detail = 'Make sure those removed lanes are intentionally being retired before you overwrite the current draft.';
  } else if (addedCount > 0 || changedCount > 0) {
    headline = `${addedCount + changedCount} incoming lane${addedCount + changedCount === 1 ? '' : 's'} would materially change the draft`;
    detail = 'This import is adding or reshaping meaningful structure, so compare it against the current pages before you replace anything.';
  } else if (unchangedCount === incomingSections.length && incomingSections.length > 0) {
    headline = 'Incoming layout largely matches the current draft';
    detail = 'This looks like a low-risk refresh, so the import is mostly about replacing the underlying document snapshot cleanly.';
  }

  const incomingPageSummaries = incomingPages.map((page) => {
    const visibleCount = page.hidden ? 0 : page.sections.filter((section) => section.enabled).length;
    const hiddenCount = page.hidden ? page.sections.length : page.sections.filter((section) => !section.enabled).length;
    return `${page.title} (${page.hidden ? 'hidden page' : `${visibleCount} visible · ${hiddenCount} hidden`})`;
  });

  return {
    headline,
    detail,
    keyStats: [
      `${currentPages.length} current pages`,
      `${incomingPages.length} incoming pages`,
      `${addedCount} added`,
      `${removedCount} removed`,
      `${changedCount} changed`,
    ],
    entries,
    incomingVisibleOrder: getBuilderV2VisibleSectionTitles(incomingPages),
    incomingHiddenTitles: getBuilderV2HiddenSectionTitles(incomingPages),
    incomingPageSummaries,
  };
};
