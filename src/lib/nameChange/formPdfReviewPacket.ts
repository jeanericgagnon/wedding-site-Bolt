import type { NameChangeFdfExportPlan } from './formFdfExport';
import type { NameChangePopulationDraftAssignment, NameChangePopulationDraftBlocker, NameChangePopulationDraftItem, NameChangePopulationDraftPlan } from './formPopulationDraft';
import type { NameChangeFormPopulationPlan, NameChangeFormPopulationPlanItem } from './formPopulationPlan';

export type NameChangePdfReviewPacketStatus = 'ready_for_review' | 'blocked' | 'guided_online';

export interface NameChangePdfReviewFieldInstruction {
  fieldKey: string;
  officialFieldLabel: string;
  pdfFieldName: string;
  value: string;
  instruction: string;
  copyInstruction: string;
  reviewPrompt: string;
  reviewSteps: string[];
}

export interface NameChangePdfReviewPacketItem {
  formCode: string;
  formLabel: string;
  officialUrl: string | null;
  officialRevisionLabel: string;
  status: NameChangePdfReviewPacketStatus;
  statusLabel: string;
  fieldInstructions: NameChangePdfReviewFieldInstruction[];
  blockers: NameChangePopulationDraftBlocker[];
  fdfFileName: string | null;
  fillCommandTemplate: string | null;
  reviewChecklist: string[];
  nextAction: string;
}

export interface NameChangePdfReviewPacketPlan {
  items: NameChangePdfReviewPacketItem[];
  packetJson: string;
  primaryAction: string;
  summary: {
    totalForms: number;
    readyPackets: number;
    blockedPackets: number;
    guidedOnline: number;
    fieldInstructions: number;
    fieldReviewSteps: number;
    reviewChecks: number;
  };
}

function getStatusLabel(status: NameChangePdfReviewPacketStatus) {
  if (status === 'ready_for_review') return 'Ready for review';
  if (status === 'guided_online') return 'Guided online';
  return 'Blocked';
}

function findPopulationItem(
  populationPlan: NameChangeFormPopulationPlan,
  draftItem: NameChangePopulationDraftItem,
) {
  return populationPlan.items.find((item) => (
    item.formCode === draftItem.formCode
    && item.officialRevisionLabel === draftItem.officialRevisionLabel
  )) ?? null;
}

function findFdfItem(fdfExportPlan: NameChangeFdfExportPlan, draftItem: NameChangePopulationDraftItem) {
  return fdfExportPlan.items.find((item) => (
    item.formCode === draftItem.formCode
    && item.officialRevisionLabel === draftItem.officialRevisionLabel
  )) ?? null;
}

function getUnsafeAssignmentBlockers(assignments: NameChangePopulationDraftAssignment[]): NameChangePopulationDraftBlocker[] {
  return assignments
    .filter((assignment) => assignment.redactionPolicy !== 'none' || typeof assignment.value !== 'string')
    .map((assignment) => ({
      fieldKey: assignment.fieldKey,
      officialFieldLabel: assignment.officialFieldLabel,
      reason: `${assignment.officialFieldLabel} cannot be included in a review packet until it is cleared for a safe draft payload.`,
    }));
}

function buildFieldInstructions(assignments: NameChangePopulationDraftAssignment[]): NameChangePdfReviewFieldInstruction[] {
  return assignments
    .filter((assignment) => assignment.redactionPolicy === 'none' && typeof assignment.value === 'string')
    .map((assignment) => {
      const value = assignment.value ?? '';

      return {
        fieldKey: assignment.fieldKey,
        officialFieldLabel: assignment.officialFieldLabel,
        pdfFieldName: assignment.pdfFieldName,
        value,
        instruction: `Populate ${assignment.officialFieldLabel} in PDF field ${assignment.pdfFieldName}.`,
        copyInstruction: `Put "${value}" into PDF field "${assignment.pdfFieldName}" for ${assignment.officialFieldLabel}.`,
        reviewPrompt: `Confirm ${assignment.officialFieldLabel} reads ${value} before signing or submitting.`,
        reviewSteps: [
          `Locate PDF field "${assignment.pdfFieldName}" in the official PDF.`,
          `Confirm ${assignment.officialFieldLabel} should use "${value}".`,
          `Verify the draft shows "${value}" exactly before signing or submitting.`,
        ],
      };
    });
}

function buildReadyChecklist(
  populationItem: NameChangeFormPopulationPlanItem,
  fdfFileName: string | null,
) {
  return [
    `Download the official PDF from ${populationItem.officialUrl}.`,
    `Confirm the downloaded PDF revision matches ${populationItem.officialRevisionLabel}.`,
    fdfFileName
      ? `Use ${fdfFileName} only to create a review draft from the official PDF.`
      : 'Create a review draft only after the FDF export is available.',
    'Review every populated field in the PDF before signing.',
    'Submit only through the official agency instructions for this form.',
  ];
}

function buildGuidedChecklist(populationItem: NameChangeFormPopulationPlanItem | null) {
  return [
    populationItem?.officialUrl
      ? `Open the official agency flow at ${populationItem.officialUrl}.`
      : 'Open the official agency flow.',
    'Use DayOf values as copy guidance only.',
    'Review the agency confirmation page before submitting.',
  ];
}

function getReadyNextAction(fieldInstructionCount: number) {
  if (fieldInstructionCount === 0) return 'Add safe field assignments before creating a review packet.';
  return 'Generate the review draft, inspect each populated field, then sign or submit only through official instructions.';
}

function buildReadyOrBlockedItem(
  draftItem: NameChangePopulationDraftItem,
  populationItem: NameChangeFormPopulationPlanItem | null,
  fdfItem: ReturnType<typeof findFdfItem>,
): NameChangePdfReviewPacketItem {
  const metadataBlockers = populationItem ? [] : [{
    fieldKey: draftItem.formCode,
    officialFieldLabel: draftItem.formLabel,
    reason: 'Official source metadata is missing for this draft item.',
  }];
  const unsafeAssignmentBlockers = getUnsafeAssignmentBlockers(draftItem.assignments);
  const fieldInstructions = buildFieldInstructions(draftItem.assignments);
  const blockers = [
    ...metadataBlockers,
    ...draftItem.blockers,
    ...unsafeAssignmentBlockers,
  ];
  const status: NameChangePdfReviewPacketStatus = draftItem.status === 'ready' && blockers.length === 0 && fieldInstructions.length > 0
    ? 'ready_for_review'
    : 'blocked';

  return {
    formCode: draftItem.formCode,
    formLabel: draftItem.formLabel,
    officialUrl: populationItem?.officialUrl ?? null,
    officialRevisionLabel: draftItem.officialRevisionLabel,
    status,
    statusLabel: getStatusLabel(status),
    fieldInstructions: status === 'ready_for_review' ? fieldInstructions : [],
    blockers,
    fdfFileName: status === 'ready_for_review' ? fdfItem?.fdfFileName ?? null : null,
    fillCommandTemplate: status === 'ready_for_review' ? fdfItem?.fillCommandTemplate ?? null : null,
    reviewChecklist: status === 'ready_for_review' && populationItem ? buildReadyChecklist(populationItem, fdfItem?.fdfFileName ?? null) : [],
    nextAction: status === 'ready_for_review'
      ? getReadyNextAction(fieldInstructions.length)
      : blockers[0]?.reason ?? 'Resolve draft blockers before creating a review packet.',
  };
}

function buildGuidedItem(
  draftItem: NameChangePopulationDraftItem,
  populationItem: NameChangeFormPopulationPlanItem | null,
): NameChangePdfReviewPacketItem {
  return {
    formCode: draftItem.formCode,
    formLabel: draftItem.formLabel,
    officialUrl: populationItem?.officialUrl ?? null,
    officialRevisionLabel: draftItem.officialRevisionLabel,
    status: 'guided_online',
    statusLabel: getStatusLabel('guided_online'),
    fieldInstructions: [],
    blockers: [],
    fdfFileName: null,
    fillCommandTemplate: null,
    reviewChecklist: buildGuidedChecklist(populationItem),
    nextAction: 'Use DayOf as guided copy support while the user completes the official agency flow.',
  };
}

function getPrimaryAction(summary: NameChangePdfReviewPacketPlan['summary']) {
  if (summary.readyPackets > 0) return 'Use ready review packets to create official-form drafts, then require user review before signing or submitting.';
  if (summary.blockedPackets > 0) return 'Resolve blocked draft fields before creating PDF review packets.';
  return 'Use guided online copy support for agency flows that do not expose a production PDF path.';
}

export function buildNameChangePdfReviewPacketPlan(
  populationPlan: NameChangeFormPopulationPlan,
  draftPlan: NameChangePopulationDraftPlan,
  fdfExportPlan: NameChangeFdfExportPlan,
): NameChangePdfReviewPacketPlan {
  const items = draftPlan.items.map((draftItem) => {
    const populationItem = findPopulationItem(populationPlan, draftItem);
    if (draftItem.status === 'guided_online') {
      return buildGuidedItem(draftItem, populationItem);
    }

    return buildReadyOrBlockedItem(draftItem, populationItem, findFdfItem(fdfExportPlan, draftItem));
  });
  const summary = {
    totalForms: items.length,
    readyPackets: items.filter((item) => item.status === 'ready_for_review').length,
    blockedPackets: items.filter((item) => item.status === 'blocked').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    fieldInstructions: items.reduce((sum, item) => sum + item.fieldInstructions.length, 0),
    fieldReviewSteps: items.reduce((sum, item) => (
      sum + item.fieldInstructions.reduce((fieldSum, field) => fieldSum + field.reviewSteps.length, 0)
    ), 0),
    reviewChecks: items.reduce((sum, item) => sum + item.reviewChecklist.length, 0),
  };

  return {
    items,
    packetJson: JSON.stringify({
      reviewOnly: true,
      safePayload: true,
      summary,
      items,
    }, null, 2),
    primaryAction: getPrimaryAction(summary),
    summary,
  };
}
