import type { NameChangeFormCompanionFillPayload, NameChangeFormCompanionFillPayloadField, NameChangeFormCompanionPacket } from './formCompanionPacket';
import { findNameChangePdfAdapterFieldMapping } from './formPdfAdapterMap';
import type { NameChangePdfAdapterCatalog, NameChangePdfAdapterFieldMapping } from './formPdfAdapterMap';
import type { NameChangeSupplementalIntakePlan, NameChangeSupplementalIntakePrompt } from './formSupplementalIntake';

export type NameChangeFormPopulationAdapterKind = 'official_pdf_fill' | 'guided_online_entry';
export type NameChangeFormPopulationMappingStatus = 'mapped' | 'needs_pdf_field_probe' | 'guided_online_only' | 'blocked';
export type NameChangeFormPopulationPlanItemStatus = 'needs_input' | 'needs_secure_session' | 'needs_adapter_mapping' | 'guided_online' | 'ready_for_population';
export type NameChangeFormPopulationFieldSource = 'companion_payload' | 'supplemental_intake';
export type NameChangeFormPopulationValueStatus = NameChangeFormCompanionFillPayloadField['status'] | NameChangeSupplementalIntakePrompt['status'];
export type NameChangeFormPopulationRedactionPolicy = 'none' | 'requires_consent' | 'requires_secure_session';

export interface NameChangeFormPopulationFieldMapping {
  fieldKey: string;
  officialFieldLabel: string;
  source: NameChangeFormPopulationFieldSource;
  adapterFieldName: string | null;
  adapterMappingConfidence?: NameChangePdfAdapterFieldMapping['confidence'];
  mappingStatus: NameChangeFormPopulationMappingStatus;
  value: string | null;
  hasValue: boolean;
  valueStatus: NameChangeFormPopulationValueStatus;
  sensitivity?: NameChangeSupplementalIntakePrompt['sensitivity'];
  redactionPolicy: NameChangeFormPopulationRedactionPolicy;
  note: string;
}

export interface NameChangeFormPopulationPlanItem {
  formCode: string;
  formLabel: string;
  officialUrl: string;
  officialRevisionLabel: string;
  adapterKind: NameChangeFormPopulationAdapterKind;
  status: NameChangeFormPopulationPlanItemStatus;
  statusLabel: string;
  nextAction: string;
  blockers: string[];
  fieldMappings: NameChangeFormPopulationFieldMapping[];
}

export interface NameChangeFormPopulationPlan {
  items: NameChangeFormPopulationPlanItem[];
  populationPayloadJson: string;
  primaryAction: string;
  summary: {
    totalForms: number;
    readyForPopulation: number;
    needsAdapterMapping: number;
    guidedOnline: number;
    needsInput: number;
    needsSecureSession: number;
    pdfFillCandidates: number;
  };
}

interface NameChangeFormPopulationAdapterDefinition {
  formCode: string;
  adapterKind: NameChangeFormPopulationAdapterKind;
  mappingStatus: NameChangeFormPopulationMappingStatus;
  fieldNotes: Record<string, string>;
}

const PDF_FIELD_PROBE_NOTE = 'Official PDF field names still need to be probed before DayOf can generate a production fillable PDF.';
const GUIDED_ONLINE_NOTE = 'This flow stays guided online because the official agency flow must be completed on the agency site.';

export const NAME_CHANGE_FORM_POPULATION_ADAPTERS: Record<string, NameChangeFormPopulationAdapterDefinition> = {
  'SSA-SS5': {
    formCode: 'SSA-SS5',
    adapterKind: 'official_pdf_fill',
    mappingStatus: 'needs_pdf_field_probe',
    fieldNotes: {},
  },
  'DS-11': {
    formCode: 'DS-11',
    adapterKind: 'official_pdf_fill',
    mappingStatus: 'needs_pdf_field_probe',
    fieldNotes: {
      'applicant.newLastName': 'DS-11 may ask for other names used and current legal name in separate areas, so this mapping needs PDF field confirmation.',
    },
  },
  'DS-82': {
    formCode: 'DS-82',
    adapterKind: 'official_pdf_fill',
    mappingStatus: 'needs_pdf_field_probe',
    fieldNotes: {
      'identity.passportIssueDate': 'Use this to confirm renewal/correction eligibility and map to the passport-book issue-date field after PDF probing.',
    },
  },
  'DS-5504': {
    formCode: 'DS-5504',
    adapterKind: 'official_pdf_fill',
    mappingStatus: 'needs_pdf_field_probe',
    fieldNotes: {
      'identity.passportIssueDate': 'This determines whether the recent-name-change correction path fits, then needs PDF field confirmation.',
    },
  },
  'CA-DL-44': {
    formCode: 'CA-DL-44',
    adapterKind: 'guided_online_entry',
    mappingStatus: 'guided_online_only',
    fieldNotes: {
      'legal.marriageCertificateNumber': 'Use only if the DMV online flow or field-office employee requests the certified record number.',
    },
  },
};

function getAdapterDefinition(formCode: string): NameChangeFormPopulationAdapterDefinition {
  return NAME_CHANGE_FORM_POPULATION_ADAPTERS[formCode] ?? {
    formCode,
    adapterKind: 'official_pdf_fill',
    mappingStatus: 'needs_pdf_field_probe',
    fieldNotes: {},
  };
}

function getFieldMappingNote(definition: NameChangeFormPopulationAdapterDefinition, field: NameChangeFormCompanionFillPayloadField) {
  if (field.status === 'missing') return `${field.officialFieldLabel} needs a user value before any population adapter can use it.`;
  if (definition.fieldNotes[field.fieldKey]) return definition.fieldNotes[field.fieldKey];
  if (definition.mappingStatus === 'guided_online_only') return GUIDED_ONLINE_NOTE;
  return PDF_FIELD_PROBE_NOTE;
}

function getMappedFieldNote(
  officialFieldLabel: string,
  mapping: NameChangePdfAdapterFieldMapping | null,
) {
  if (!mapping) return null;
  const confidenceLabel = mapping.confidence === 'verified_probe' ? 'verified by PDF probe' : 'needs manual review';
  return [
    `${officialFieldLabel} is mapped to PDF field ${mapping.pdfFieldName} (${confidenceLabel}).`,
    mapping.note,
  ].filter((line): line is string => Boolean(line)).join(' ');
}

function getSupplementalFieldMappingNote(
  definition: NameChangeFormPopulationAdapterDefinition,
  prompt: NameChangeSupplementalIntakePrompt,
) {
  if (prompt.status === 'missing') return `${prompt.label} needs a user value before this form can be populated.`;
  if (prompt.status === 'secure_session_required') return `${prompt.label} must be collected in a secure session and should not be stored in the normal planner.`;
  if (definition.mappingStatus === 'guided_online_only') return GUIDED_ONLINE_NOTE;
  return PDF_FIELD_PROBE_NOTE;
}

function getPlanItemStatus(
  payload: NameChangeFormCompanionFillPayload,
  definition: NameChangeFormPopulationAdapterDefinition,
  supplementalPrompts: NameChangeSupplementalIntakePrompt[],
  fieldMappings: NameChangeFormPopulationFieldMapping[],
): NameChangeFormPopulationPlanItemStatus {
  if (payload.adapterStatus === 'needs_user_input') return 'needs_input';
  if (supplementalPrompts.some((prompt) => prompt.status === 'missing')) return 'needs_input';
  if (supplementalPrompts.some((prompt) => prompt.status === 'secure_session_required')) return 'needs_secure_session';
  if (definition.mappingStatus === 'guided_online_only') return 'guided_online';
  if (payload.adapterStatus === 'needs_source_review') return 'needs_adapter_mapping';
  if (fieldMappings.some((field) => field.mappingStatus === 'needs_pdf_field_probe')) return 'needs_adapter_mapping';
  return 'ready_for_population';
}

function getStatusLabel(status: NameChangeFormPopulationPlanItemStatus) {
  if (status === 'needs_input') return 'Needs info';
  if (status === 'needs_secure_session') return 'Needs secure session';
  if (status === 'needs_adapter_mapping') return 'Needs PDF mapping';
  if (status === 'guided_online') return 'Guided online';
  return 'Ready for population';
}

function getNextAction(
  status: NameChangeFormPopulationPlanItemStatus,
  payload: NameChangeFormCompanionFillPayload,
  definition: NameChangeFormPopulationAdapterDefinition,
  supplementalPrompts: NameChangeSupplementalIntakePrompt[],
  fieldMappings: NameChangeFormPopulationFieldMapping[],
) {
  if (status === 'needs_input') return payload.blockers[0] ?? 'Collect missing user information before population.';
  if (status === 'needs_secure_session') {
    const securePrompt = supplementalPrompts.find((prompt) => prompt.status === 'secure_session_required');
    return securePrompt ? `Collect ${securePrompt.label.toLowerCase()} in a secure form session before generating drafts.` : 'Collect secure-session values before generating drafts.';
  }
  if (status === 'guided_online') return 'Use the fill payload as copy guidance while the user completes the official online flow.';
  if (status === 'needs_adapter_mapping') {
    const firstUnmappedField = fieldMappings.find((field) => field.mappingStatus === 'needs_pdf_field_probe');
    if (firstUnmappedField) return `Map ${firstUnmappedField.officialFieldLabel} to an official PDF field name before generating a filled draft.`;
    return 'Review the official source/version before enabling a production population adapter.';
  }

  return 'Generate a review-only draft, then require the user to inspect, sign, and submit through official instructions.';
}

function buildFieldMappings(
  payload: NameChangeFormCompanionFillPayload,
  definition: NameChangeFormPopulationAdapterDefinition,
  pdfAdapterCatalog?: NameChangePdfAdapterCatalog,
): NameChangeFormPopulationFieldMapping[] {
  return payload.fields.map((field) => {
    const pdfMapping = definition.adapterKind === 'official_pdf_fill'
      ? findNameChangePdfAdapterFieldMapping(pdfAdapterCatalog, payload.formCode, payload.officialRevisionLabel, field.fieldKey)
      : null;
    const mappedNote = getMappedFieldNote(field.officialFieldLabel, pdfMapping);

    return {
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      source: 'companion_payload' as const,
      adapterFieldName: pdfMapping?.pdfFieldName ?? null,
      adapterMappingConfidence: pdfMapping?.confidence,
      mappingStatus: field.status === 'missing' ? 'blocked' as const : pdfMapping ? 'mapped' as const : definition.mappingStatus,
      value: field.value,
      hasValue: Boolean(field.value),
      valueStatus: field.status,
      redactionPolicy: 'none' as const,
      note: mappedNote ?? getFieldMappingNote(definition, field),
    };
  });
}

function getSupplementalRedactionPolicy(prompt: NameChangeSupplementalIntakePrompt): NameChangeFormPopulationRedactionPolicy {
  if (prompt.sensitivity === 'secure_session_only') return 'requires_secure_session';
  if (prompt.sensitivity === 'sensitive') return 'requires_consent';
  return 'none';
}

function getSupplementalExportValue(prompt: NameChangeSupplementalIntakePrompt) {
  return getSupplementalRedactionPolicy(prompt) === 'none' ? prompt.currentValueLabel : null;
}

function buildSupplementalFieldMappings(
  supplementalPrompts: NameChangeSupplementalIntakePrompt[],
  definition: NameChangeFormPopulationAdapterDefinition,
  payload: NameChangeFormCompanionFillPayload,
  pdfAdapterCatalog?: NameChangePdfAdapterCatalog,
): NameChangeFormPopulationFieldMapping[] {
  return supplementalPrompts.map((prompt) => {
    const fieldKey = `supplemental.${prompt.promptKey}`;
    const pdfMapping = definition.adapterKind === 'official_pdf_fill'
      ? findNameChangePdfAdapterFieldMapping(pdfAdapterCatalog, payload.formCode, payload.officialRevisionLabel, fieldKey)
      : null;
    const mappedNote = getMappedFieldNote(prompt.label, pdfMapping);

    return {
      fieldKey,
      officialFieldLabel: prompt.label,
      source: 'supplemental_intake' as const,
      adapterFieldName: pdfMapping?.pdfFieldName ?? null,
      adapterMappingConfidence: pdfMapping?.confidence,
      mappingStatus: prompt.status === 'available' ? pdfMapping ? 'mapped' as const : definition.mappingStatus : 'blocked' as const,
      value: getSupplementalExportValue(prompt),
      hasValue: Boolean(prompt.currentValueLabel),
      valueStatus: prompt.status,
      sensitivity: prompt.sensitivity,
      redactionPolicy: getSupplementalRedactionPolicy(prompt),
      note: mappedNote ?? getSupplementalFieldMappingNote(definition, prompt),
    };
  });
}

export function buildNameChangeFormPopulationPlan(
  packet: NameChangeFormCompanionPacket,
  supplementalIntakePlan?: NameChangeSupplementalIntakePlan,
  pdfAdapterCatalog?: NameChangePdfAdapterCatalog,
): NameChangeFormPopulationPlan {
  const items = packet.fillPayloads.map((payload) => {
    const definition = getAdapterDefinition(payload.formCode);
    const supplementalPrompts = supplementalIntakePlan?.prompts.filter((prompt) => prompt.formCodes.includes(payload.formCode)) ?? [];
    const fieldMappings = [
      ...buildFieldMappings(payload, definition, pdfAdapterCatalog),
      ...buildSupplementalFieldMappings(supplementalPrompts, definition, payload, pdfAdapterCatalog),
    ];
    const status = getPlanItemStatus(payload, definition, supplementalPrompts, fieldMappings);
    const mappingBlockers = fieldMappings
      .filter((field) => field.source === 'companion_payload' && field.mappingStatus === 'blocked')
      .map((field) => `${field.officialFieldLabel} is missing.`);
    const supplementalBlockers = supplementalPrompts
      .filter((prompt) => prompt.status !== 'available')
      .map((prompt) => (
        prompt.status === 'secure_session_required'
          ? `${prompt.label} requires a secure form session.`
          : `${prompt.label} is missing from supplemental intake.`
      ));
    const blockers = [...payload.blockers, ...mappingBlockers, ...supplementalBlockers].filter((value, index, all) => all.indexOf(value) === index);

    return {
      formCode: payload.formCode,
      formLabel: payload.formLabel,
      officialUrl: payload.officialUrl,
      officialRevisionLabel: payload.officialRevisionLabel,
      adapterKind: definition.adapterKind,
      status,
      statusLabel: getStatusLabel(status),
      nextAction: getNextAction(status, payload, definition, supplementalPrompts, fieldMappings),
      blockers,
      fieldMappings,
    };
  });
  const summary = {
    totalForms: items.length,
    readyForPopulation: items.filter((item) => item.status === 'ready_for_population').length,
    needsAdapterMapping: items.filter((item) => item.status === 'needs_adapter_mapping').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    needsInput: items.filter((item) => item.status === 'needs_input').length,
    needsSecureSession: items.filter((item) => item.status === 'needs_secure_session').length,
    pdfFillCandidates: items.filter((item) => item.adapterKind === 'official_pdf_fill').length,
  };
  const primaryAction = summary.needsInput > 0
    ? 'Collect the missing user information first, then refresh the population plan.'
    : summary.needsSecureSession > 0
      ? 'Collect secure-session-only values before generating review drafts.'
    : summary.needsAdapterMapping > 0
      ? 'Probe official PDF field names for the PDF candidates before generating filled PDFs.'
      : summary.guidedOnline > 0
        ? 'Use guided online copy support for agency flows that do not expose a production PDF path.'
        : 'Generate review-only draft outputs and require user review before submission.';

  return {
    items,
    populationPayloadJson: JSON.stringify({ reviewOnly: true, items }, null, 2),
    primaryAction,
    summary,
  };
}
