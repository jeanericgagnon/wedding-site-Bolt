import type { BuilderV2ImportReport } from '../builder-v2/importPrepare';

type GuidanceStep = {
  label: 'Current' | 'Next' | 'Then';
  detail: string;
};

export type BuilderV2ImportGuidance = {
  title: string;
  detail: string;
  tone: 'clean' | 'repaired' | 'caution' | 'empty';
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  steps: GuidanceStep[];
  keyStats: string[];
};

export type BuilderV2CommandItemLike = {
  id: string;
  group: string;
  label: string;
};

export type BuilderV2CommandPaletteGuidance = {
  title: string;
  detail: string;
  bestNextMove: string;
  decisionRule: string;
  watchout: string;
  visibleCount: number;
  suggestedQueries: string[];
};

export const summarizeImportRepairCount = (report: BuilderV2ImportReport) => (
  report.generatedSectionIds
  + report.generatedBlockIds
  + report.dedupedSectionIds
  + report.dedupedBlockIds
  + report.normalizedSectionTypes
  + report.normalizedBlockTypes
  + report.defaultedVariants
  + report.coercedEnabledFlags
  + report.normalizedTitles
  + report.normalizedSubtitles
  + report.resetInvalidBlockData
  + report.recoveredBlockDataFromLegacyContent
  + report.droppedInvalidSections
  + report.droppedInvalidBlocks
  + (report.normalizedVersion ? 1 : 0)
  + (report.normalizedUpdatedAt ? 1 : 0)
);

export const getImportSummaryTone = (report: BuilderV2ImportReport) => {
  const repairs = summarizeImportRepairCount(report);
  if (repairs === 0) return 'clean' as const;
  if (report.droppedInvalidSections > 0 || report.droppedInvalidBlocks > 0) return 'caution' as const;
  return 'repaired' as const;
};

export const buildBuilderV2ImportGuidance = (
  report: BuilderV2ImportReport | null,
  sourceLabel: string,
): BuilderV2ImportGuidance => {
  if (!report) {
    return {
      title: 'Import can recover mildly drifted Builder V2 exports',
      detail: 'Use import when you want to inspect or repair an exported layout without rebuilding it by hand.',
      tone: 'empty',
      bestNextMove: 'Upload or paste the layout you want to recover, then review the repair summary before editing deeper.',
      decisionRule: 'Import first when the structure mostly exists already; rebuild manually only when the export is fundamentally wrong.',
      watchout: 'Import replaces the current lab structure, so do not use it casually if you still need the current local draft.',
      steps: [
        { label: 'Current', detail: 'No import has been reviewed in this session yet.' },
        { label: 'Next', detail: 'Load the export and let the recovery pipeline normalize obvious drift.' },
        { label: 'Then', detail: 'Check the repaired sections before you continue editing.' },
      ],
      keyStats: [],
    };
  }

  const tone = getImportSummaryTone(report);
  const repairs = summarizeImportRepairCount(report);
  const isLegacyMigration = report.sourceKind === 'layout-config-v1' || report.sourceKind === 'builder-project';
  const legacyLabel = report.sourceKind === 'layout-config-v1'
    ? 'legacy layout config'
    : report.sourceKind === 'builder-project'
      ? 'legacy builder project'
      : null;
  const keyStats = [
    `${report.sectionCount} sections`,
    `${report.blockCount} blocks`,
    `${repairs} repairs`,
  ];
  if (isLegacyMigration && legacyLabel) {
    keyStats.unshift(legacyLabel);
  }

  if (tone === 'clean') {
    return {
      title: isLegacyMigration ? `Migrated ${sourceLabel} cleanly into Builder V2` : `Imported ${sourceLabel} cleanly`,
      detail: isLegacyMigration
        ? 'The migration bridge mapped the older document shape into Builder V2 without needing cleanup, so you can move straight into content and variant review.'
        : 'The layout came through without needing structural repair, so you can move straight into content and variant review.',
      tone,
      bestNextMove: isLegacyMigration
        ? 'Review the most guest-visible page first so you confirm the migrated structure still feels like the site you meant to bring forward.'
        : 'Open the strongest section first and verify that the imported structure still matches how you want the page to read.',
      decisionRule: isLegacyMigration
        ? 'When migration is clean, spend the next pass checking page flow and content truth instead of re-litigating the bridge itself.'
        : 'When import is clean, spend the next pass on content truth and section order instead of repair cleanup.',
      watchout: isLegacyMigration
        ? 'A clean migration can still carry old wording or thin starter blocks, so do not mistake “mapped cleanly” for “already V2-quality.”'
        : 'A clean import can still carry mediocre copy or weak section sequencing, so do not mistake “clean” for “finished.”',
      steps: [
        { label: 'Current', detail: isLegacyMigration ? 'The older document shape mapped into Builder V2 without extra cleanup.' : 'Import normalized without repair work.' },
        { label: 'Next', detail: 'Review the first few sections for content quality and sequencing.' },
        { label: 'Then', detail: 'Trim or refine before adding new structure.' },
      ],
      keyStats,
    };
  }

  if (tone === 'repaired') {
    return {
      title: isLegacyMigration ? `Migrated ${sourceLabel} with recoverable drift` : `Imported ${sourceLabel} with recoverable drift`,
      detail: isLegacyMigration
        ? 'The migration bridge mapped the older document shape into Builder V2 and repaired the mild drift needed to keep it usable.'
        : 'The recovery pipeline fixed ids, types, or other mild export problems and kept the layout usable.',
      tone,
      bestNextMove: isLegacyMigration
        ? 'Check the pages with the most guest-facing meaning first so you confirm the migrated structure still tells the right story.'
        : 'Check the sections with the most structural meaning first so you confirm the repaired layout still tells the right story.',
      decisionRule: isLegacyMigration
        ? 'After a repaired migration, verify the pages and sections whose meaning depends most on normalized block type or variant choice.'
        : 'After a repaired import, verify the sections whose meaning depends most on block type or variant choice.',
      watchout: isLegacyMigration
        ? 'Migration success can hide subtle meaning drift if you never confirm the normalized pages, sections, and starter blocks in preview.'
        : 'Repair success can hide subtle meaning drift if you never confirm the normalized section and block types in preview.',
      steps: [
        { label: 'Current', detail: isLegacyMigration ? 'The older document shape is usable in Builder V2, but some parts were normalized on the way in.' : 'The layout is usable, but some parts were normalized on the way in.' },
        { label: 'Next', detail: 'Open the repaired sections and confirm their key block types still make sense.' },
        { label: 'Then', detail: 'Only expand the layout after the repaired core is trustworthy.' },
      ],
      keyStats,
    };
  }

  return {
    title: isLegacyMigration ? `Migrated ${sourceLabel} with dropped invalid content` : `Imported ${sourceLabel} with dropped invalid content`,
    detail: isLegacyMigration
      ? 'The migration bridge salvaged what it could from the older document shape, but some unusable sections or blocks had to be dropped during cleanup.'
      : 'The lab salvaged what it could, but some unusable sections or blocks had to be dropped during cleanup.',
    tone,
    bestNextMove: isLegacyMigration
      ? 'Read the dropped-content notes, then rebuild the highest-impact missing page or lane before polishing anything else.'
      : 'Read the dropped-content notes, then repair the highest-impact missing lane before polishing anything else.',
    decisionRule: isLegacyMigration
      ? 'When migration drops content, restore missing structure before you spend time refining copy or cosmetics.'
      : 'When import drops content, fix missing structure before touching copy or cosmetic settings.',
    watchout: isLegacyMigration
      ? 'A salvaged migration can look calm in preview while still missing a whole guest-facing job that never made it through the bridge.'
      : 'A salvaged import can look calm in preview while still missing an entire guest-facing job that was dropped during cleanup.',
    steps: [
      { label: 'Current', detail: isLegacyMigration ? 'Some invalid legacy structure was removed to keep the migration usable.' : 'Some invalid structure was removed to keep the import usable.' },
      { label: 'Next', detail: 'Recover the most important missing section or block lane first.' },
      { label: 'Then', detail: 'Re-check the repaired page flow before you continue editing.' },
    ],
    keyStats,
  };
};

export const buildBuilderV2CommandPaletteGuidance = (
  query: string,
  commandItems: BuilderV2CommandItemLike[],
  recentCommands: string[],
  pinnedCommands: string[],
): BuilderV2CommandPaletteGuidance => {
  const trimmedQuery = query.trim().toLowerCase();
  const visibleCount = commandItems.length;
  const baseSuggestions = [
    ...pinnedCommands,
    ...recentCommands,
    'Add section',
    'Select section',
    'Set variant',
  ];
  const suggestedQueries = Array.from(new Set(baseSuggestions))
    .filter((item) => item.toLowerCase().includes(trimmedQuery || item.toLowerCase()))
    .slice(0, 4);

  if (!trimmedQuery) {
    return {
      title: 'Command palette is ready for quick structural moves',
      detail: 'Use it when you already know the action you want and do not need to hunt through side panels.',
      bestNextMove: 'Start with an action verb like “Add”, “Select”, or “Set variant” to narrow the list immediately.',
      decisionRule: 'Use the palette for direct moves; use the visible editor when you need to judge content before acting.',
      watchout: 'The palette is fast, but it is easier to fire the wrong action when you search vaguely.',
      visibleCount,
      suggestedQueries,
    };
  }

  if (visibleCount === 0) {
    return {
      title: 'No matching commands yet',
      detail: 'This search is narrower than the current command vocabulary in the lab.',
      bestNextMove: 'Shorten the query or switch back to a simple verb like “Add”, “Select”, or “Set variant.”',
      decisionRule: 'When the palette goes empty, broaden the phrase instead of assuming the action is unavailable.',
      watchout: 'Over-specific queries make the lab feel less capable than it really is.',
      visibleCount,
      suggestedQueries: suggestedQueries.length ? suggestedQueries : ['Add section', 'Select section'],
    };
  }

  const topGroup = commandItems[0]?.group ?? 'Action';
  return {
    title: `${visibleCount} ${topGroup.toLowerCase()} command${visibleCount === 1 ? '' : 's'} are in range`,
    detail: 'The search is now focused enough to act quickly without losing context.',
    bestNextMove: `Use the top ${topGroup.toLowerCase()} command if it already matches the structural move you had in mind.`,
    decisionRule: 'Take the top command only when its label says the whole move clearly; otherwise refine the query one step further.',
    watchout: 'Fast command runs are great for structure, but they can skip the pause where you notice a better editing lane.',
    visibleCount,
    suggestedQueries,
  };
};
