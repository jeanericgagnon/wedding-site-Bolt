type BlockLike = {
  id: string;
  type: string;
};

type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

export type BuilderV2BlockReviewSummary<TBlock extends BlockLike = BlockLike> = {
  visibleBlocks: TBlock[];
  visibleCount: number;
  warningVisibleCount: number;
  hiddenByFilterCount: number;
  headline: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
};

type Params<TBlock extends BlockLike = BlockLike> = {
  blocks: TBlock[];
  query: string;
  statusFilter: 'all' | 'warnings' | 'healthy';
  blockLabels: Record<string, string>;
  getWarning: (block: TBlock) => string;
};

const normalize = (value: string) => value.trim().toLowerCase();

export const filterBuilderV2Blocks = <TBlock extends BlockLike>({
  blocks,
  query,
  statusFilter,
  blockLabels,
  getWarning,
}: Params<TBlock>) => {
  const trimmedQuery = normalize(query);

  return blocks.filter((block) => {
    const warning = getWarning(block);
    if (statusFilter === 'warnings' && !warning) return false;
    if (statusFilter === 'healthy' && warning) return false;
    if (!trimmedQuery) return true;

    const haystack = `${blockLabels[block.type] ?? block.type} ${block.type} ${warning}`.toLowerCase();
    return haystack.includes(trimmedQuery);
  });
};

export const buildBuilderV2BlockReviewSummary = <TBlock extends BlockLike>({
  blocks,
  query,
  statusFilter,
  blockLabels,
  getWarning,
}: Params<TBlock>): BuilderV2BlockReviewSummary<TBlock> => {
  const visibleBlocks = filterBuilderV2Blocks({
    blocks,
    query,
    statusFilter,
    blockLabels,
    getWarning,
  });
  const visibleCount = visibleBlocks.length;
  const warningVisibleCount = visibleBlocks.filter((block) => Boolean(getWarning(block))).length;
  const hiddenByFilterCount = blocks.length - visibleCount;
  const trimmedQuery = normalize(query);

  if (blocks.length === 0) {
    return {
      visibleBlocks,
      visibleCount,
      warningVisibleCount,
      hiddenByFilterCount,
      headline: 'No blocks to review yet',
      detail: 'This section has no editable blocks yet, so there is nothing to triage inside the block list.',
      bestNextMove: 'Add the first structural block before you worry about block review filters.',
      decisionRule: 'Block review matters after the section has at least one meaningful block.',
      watchout: 'Filtering an empty list can make the editor feel broken when the section simply has no internal content yet.',
      steps: [
        { label: 'Current', detail: 'No block rows exist for this section yet.' },
        { label: 'Next', detail: 'Add the first anchor block.' },
        { label: 'Then', detail: 'Come back here when the block list is worth reviewing.' },
      ],
    };
  }

  if (visibleCount === 0) {
    return {
      visibleBlocks,
      visibleCount,
      warningVisibleCount,
      hiddenByFilterCount,
      headline: 'No blocks match the current review filter',
      detail: 'The list is filtered more narrowly than the current section needs.',
      bestNextMove: 'Clear the search or switch the review filter back to all so you can see the full block lane again.',
      decisionRule: 'When review goes empty, widen the filter before assuming the issue is gone.',
      watchout: 'A narrow search can hide the exact warning block you meant to fix.',
      steps: [
        { label: 'Current', detail: 'The block list is filtered down to zero visible rows.' },
        { label: 'Next', detail: 'Broaden the filter or clear the query.' },
        { label: 'Then', detail: 'Resume editing once the key blocks are visible again.' },
      ],
    };
  }

  if (statusFilter === 'warnings' || warningVisibleCount > 0) {
    return {
      visibleBlocks,
      visibleCount,
      warningVisibleCount,
      hiddenByFilterCount,
      headline: 'Warning blocks are surfaced for cleanup',
      detail: `You are looking at ${warningVisibleCount} block${warningVisibleCount === 1 ? '' : 's'} that still need stronger required or recommended content.`,
      bestNextMove: 'Fix the first warning block top-to-bottom before moving on to the next one.',
      decisionRule: 'When warnings are present, clear them in reading order before you edit healthy blocks for polish.',
      watchout: 'Jumping between warning blocks and healthy blocks usually leaves the section half-resolved.',
      steps: [
        { label: 'Current', detail: 'The review lane is focused on incomplete or warning-carrying blocks.' },
        { label: 'Next', detail: 'Resolve the first visible warning block fully.' },
        { label: 'Then', detail: 'Switch back to all blocks only after the warning lane is clean.' },
      ],
    };
  }

  if (trimmedQuery || statusFilter === 'healthy') {
    return {
      visibleBlocks,
      visibleCount,
      warningVisibleCount,
      hiddenByFilterCount,
      headline: 'Refinement filter is active',
      detail: 'The visible list is narrowed to a specific block slice, which is good for polish but not for structural triage.',
      bestNextMove: 'Use this narrowed list to refine one idea at a time, then return to the full lane before you reorder or add more.',
      decisionRule: 'Filter tightly for polish, then zoom back out before making structural decisions.',
      watchout: 'It is easy to lose track of block order and repetition when you stay filtered too long.',
      steps: [
        { label: 'Current', detail: 'The block list is narrowed for focused review.' },
        { label: 'Next', detail: 'Polish the visible slice you actually meant to inspect.' },
        { label: 'Then', detail: 'Return to the full list before changing structure.' },
      ],
    };
  }

  return {
    visibleBlocks,
    visibleCount,
    warningVisibleCount,
    hiddenByFilterCount,
    headline: 'Full block lane is visible',
    detail: 'You are looking at the whole section, which is the right state for ordering, pruning, and overall readability checks.',
    bestNextMove: 'Read the block lane from top to bottom and change one structural thing at a time.',
    decisionRule: 'Use the full list when you are judging order, repetition, and whether the section is carrying too much.',
    watchout: 'Long unfiltered block lists can tempt you into editing everything a little instead of improving one clear problem.',
    steps: [
      { label: 'Current', detail: 'All current blocks are visible for full-lane review.' },
      { label: 'Next', detail: 'Adjust order or content based on how the lane reads top to bottom.' },
      { label: 'Then', detail: 'Filter only if you need a tighter polish pass.' },
    ],
  };
};
