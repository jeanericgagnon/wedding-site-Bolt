type SectionSnapshot = {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
  blockCount: number;
};

export type BuilderV2ImportComparisonEntry = {
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
};

type Params = {
  currentSections: SectionSnapshot[];
  incomingSections: SectionSnapshot[];
};

export const buildBuilderV2ImportComparison = ({
  currentSections,
  incomingSections,
}: Params): BuilderV2ImportComparison => {
  const currentById = new Map(currentSections.map((section) => [section.id, section]));
  const incomingById = new Map(incomingSections.map((section) => [section.id, section]));

  const entries: BuilderV2ImportComparisonEntry[] = [];

  for (const incoming of incomingSections) {
    const current = currentById.get(incoming.id);
    if (!current) {
      entries.push({
        sectionTitle: incoming.title,
        status: 'added',
        detail: `${incoming.enabled ? 'Visible' : 'Hidden'} incoming lane with ${incoming.blockCount} block${incoming.blockCount === 1 ? '' : 's'}.`,
      });
      continue;
    }

    const changed =
      current.title !== incoming.title
      || current.type !== incoming.type
      || current.enabled !== incoming.enabled
      || current.blockCount !== incoming.blockCount;

    entries.push({
      sectionTitle: incoming.title,
      status: changed ? 'changed' : 'unchanged',
      detail: changed
        ? `${current.blockCount} -> ${incoming.blockCount} block${incoming.blockCount === 1 ? '' : 's'}${current.enabled !== incoming.enabled ? ` · ${incoming.enabled ? 'becomes visible' : 'moves hidden'}` : ''}`
        : `${incoming.blockCount} block${incoming.blockCount === 1 ? '' : 's'} stays steady.`,
    });
  }

  for (const current of currentSections) {
    if (incomingById.has(current.id)) continue;
    entries.push({
      sectionTitle: current.title,
      status: 'removed',
      detail: `Current lane with ${current.blockCount} block${current.blockCount === 1 ? '' : 's'} would be replaced out of the draft.`,
    });
  }

  const addedCount = entries.filter((entry) => entry.status === 'added').length;
  const removedCount = entries.filter((entry) => entry.status === 'removed').length;
  const changedCount = entries.filter((entry) => entry.status === 'changed').length;
  const unchangedCount = entries.filter((entry) => entry.status === 'unchanged').length;

  let headline = 'Incoming layout is close to the current draft';
  let detail = 'Review the replacement impact, then import if the incoming structure is the truer version of the page.';

  if (removedCount > 0) {
    headline = `${removedCount} current lane${removedCount === 1 ? '' : 's'} would be replaced`;
    detail = 'Make sure those removed lanes are intentionally being retired before you overwrite the current draft.';
  } else if (addedCount > 0 || changedCount > 0) {
    headline = `${addedCount + changedCount} incoming lane${addedCount + changedCount === 1 ? '' : 's'} would materially change the draft`;
    detail = 'This import is adding or reshaping meaningful structure, so compare it against the current page before you replace anything.';
  } else if (unchangedCount === incomingSections.length && incomingSections.length > 0) {
    headline = 'Incoming layout largely matches the current draft';
    detail = 'This looks like a low-risk refresh, so the import is mostly about replacing the underlying document snapshot cleanly.';
  }

  return {
    headline,
    detail,
    keyStats: [
      `${currentSections.length} current`,
      `${incomingSections.length} incoming`,
      `${addedCount} added`,
      `${removedCount} removed`,
      `${changedCount} changed`,
    ],
    entries,
    incomingVisibleOrder: incomingSections.filter((section) => section.enabled).map((section) => section.title),
    incomingHiddenTitles: incomingSections.filter((section) => !section.enabled).map((section) => section.title),
  };
};
