import type { NameChangePopulationDraftItem, NameChangePopulationDraftPlan } from './formPopulationDraft';

export type NameChangeFdfExportItemStatus = 'ready' | 'blocked' | 'guided_online';

export interface NameChangeFdfFieldAssignment {
  pdfFieldName: string;
  value: string;
}

export interface NameChangeFdfExportItem {
  formCode: string;
  formLabel: string;
  officialRevisionLabel: string;
  status: NameChangeFdfExportItemStatus;
  statusLabel: string;
  fdfFileName: string | null;
  fdfText: string | null;
  fillCommandTemplate: string | null;
  assignmentCount: number;
  blockerCount: number;
  nextAction: string;
}

export interface NameChangeFdfExportPlan {
  items: NameChangeFdfExportItem[];
  exportPayloadJson: string;
  primaryAction: string;
  summary: {
    totalForms: number;
    readyFdfFiles: number;
    blockedForms: number;
    guidedOnline: number;
    assignments: number;
  };
}

function escapePdfLiteral(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function sanitizeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'name-change-form';
}

export function buildNameChangeFdfText(assignments: NameChangeFdfFieldAssignment[]) {
  const fields = assignments.map((assignment) => (
    `<< /T (${escapePdfLiteral(assignment.pdfFieldName)}) /V (${escapePdfLiteral(assignment.value)}) >>`
  ));

  return [
    '%FDF-1.2',
    '1 0 obj',
    '<<',
    '/FDF <<',
    '/Fields [',
    ...fields,
    ']',
    '>>',
    '>>',
    'endobj',
    'trailer',
    '<< /Root 1 0 R >>',
    '%%EOF',
  ].join('\n');
}

function getStatusLabel(status: NameChangeFdfExportItemStatus) {
  if (status === 'ready') return 'FDF ready';
  if (status === 'guided_online') return 'Guided online';
  return 'Blocked';
}

function buildReadyItem(item: NameChangePopulationDraftItem): NameChangeFdfExportItem {
  const fileBase = sanitizeFilePart(`${item.formCode}-${item.officialRevisionLabel}`);
  const fdfFileName = `dayof-${fileBase}.fdf`;
  const assignments = item.assignments.map((assignment) => ({
    pdfFieldName: assignment.pdfFieldName,
    value: assignment.value ?? '',
  }));

  return {
    formCode: item.formCode,
    formLabel: item.formLabel,
    officialRevisionLabel: item.officialRevisionLabel,
    status: 'ready',
    statusLabel: getStatusLabel('ready'),
    fdfFileName,
    fdfText: buildNameChangeFdfText(assignments),
    fillCommandTemplate: `pdftk OFFICIAL_${item.formCode}.pdf fill_form ${fdfFileName} output REVIEW_DRAFT_${item.formCode}.pdf flatten`,
    assignmentCount: assignments.length,
    blockerCount: 0,
    nextAction: 'Use this FDF with the official downloaded PDF to create a review-only draft, then require user review before signing or submitting.',
  };
}

function buildNonReadyItem(item: NameChangePopulationDraftItem): NameChangeFdfExportItem {
  const status: NameChangeFdfExportItemStatus = item.status === 'guided_online' ? 'guided_online' : 'blocked';

  return {
    formCode: item.formCode,
    formLabel: item.formLabel,
    officialRevisionLabel: item.officialRevisionLabel,
    status,
    statusLabel: getStatusLabel(status),
    fdfFileName: null,
    fdfText: null,
    fillCommandTemplate: null,
    assignmentCount: item.assignments.length,
    blockerCount: item.blockers.length,
    nextAction: status === 'guided_online'
      ? 'Use guided copy support on the official agency site instead of generating an FDF.'
      : item.blockers[0]?.reason ?? 'Resolve draft blockers before exporting an FDF.',
  };
}

export function buildNameChangeFdfExportPlan(
  draftPlan: NameChangePopulationDraftPlan,
): NameChangeFdfExportPlan {
  const items = draftPlan.items.map((item) => (
    item.status === 'ready' ? buildReadyItem(item) : buildNonReadyItem(item)
  ));
  const summary = {
    totalForms: items.length,
    readyFdfFiles: items.filter((item) => item.status === 'ready').length,
    blockedForms: items.filter((item) => item.status === 'blocked').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    assignments: items.reduce((sum, item) => sum + item.assignmentCount, 0),
  };
  const primaryAction = summary.readyFdfFiles > 0
    ? 'Export FDF field data for ready PDF forms, then merge only with official downloaded PDFs for user review.'
    : summary.blockedForms > 0
      ? 'Resolve blocked fields before exporting FDF data.'
      : 'Use guided online entry for the current agency flows.';

  return {
    items,
    exportPayloadJson: JSON.stringify({
      reviewOnly: true,
      format: 'FDF',
      summary,
      items: items.map((item) => ({
        ...item,
        fdfText: item.fdfText ? '[available separately]' : null,
      })),
    }, null, 2),
    primaryAction,
    summary,
  };
}
