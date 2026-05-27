import type { BuilderV2ImportReport } from '../builder-v2/importPrepare';
import { getImportSummaryTone, summarizeImportRepairCount } from './builderV2WorkflowGuidance';

export type BuilderV2ImportReviewSummary = {
  sourceLabel: string;
  headline: string;
  detail: string;
  toastMessage: string;
  keyStats: string[];
  notesTitle: string;
  topNotes: string[];
};

const getImportSourceLabel = (report: BuilderV2ImportReport) => {
  switch (report.sourceKind) {
    case 'layout-config-v1':
      return 'Legacy layout config';
    case 'builder-project':
      return 'Legacy builder project';
    case 'builder-v2':
    default:
      return 'Builder V2 export';
  }
};

const collectTopNotes = (report: BuilderV2ImportReport) => {
  const notes = [...report.notes];

  if (report.normalizedPageSlugs > 0) {
    notes.push(`Normalized ${report.normalizedPageSlugs} page slug${report.normalizedPageSlugs === 1 ? '' : 's'} to keep the page map safe.`);
  }
  if (report.normalizedHomePage) {
    notes.push('Reset the home page so the imported document has one clear public entry point.');
  }
  if (report.normalizedSectionTypes > 0 || report.normalizedBlockTypes > 0) {
    const parts = [
      report.normalizedSectionTypes > 0
        ? `${report.normalizedSectionTypes} section type${report.normalizedSectionTypes === 1 ? '' : 's'}`
        : null,
      report.normalizedBlockTypes > 0
        ? `${report.normalizedBlockTypes} block type${report.normalizedBlockTypes === 1 ? '' : 's'}`
        : null,
    ].filter(Boolean);
    notes.push(`Normalized ${parts.join(' and ')} to keep the structure editable in V2.`);
  }
  if (report.recoveredBlockDataFromLegacyContent > 0) {
    notes.push(`Recovered block copy from ${report.recoveredBlockDataFromLegacyContent} legacy content field${report.recoveredBlockDataFromLegacyContent === 1 ? '' : 's'}.`);
  }

  return Array.from(new Set(notes)).slice(0, 4);
};

export const buildBuilderV2ImportReviewSummary = (
  report: BuilderV2ImportReport,
  sourceName: string,
): BuilderV2ImportReviewSummary => {
  const tone = getImportSummaryTone(report);
  const repairs = summarizeImportRepairCount(report);
  const sourceLabel = getImportSourceLabel(report);
  const topNotes = collectTopNotes(report);
  const migrationSubject = report.sourceKind === 'builder-v2' ? sourceName : `${sourceName} (${sourceLabel.toLowerCase()})`;

  const keyStats = [
    sourceLabel,
    `${report.pageCount} page${report.pageCount === 1 ? '' : 's'}`,
    `${report.sectionCount} sections`,
    `${report.blockCount} blocks`,
    `${repairs} repairs`,
  ];

  if (tone === 'clean') {
    return {
      sourceLabel,
      headline: report.sourceKind === 'builder-v2'
        ? 'Clean Builder V2 import'
        : 'Clean legacy migration into Builder V2',
      detail: report.sourceKind === 'builder-v2'
        ? 'The incoming export already fits the V2 document model, so the next pass is about page flow and content quality rather than structural cleanup.'
        : 'The older document shape mapped cleanly into the V2 model, so the next pass should confirm that the migrated pages still read the way you want them to.',
      toastMessage: report.sourceKind === 'builder-v2'
        ? `Imported clean Builder V2 layout from ${migrationSubject}`
        : `Migrated ${migrationSubject} cleanly into Builder V2`,
      keyStats,
      notesTitle: report.sourceKind === 'builder-v2' ? 'Clean import notes' : 'Migration notes',
      topNotes,
    };
  }

  if (tone === 'repaired') {
    return {
      sourceLabel,
      headline: report.sourceKind === 'builder-v2'
        ? 'Builder V2 import repaired mild drift'
        : 'Legacy migration repaired mild drift',
      detail: report.sourceKind === 'builder-v2'
        ? 'The import stayed usable, but V2 had to normalize a few ids, types, or content fields on the way in.'
        : 'The migration bridge kept the older document usable, but it had to normalize a few structural details to land safely in V2.',
      toastMessage: report.sourceKind === 'builder-v2'
        ? `Imported Builder V2 layout from ${migrationSubject} with ${repairs} repair${repairs === 1 ? '' : 's'}`
        : `Migrated ${migrationSubject} into Builder V2 with ${repairs} repair${repairs === 1 ? '' : 's'}`,
      keyStats,
      notesTitle: report.sourceKind === 'builder-v2' ? 'Repair highlights' : 'Migration repair highlights',
      topNotes,
    };
  }

  return {
    sourceLabel,
    headline: report.sourceKind === 'builder-v2'
      ? 'Builder V2 import dropped invalid content'
      : 'Legacy migration dropped invalid content',
    detail: report.sourceKind === 'builder-v2'
      ? 'The import salvaged the usable structure, but some invalid lanes or blocks could not come forward safely.'
      : 'The migration bridge salvaged the usable structure, but some invalid legacy lanes or blocks had to be left behind.',
    toastMessage: report.sourceKind === 'builder-v2'
      ? `Imported Builder V2 layout from ${migrationSubject} with dropped invalid content`
      : `Migrated ${migrationSubject} into Builder V2 with dropped invalid content`,
    keyStats,
    notesTitle: report.sourceKind === 'builder-v2' ? 'Dropped-content notes' : 'Migration risk notes',
    topNotes,
  };
};
