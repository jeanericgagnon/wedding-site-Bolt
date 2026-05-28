import { getBuilderV2FlattenedSections, type BuilderV2ReviewPageSnapshot } from './builderV2DocumentReviewState';

type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

export type BuilderV2HandoffAction =
  | 'review-hidden'
  | 'review-empty'
  | 'review-warning'
  | 'review-mobile'
  | 'ready-to-export';

export type BuilderV2HandoffGuidance = {
  tone: 'ready' | 'repair' | 'caution';
  title: string;
  detail: string;
  mainFocus: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
  keyStats: string[];
  exportHeadline: string;
  exportDetail: string;
  copyHeadline: string;
  copyDetail: string;
  primaryAction: BuilderV2HandoffAction;
  primaryActionLabel: string;
  focusSectionId: string | null;
};

type Params = {
  pages: BuilderV2ReviewPageSnapshot[];
  previewDevice: 'desktop' | 'mobile';
};

export const buildBuilderV2HandoffGuidance = ({
  pages,
  previewDevice,
}: Params): BuilderV2HandoffGuidance => {
  const sections = getBuilderV2FlattenedSections(pages);
  const visibleSections = sections.filter((section) => section.enabled);
  const hiddenSections = sections.filter((section) => !section.enabled);
  const hiddenPages = pages.filter((page) => page.hidden);
  const emptyVisibleSections = visibleSections.filter((section) => section.blockCount === 0);
  const warningSections = visibleSections.filter((section) => section.warningCount > 0);
  const denseSections = visibleSections.filter((section) => section.blockCount >= 8);
  const totalBlocks = sections.reduce((sum, section) => sum + section.blockCount, 0);
  const keyStats = [
    `${pages.length} pages`,
    `${sections.length} sections`,
    `${visibleSections.length} visible`,
    `${totalBlocks} blocks`,
  ];

  if (!visibleSections.length) {
    return {
      tone: 'caution',
      title: 'Nothing visible is ready for handoff yet',
      detail: 'The document still has structure, but guests would see an empty site map because every page or section is hidden.',
      mainFocus: 'Bring one trustworthy lane back into preview before exporting anything.',
      bestNextMove: `Review ${hiddenSections[0]?.title ?? hiddenPages[0]?.title ?? 'the first hidden lane'} and decide whether it should return to the visible page flow now.`,
      decisionRule: 'A handoff is only useful once the preview has at least one visible lane that reflects the real document story.',
      watchout: 'A calm empty preview can look “clean” while actually hiding a broken handoff state.',
      steps: [
        { label: 'Current', detail: 'All pages or sections are hidden from the visible reading flow.' },
        { label: 'Next', detail: 'Restore one high-value lane to preview.' },
        { label: 'Then', detail: 'Export only after the visible page flow is legible again.' },
      ],
      keyStats: [...keyStats, `${hiddenSections.length} hidden lanes`],
      exportHeadline: 'Hold the export for now',
      exportDetail: 'An export from this state is more likely to preserve confusion than capture a usable document.',
      copyHeadline: 'Copy is useful after recovery',
      copyDetail: 'Once one good lane is visible again, copied JSON becomes a safer handoff artifact.',
      primaryAction: 'review-hidden',
      primaryActionLabel: hiddenPages.length > 0 ? 'Review hidden page' : 'Review hidden section',
      focusSectionId: hiddenSections[0]?.id ?? null,
    };
  }

  if (emptyVisibleSections.length > 0) {
    return {
      tone: 'repair',
      title: 'A visible section still has no internal content spine',
      detail: 'The visible page flow exists, but one or more visible sections would export as empty shells.',
      mainFocus: 'Fill the first empty visible lane before polishing anything else.',
      bestNextMove: `Open ${emptyVisibleSections[0]?.title ?? 'the empty section'} and add its first meaningful block spine.`,
      decisionRule: 'Export after every visible section can explain its job with at least one anchor block and one supporting detail.',
      watchout: 'Empty visible shells make a document look structurally complete while still hiding real authoring debt.',
      steps: [
        { label: 'Current', detail: 'At least one visible section has zero content blocks.' },
        { label: 'Next', detail: 'Add the first anchor blocks to that lane.' },
        { label: 'Then', detail: 'Re-check preview before exporting or copying the document.' },
      ],
      keyStats: [...keyStats, `${emptyVisibleSections.length} empty visible`],
      exportHeadline: 'Export after the empty lane has shape',
      exportDetail: 'The JSON will be more useful once every visible lane carries at least a minimal structure.',
      copyHeadline: 'Copy gets better once the shell is gone',
      copyDetail: 'A copied export is easier to reason about when it does not include visibly empty sections.',
      primaryAction: 'review-empty',
      primaryActionLabel: 'Fix empty section',
      focusSectionId: emptyVisibleSections[0]?.id ?? null,
    };
  }

  if (warningSections.length > 0) {
    const warningCount = warningSections.reduce((sum, section) => sum + section.warningCount, 0);
    return {
      tone: 'repair',
      title: 'The document is structurally present, but content warnings still matter',
      detail: `${warningCount} block warning${warningCount === 1 ? '' : 's'} are still active in visible sections.`,
      mainFocus: 'Clear the visible content warnings before you treat this as a stable handoff artifact.',
      bestNextMove: `Open ${warningSections[0]?.title ?? 'the warning-heavy section'} and resolve the incomplete block details first.`,
      decisionRule: 'When visible blocks still warn, content truth beats adding more structure or exporting early.',
      watchout: 'A good-looking page can still hand off poorly if the exported blocks are missing the details that make them real.',
      steps: [
        { label: 'Current', detail: 'Visible sections still contain incomplete or weakly populated blocks.' },
        { label: 'Next', detail: 'Resolve the warning-bearing blocks in the first affected lane.' },
        { label: 'Then', detail: 'Export only after the visible preview is structurally and textually trustworthy.' },
      ],
      keyStats: [...keyStats, `${warningCount} warnings`],
      exportHeadline: 'Export is close, but not steady yet',
      exportDetail: 'The structure is there; the next improvement is making sure the exported data carries real content instead of placeholders.',
      copyHeadline: 'Copy becomes more reusable after warning cleanup',
      copyDetail: 'Consumers of the JSON will have a much easier time once the visible block data is truthful.',
      primaryAction: 'review-warning',
      primaryActionLabel: 'Resolve warning section',
      focusSectionId: warningSections[0]?.id ?? null,
    };
  }

  if (previewDevice !== 'mobile' && denseSections.length > 0) {
    return {
      tone: 'caution',
      title: 'The document looks steady, but density still needs a mobile read',
      detail: `${denseSections.length} visible section${denseSections.length === 1 ? '' : 's'} are dense enough that desktop preview may be hiding the real handoff risk.`,
      mainFocus: 'Run a mobile preview pass before calling this document export-ready.',
      bestNextMove: 'Switch to mobile preview and read the dense lanes top to bottom for stacking, repetition, and fatigue.',
      decisionRule: 'If a section feels long or crowded on desktop, confirm the mobile read before freezing the document.',
      watchout: 'Desktop confidence is the easiest way to ship a layout that only starts feeling heavy once it reaches a phone-sized read.',
      steps: [
        { label: 'Current', detail: 'The structure is healthy, but dense lanes still need a smaller-screen check.' },
        { label: 'Next', detail: 'Switch preview to mobile and review the longest visible sections.' },
        { label: 'Then', detail: 'Export once the mobile read still feels deliberate.' },
      ],
      keyStats: [...keyStats, `${denseSections.length} dense visible`],
      exportHeadline: 'Export after the mobile pass',
      exportDetail: 'A final mobile review will make this handoff more trustworthy without forcing a larger rebuild.',
      copyHeadline: 'Copy is fine once the mobile story holds up',
      copyDetail: 'A copied document becomes much safer to share when the tighter preview has already been checked.',
      primaryAction: 'review-mobile',
      primaryActionLabel: 'Run mobile review',
      focusSectionId: denseSections[0]?.id ?? null,
    };
  }

  return {
    tone: 'ready',
    title: 'This Builder V2 document is in a healthy handoff state',
    detail: 'Visible structure is present across the active pages, the lanes have content, and there are no active warning signals competing with export.',
    mainFocus: 'Use export to capture the draft you trust, not to postpone one last meaningful fix.',
    bestNextMove: 'Download or copy the layout now, then keep editing only if you have one clear structural improvement in mind.',
    decisionRule: 'Once the document is coherent, export the steady version before you start another experiment.',
    watchout: 'The most common late-stage mistake is reopening structure just because the lab still has room for more.',
    steps: [
      { label: 'Current', detail: 'The visible page flow is coherent and free of active warning debt.' },
      { label: 'Next', detail: 'Capture the current document as JSON for handoff or backup.' },
      { label: 'Then', detail: 'Only continue editing if the next change has a specific guest-facing payoff.' },
    ],
    keyStats: hiddenPages.length > 0 || hiddenSections.length > 0
      ? [...keyStats, `${hiddenPages.length} hidden pages`, `${hiddenSections.length} hidden lanes`]
      : keyStats,
    exportHeadline: 'Export is ready',
    exportDetail: 'This is a good moment to download a Builder V2 JSON snapshot of the document you trust.',
    copyHeadline: 'Copy is ready',
    copyDetail: 'Copy JSON when you want to inspect, diff, or hand the document to another tool quickly.',
    primaryAction: 'ready-to-export',
    primaryActionLabel: 'Export layout now',
    focusSectionId: null,
  };
};
