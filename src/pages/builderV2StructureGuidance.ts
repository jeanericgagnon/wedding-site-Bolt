type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

type SectionLike = {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
};

export type BuilderV2StructureGuidance = {
  title: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
  keyStats: string[];
  addSectionHeadline: string;
  addSectionDetail: string;
  previewHeadline: string;
  previewDetail: string;
};

type Params = {
  sections: SectionLike[];
  selectedSectionId: string;
  addQuery: string;
  filteredAddableCount: number;
  previewDevice: 'desktop' | 'mobile';
  previewScale: number;
  showMinimap: boolean;
};

const normalize = (value: string) => value.trim().toLowerCase();

export const buildBuilderV2StructureGuidance = ({
  sections,
  selectedSectionId,
  addQuery,
  filteredAddableCount,
  previewDevice,
  previewScale,
  showMinimap,
}: Params): BuilderV2StructureGuidance => {
  const visibleSections = sections.filter((section) => section.enabled);
  const hiddenSections = sections.filter((section) => !section.enabled);
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0] ?? null;
  const trimmedQuery = normalize(addQuery);
  const selectedIsHidden = Boolean(selectedSection && !selectedSection.enabled);
  const keyStats = [
    `${sections.length} total`,
    `${visibleSections.length} visible`,
    `${hiddenSections.length} hidden`,
  ];

  if (!visibleSections.length && hiddenSections.length > 0) {
    return {
      title: 'All structure is hidden from preview',
      detail: 'The page still has sections, but none of them are currently in the live reading flow.',
      bestNextMove: `Restore ${hiddenSections[0]?.title ?? 'the first hidden section'} first so the preview has one trustworthy lane again.`,
      decisionRule: 'Bring back one section that earns the page, then decide whether the others should return or stay intentionally hidden.',
      watchout: 'When every section is hidden, the preview goes calm in a misleading way and makes structure loss look like a clean canvas.',
      steps: [
        { label: 'Current', detail: 'No visible sections are left in the page flow.' },
        { label: 'Next', detail: 'Unhide one high-value section so the preview becomes legible again.' },
        { label: 'Then', detail: 'Trim or restore the remaining hidden sections with intent.' },
      ],
      keyStats,
      addSectionHeadline: 'Do not add more sections yet',
      addSectionDetail: 'Recover one hidden lane before you expand the page map, or you will stack new structure on top of unresolved drift.',
      previewHeadline: 'Preview needs one visible anchor lane',
      previewDetail: 'Once a section is visible again, use preview to confirm the page reads like a real guest experience instead of an empty shell.',
    };
  }

  if (selectedIsHidden && selectedSection) {
    return {
      title: `${selectedSection.title} is selected, but it is out of the live page flow`,
      detail: 'You are reviewing a hidden section, so structure decisions matter more than cosmetic edits right now.',
      bestNextMove: `Decide whether ${selectedSection.title} should come back into preview before you keep polishing its internals.`,
      decisionRule: 'Edit hidden sections only when you are preparing them to return or confirming they can stay out safely.',
      watchout: 'Hidden sections are easy to overwork because the preview is not forcing you to judge their real page impact.',
      steps: [
        { label: 'Current', detail: 'Selection is on a section that guests cannot currently see.' },
        { label: 'Next', detail: 'Unhide it if the lane still matters, or leave it hidden on purpose.' },
        { label: 'Then', detail: 'Only refine the section after its place in the page is clear.' },
      ],
      keyStats,
      addSectionHeadline: 'Keep add-section choices narrow',
      addSectionDetail: 'If you open the picker now, look only for a section that repairs a missing lane rather than broadening the draft.',
      previewHeadline: 'Preview is telling the truth about what is live',
      previewDetail: 'Use preview to judge the current visible story, not the hidden section you happen to be editing.',
    };
  }

  if (hiddenSections.length > 0) {
    return {
      title: 'The page map has hidden lanes to resolve',
      detail: `There ${hiddenSections.length === 1 ? 'is' : 'are'} ${hiddenSections.length} hidden section${hiddenSections.length === 1 ? '' : 's'} sitting outside the live reading flow.`,
      bestNextMove: `Review ${hiddenSections[0]?.title ?? 'the hidden lane'} next so you decide whether it should return, move, or stay intentionally out.`,
      decisionRule: 'Resolve hidden sections before adding fresh structure unless the page is clearly missing a more important guest-facing job.',
      watchout: 'Hidden lanes tend to accumulate stale ideas, which makes the draft feel more complete than the live page really is.',
      steps: [
        { label: 'Current', detail: 'Visible structure exists, but some lanes are parked off-stage.' },
        { label: 'Next', detail: 'Review the first hidden section and make an explicit keep-or-cut decision.' },
        { label: 'Then', detail: 'Only add new sections once the hidden backlog is honest.' },
      ],
      keyStats,
      addSectionHeadline: 'Add sections only to close a real gap',
      addSectionDetail: 'The picker is still useful, but hidden-lane cleanup should usually happen before you widen the page further.',
      previewHeadline: 'Preview should confirm the visible story',
      previewDetail: 'Read the live section order top to bottom and ask whether the current visible flow still earns every lane.',
    };
  }

  if (sections.length >= 9) {
    return {
      title: 'The page map is getting dense',
      detail: `There are already ${sections.length} sections in play, which raises the cost of every new lane you add or move.`,
      bestNextMove: 'Use the structure rail to tighten order and trim repetition before you add anything else.',
      decisionRule: 'When the page map gets long, improve sequencing first and expand only when a guest-facing job is still truly missing.',
      watchout: 'Large section counts feel manageable on desktop, but mobile preview is where drift and repetition start to show up fast.',
      steps: [
        { label: 'Current', detail: 'The structure is broad enough that ordering decisions matter more than expansion.' },
        { label: 'Next', detail: 'Reorder or trim the weaker middle lanes before opening the add-section picker.' },
        { label: 'Then', detail: 'Preview the tightened flow on mobile before you widen it again.' },
      ],
      keyStats,
      addSectionHeadline: 'Treat add-section as a replacement tool',
      addSectionDetail: 'If you add anything from the picker now, it should earn its place by replacing or clarifying a weaker lane.',
      previewHeadline: 'Preview is now a density check',
      previewDetail: 'Use mobile preview to see where the page starts feeling long, repetitive, or top-heavy.',
    };
  }

  if (trimmedQuery && filteredAddableCount === 0) {
    return {
      title: 'The structure is steady, but the section search is too narrow',
      detail: 'The page map is in a workable state; the current add-section query is what is blocking the next move.',
      bestNextMove: 'Broaden the section search so you can compare the strongest structural options again.',
      decisionRule: 'When section search goes empty, widen the query before assuming the page needs a custom fix.',
      watchout: 'Over-specific picker searches can make the Builder feel less capable than the current draft actually is.',
      steps: [
        { label: 'Current', detail: 'The structure rail is stable and the add-section picker is over-filtered.' },
        { label: 'Next', detail: 'Clear the search or return to a simpler section name.' },
        { label: 'Then', detail: 'Choose the section that closes the clearest guest-facing gap.' },
      ],
      keyStats,
      addSectionHeadline: 'Widen the picker search',
      addSectionDetail: 'The current query is hiding every addable section, so the next useful move is to zoom back out.',
      previewHeadline: 'Preview is ready for gap-checking',
      previewDetail: 'Use preview to decide what structural job is missing before you reopen the section picker.',
    };
  }

  const previewModeDetail = previewDevice === 'mobile'
    ? `Mobile preview is active at ${previewScale}%, which is the right place to catch density and stacking issues early.`
    : `Desktop preview is active at ${previewScale}%, which is good for page rhythm but can hide mobile stacking problems.`;

  return {
    title: 'The page map is in a healthy review state',
    detail: 'Visible structure is present, hidden drift is under control, and the next gains will come from order and preview quality rather than raw expansion.',
    bestNextMove: 'Read the current section order in preview, then add or move only the lane that most changes the guest story.',
    decisionRule: 'When the page map is healthy, preview-driven sequencing beats adding more structure by default.',
    watchout: 'This is the point where casual section adds create clutter faster than they create clarity.',
    steps: [
      { label: 'Current', detail: 'The structure rail is calm enough for deliberate sequencing work.' },
      { label: 'Next', detail: 'Use preview to judge order, emphasis, and whether a lane is still missing.' },
      { label: 'Then', detail: 'Open the picker only if one specific structural gap remains.' },
    ],
    keyStats: showMinimap ? [...keyStats, 'mini-map on'] : keyStats,
    addSectionHeadline: trimmedQuery
      ? `${filteredAddableCount} addable section${filteredAddableCount === 1 ? '' : 's'} match the current search`
      : 'Add-section picker is ready for targeted expansion',
    addSectionDetail: trimmedQuery
      ? 'Choose the section that clearly changes the page story, not just the first one that happens to match the search.'
      : 'Use the picker when you know what structural job the page still needs, not just when you want more content.',
    previewHeadline: showMinimap ? 'Preview is in structure-audit mode' : 'Preview is ready for a page-flow check',
    previewDetail: `${previewModeDetail}${showMinimap ? ' The mini-map is useful now because you are reviewing overall page shape, not just one lane.' : ''}`,
  };
};
