type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

type SectionLike = {
  id: string;
  title: string;
  enabled: boolean;
  density?: 'compact' | 'comfortable';
};

export type BuilderV2SelectionGuidance = {
  title: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
  keyStats: string[];
};

type Params = {
  selectedSections: SectionLike[];
};

export const buildBuilderV2SelectionGuidance = ({
  selectedSections,
}: Params): BuilderV2SelectionGuidance => {
  const visibleCount = selectedSections.filter((section) => section.enabled).length;
  const hiddenCount = selectedSections.length - visibleCount;
  const compactCount = selectedSections.filter((section) => section.density === 'compact').length;
  const comfortableCount = selectedSections.filter((section) => section.density !== 'compact').length;
  const keyStats = [
    `${selectedSections.length} selected`,
    `${visibleCount} visible`,
    `${hiddenCount} hidden`,
  ];

  if (!selectedSections.length) {
    return {
      title: 'No batch selection is active',
      detail: 'Pick more than one section before you use bulk cleanup actions.',
      bestNextMove: 'Select the lanes that belong to the same cleanup pass so you can change them deliberately together.',
      decisionRule: 'Use multi-select only when the sections share the same structural intent.',
      watchout: 'Batch actions are fast, so they should start from a clear grouping, not a grab bag.',
      steps: [
        { label: 'Current', detail: 'Single-section editing is the active mode.' },
        { label: 'Next', detail: 'Add related sections to the selection.' },
        { label: 'Then', detail: 'Run one bulk cleanup move at a time.' },
      ],
      keyStats: ['0 selected'],
    };
  }

  if (hiddenCount > 0 && visibleCount > 0) {
    return {
      title: 'The selection mixes visible and hidden lanes',
      detail: 'This is a good cleanup set, but you should resolve visibility truth before you start changing density or variants together.',
      bestNextMove: 'Decide whether the whole batch belongs live right now, then show or hide it consistently.',
      decisionRule: 'Fix visibility first when a batch mixes live lanes and parked lanes.',
      watchout: 'Batch styling a mixed visibility set makes the page feel tidier in the editor while the live preview is still telling a different story.',
      steps: [
        { label: 'Current', detail: 'The selected batch is split between live and hidden lanes.' },
        { label: 'Next', detail: 'Normalize visibility across the batch.' },
        { label: 'Then', detail: 'Only after that, tighten density or ordering.' },
      ],
      keyStats,
    };
  }

  if (hiddenCount === selectedSections.length) {
    return {
      title: 'The whole batch is hidden from preview',
      detail: 'These sections are already out of the live page flow, which makes this a good batch for keep-or-cut decisions.',
      bestNextMove: 'Bring back only the lanes you still want guests to feel, then leave the rest intentionally hidden.',
      decisionRule: 'A hidden batch should return lane by lane, not all at once, unless it clearly forms one coherent story block.',
      watchout: 'Restoring every hidden lane together can recreate the exact clutter you were trying to clean up.',
      steps: [
        { label: 'Current', detail: 'All selected sections are parked off-stage.' },
        { label: 'Next', detail: 'Show only the lanes that still matter to the page.' },
        { label: 'Then', detail: 'Review the restored batch in preview before expanding further.' },
      ],
      keyStats,
    };
  }

  if (compactCount > 0 && comfortableCount > 0) {
    return {
      title: 'The batch has mixed density settings',
      detail: 'That usually means these lanes were edited at different times and could use one calmer shared read.',
      bestNextMove: 'Choose whether this batch should read tighter or more open, then normalize density before deeper polish.',
      decisionRule: 'Use one density mode per batch when the sections are meant to feel like a connected part of the same page story.',
      watchout: 'Mixed density can make section quality feel inconsistent even when the copy itself is strong.',
      steps: [
        { label: 'Current', detail: 'Selected lanes do not share the same spacing rhythm yet.' },
        { label: 'Next', detail: 'Normalize the batch to one density mode.' },
        { label: 'Then', detail: 'Preview the group together and trim any lane that still feels too heavy.' },
      ],
      keyStats: [...keyStats, `${compactCount} compact`, `${comfortableCount} open`],
    };
  }

  return {
    title: 'The batch is ready for a coordinated cleanup pass',
    detail: 'These sections already share enough state that one bulk move can make the page feel calmer without guessing.',
    bestNextMove: 'Run one shared cleanup move, then re-read the batch in preview before you stack another action on top.',
    decisionRule: 'Batch actions work best when they change one page-reading dimension at a time: visibility, density, or structure.',
    watchout: 'Fast bulk cleanup is useful, but two or three batch changes in a row can hide which one actually improved the page.',
    steps: [
      { label: 'Current', detail: 'The selected lanes are aligned enough for one coordinated edit.' },
      { label: 'Next', detail: 'Apply the one shared action that most changes how the batch reads.' },
      { label: 'Then', detail: 'Check the page in preview before making another bulk move.' },
    ],
    keyStats: [...keyStats, `${comfortableCount} open`],
  };
};
