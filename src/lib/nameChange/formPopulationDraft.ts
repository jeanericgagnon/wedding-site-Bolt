import type { NameChangeFormPopulationFieldMapping, NameChangeFormPopulationPlan } from './formPopulationPlan';

export type NameChangePopulationDraftItemStatus = 'ready' | 'blocked' | 'guided_online';
export type NameChangePopulationDraftAssignmentSource = 'saved_value' | 'secure_session_required';

export interface NameChangePopulationDraftAssignment {
  fieldKey: string;
  officialFieldLabel: string;
  pdfFieldName: string;
  value: string | null;
  source: NameChangePopulationDraftAssignmentSource;
  redactionPolicy: NameChangeFormPopulationFieldMapping['redactionPolicy'];
}

export interface NameChangePopulationDraftBlocker {
  fieldKey: string;
  officialFieldLabel: string;
  reason: string;
}

export interface NameChangePopulationDraftItem {
  formCode: string;
  formLabel: string;
  officialRevisionLabel: string;
  status: NameChangePopulationDraftItemStatus;
  statusLabel: string;
  assignments: NameChangePopulationDraftAssignment[];
  blockers: NameChangePopulationDraftBlocker[];
  nextAction: string;
}

export interface NameChangePopulationDraftPlan {
  items: NameChangePopulationDraftItem[];
  draftPayloadJson: string;
  primaryAction: string;
  summary: {
    totalForms: number;
    readyDrafts: number;
    blockedDrafts: number;
    guidedOnline: number;
    assignments: number;
    blockedFields: number;
  };
}

function getSensitiveBlockerReason(field: NameChangeFormPopulationFieldMapping) {
  if (field.redactionPolicy === 'requires_secure_session') {
    return `${field.officialFieldLabel} requires a secure-session value handoff before it can be placed into a draft.`;
  }

  return `${field.officialFieldLabel} requires explicit consent before the saved sensitive value can be placed into a draft.`;
}

function buildFieldBlockers(field: NameChangeFormPopulationFieldMapping): NameChangePopulationDraftBlocker[] {
  if (field.mappingStatus !== 'mapped') {
    return [{
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      reason: `${field.officialFieldLabel} is not mapped to a PDF field yet.`,
    }];
  }
  if (!field.hasValue) {
    return [{
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      reason: `${field.officialFieldLabel} does not have a usable value yet.`,
    }];
  }
  if (field.redactionPolicy !== 'none') {
    return [{
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      reason: getSensitiveBlockerReason(field),
    }];
  }
  if (!field.value) {
    return [{
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      reason: `${field.officialFieldLabel} is not present in the safe draft payload.`,
    }];
  }

  return [];
}

function buildAssignment(field: NameChangeFormPopulationFieldMapping): NameChangePopulationDraftAssignment | null {
  if (field.mappingStatus !== 'mapped' || !field.adapterFieldName || field.redactionPolicy !== 'none' || !field.value) {
    return null;
  }

  return {
    fieldKey: field.fieldKey,
    officialFieldLabel: field.officialFieldLabel,
    pdfFieldName: field.adapterFieldName,
    value: field.value,
    source: 'saved_value',
    redactionPolicy: field.redactionPolicy,
  };
}

function getStatusLabel(status: NameChangePopulationDraftItemStatus) {
  if (status === 'ready') return 'Draft payload ready';
  if (status === 'guided_online') return 'Guided online';
  return 'Blocked';
}

function getNextAction(status: NameChangePopulationDraftItemStatus, blockers: NameChangePopulationDraftBlocker[]) {
  if (status === 'ready') return 'Send these PDF field assignments to a review-only PDF filler, then require user review before signing or submitting.';
  if (status === 'guided_online') return 'Use the population plan as copy guidance while the user completes the official agency flow.';
  return blockers[0]?.reason ?? 'Resolve population blockers before generating a draft payload.';
}

export function buildNameChangePopulationDraftPlan(
  populationPlan: NameChangeFormPopulationPlan,
): NameChangePopulationDraftPlan {
  const items = populationPlan.items.map((item) => {
    if (item.adapterKind === 'guided_online_entry') {
      return {
        formCode: item.formCode,
        formLabel: item.formLabel,
        officialRevisionLabel: item.officialRevisionLabel,
        status: 'guided_online' as const,
        statusLabel: getStatusLabel('guided_online'),
        assignments: [],
        blockers: [],
        nextAction: getNextAction('guided_online', []),
      };
    }

    const assignments = item.fieldMappings
      .map(buildAssignment)
      .filter((assignment): assignment is NameChangePopulationDraftAssignment => Boolean(assignment));
    const fieldBlockers = item.fieldMappings.flatMap(buildFieldBlockers);
    const itemBlockers = item.status === 'ready_for_population' ? [] : item.blockers.map((reason) => ({
      fieldKey: item.formCode,
      officialFieldLabel: item.formLabel,
      reason,
    }));
    const blockers = [...itemBlockers, ...fieldBlockers];
    const status: NameChangePopulationDraftItemStatus = blockers.length === 0 ? 'ready' : 'blocked';

    return {
      formCode: item.formCode,
      formLabel: item.formLabel,
      officialRevisionLabel: item.officialRevisionLabel,
      status,
      statusLabel: getStatusLabel(status),
      assignments,
      blockers,
      nextAction: getNextAction(status, blockers),
    };
  });
  const summary = {
    totalForms: items.length,
    readyDrafts: items.filter((item) => item.status === 'ready').length,
    blockedDrafts: items.filter((item) => item.status === 'blocked').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    assignments: items.reduce((sum, item) => sum + item.assignments.length, 0),
    blockedFields: items.reduce((sum, item) => sum + item.blockers.length, 0),
  };
  const primaryAction = summary.blockedDrafts > 0
    ? 'Resolve blocked fields before generating filled review drafts.'
    : summary.readyDrafts > 0
      ? 'Generate review-only PDF draft payloads and require user review before signing or submitting.'
      : 'Use guided online entry for the current agency flows.';

  return {
    items,
    draftPayloadJson: JSON.stringify({
      reviewOnly: true,
      safePayload: true,
      summary,
      items,
    }, null, 2),
    primaryAction,
    summary,
  };
}
