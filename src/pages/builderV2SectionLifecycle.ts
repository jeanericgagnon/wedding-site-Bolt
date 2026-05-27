type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

type SectionLike = {
  id: string;
  title: string;
  enabled: boolean;
};

type RemovalResult<TSection extends SectionLike, TBlock> = {
  sections: TSection[];
  sectionBlocks: Record<string, TBlock[]>;
  removedIds: string[];
  nextSelectedId: string | null;
};

export type BuilderV2SectionLifecycleSummary = {
  title: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
  keyStats: string[];
  allowRemoval: boolean;
  allowArchive: boolean;
};

type SummaryParams = {
  sections: SectionLike[];
  selectedSections: SectionLike[];
};

type RemoveParams<TSection extends SectionLike, TBlock> = {
  sections: TSection[];
  sectionBlocks: Record<string, TBlock[]>;
  selectedIds: string[];
  selectedId: string | null;
};

export const buildBuilderV2SectionLifecycleSummary = ({
  sections,
  selectedSections,
}: SummaryParams): BuilderV2SectionLifecycleSummary => {
  const totalCount = sections.length;
  const selectedCount = selectedSections.length;
  const visibleSelectedCount = selectedSections.filter((section) => section.enabled).length;
  const hiddenSelectedCount = selectedCount - visibleSelectedCount;
  const visibleTotalCount = sections.filter((section) => section.enabled).length;
  const keyStats = [
    `${selectedCount} selected`,
    `${visibleSelectedCount} visible`,
    `${hiddenSelectedCount} hidden`,
  ];

  if (!selectedCount) {
    return {
      title: 'No section retirement set is active',
      detail: 'Select one or more lanes before you archive or remove them.',
      bestNextMove: 'Pick the lanes that no longer help the page, then decide whether they should be parked or removed.',
      decisionRule: 'Archive when you might want the lane back later. Remove only when the structure is genuinely done.',
      watchout: 'Retiring the wrong lane is usually a grouping mistake, not a button mistake.',
      steps: [
        { label: 'Current', detail: 'No batch is selected for retirement.' },
        { label: 'Next', detail: 'Select the lane or batch you want to review.' },
        { label: 'Then', detail: 'Choose archive first unless you are sure the structure is finished.' },
      ],
      keyStats: ['0 selected'],
      allowRemoval: false,
      allowArchive: false,
    };
  }

  if (selectedCount === totalCount) {
    return {
      title: 'This selection is the whole page structure',
      detail: 'Removing every section would leave the page empty, so this batch needs a gentler cleanup move.',
      bestNextMove: 'Archive the lanes you want to park first, then rebuild or remove sections one pass at a time.',
      decisionRule: 'Do not remove the entire page structure in one action. Keep at least one live lane or add a replacement first.',
      watchout: 'A full-page delete is fast, but it turns recovery into reconstruction.',
      steps: [
        { label: 'Current', detail: 'Every page lane is in the retirement set.' },
        { label: 'Next', detail: 'Hide the lanes that should leave the guest flow first.' },
        { label: 'Then', detail: 'Remove only the sections that still feel clearly unnecessary afterward.' },
      ],
      keyStats: [...keyStats, `${visibleTotalCount} live total`],
      allowRemoval: false,
      allowArchive: true,
    };
  }

  if (hiddenSelectedCount === selectedCount) {
    return {
      title: 'These lanes are already archived from preview',
      detail: 'This is the safest kind of cleanup set because the guest page is already living without these sections.',
      bestNextMove: 'Remove the hidden lanes that are truly done, and keep only the ones you expect to revive later.',
      decisionRule: 'Once a lane has stayed hidden and unneeded, removal is usually cleaner than carrying dead structure.',
      watchout: 'Do not remove a hidden lane if it is still your only draft of content you expect to reuse.',
      steps: [
        { label: 'Current', detail: 'The selected sections are already out of the live page.' },
        { label: 'Next', detail: 'Remove the lanes that no longer deserve draft space.' },
        { label: 'Then', detail: 'Keep only the hidden sections that still have real comeback value.' },
      ],
      keyStats,
      allowRemoval: true,
      allowArchive: false,
    };
  }

  if (hiddenSelectedCount > 0) {
    return {
      title: 'This retirement set mixes live and archived lanes',
      detail: 'That is workable, but you should normalize what is still live before you make a permanent delete choice.',
      bestNextMove: 'Archive the visible lanes that no longer belong, then remove the whole retired batch once it is consistently off-stage.',
      decisionRule: 'Visibility cleanup comes before permanent removal when a batch mixes live and hidden sections.',
      watchout: 'Deleting a mixed set too early makes it harder to tell which live lane actually needed one last preview pass.',
      steps: [
        { label: 'Current', detail: 'The selected batch is split between live and already hidden lanes.' },
        { label: 'Next', detail: 'Hide the lanes that should exit the guest flow.' },
        { label: 'Then', detail: 'Remove the retired batch only after the whole set is clearly parked.' },
      ],
      keyStats,
      allowRemoval: true,
      allowArchive: true,
    };
  }

  return {
    title: selectedCount === 1 ? 'This lane is ready for a keep-or-cut decision' : 'This batch is ready for a coordinated retirement pass',
    detail: selectedCount === 1
      ? 'The section is still live, so decide whether it should stay visible, be parked, or leave the structure entirely.'
      : 'These sections are still live, but they are grouped well enough for one deliberate retirement move.',
    bestNextMove: selectedCount === 1
      ? 'Archive the section first if you want one more preview pass. Remove it only when you are confident the page reads better without it.'
      : 'Archive the batch if you want to test the lighter page first, or remove it if the story is already clearly stronger without these lanes.',
    decisionRule: 'Archive first when uncertainty is high. Remove when the page meaning is clearly cleaner and the content is no longer needed.',
    watchout: 'Live sections feel more disposable than they are. Always consider whether they hold unique content before you cut them.',
    steps: [
      { label: 'Current', detail: 'The selected lanes are still active in the page flow.' },
      { label: 'Next', detail: 'Archive first if you want to test the lighter structure safely.' },
      { label: 'Then', detail: 'Remove the lanes only after the simplified page feels decisively better.' },
    ],
    keyStats: [...keyStats, `${visibleTotalCount} live total`],
    allowRemoval: true,
    allowArchive: true,
  };
};

export const removeBuilderV2Sections = <TSection extends SectionLike, TBlock>({
  sections,
  sectionBlocks,
  selectedIds,
  selectedId,
}: RemoveParams<TSection, TBlock>): RemovalResult<TSection, TBlock> => {
  const selectedSet = new Set(selectedIds);
  if (!selectedSet.size || selectedSet.size >= sections.length) {
    return {
      sections,
      sectionBlocks,
      removedIds: [],
      nextSelectedId: selectedId,
    };
  }

  const removedIds = sections.filter((section) => selectedSet.has(section.id)).map((section) => section.id);
  if (!removedIds.length) {
    return {
      sections,
      sectionBlocks,
      removedIds: [],
      nextSelectedId: selectedId,
    };
  }

  const nextSections = sections.filter((section) => !selectedSet.has(section.id));
  const nextSectionBlocks = Object.fromEntries(
    Object.entries(sectionBlocks).filter(([sectionId]) => !selectedSet.has(sectionId)),
  ) as Record<string, TBlock[]>;

  const preferredIndex = sections.findIndex((section) => section.id === (selectedId ?? ''));
  const fallbackSection = nextSections[Math.min(Math.max(preferredIndex, 0), nextSections.length - 1)] ?? nextSections[0] ?? null;

  return {
    sections: nextSections,
    sectionBlocks: nextSectionBlocks,
    removedIds,
    nextSelectedId: fallbackSection?.id ?? null,
  };
};
