import type { NameChangePdfAdapterCatalog, NameChangePdfAdapterFieldMapping } from './formPdfAdapterMap';
import type { NameChangeFormPopulationFieldMapping, NameChangeFormPopulationPlan, NameChangeFormPopulationPlanItem, NameChangeFormPopulationPlanItemStatus } from './formPopulationPlan';

export interface NameChangePopulationCatalogApplyPlan {
  populationPlan: NameChangeFormPopulationPlan;
  populationPayloadJson: string;
  summary: NameChangeFormPopulationPlan['summary'] & {
    appliedMappings: number;
    unmappedFields: number;
  };
}

function getStatusLabel(status: NameChangeFormPopulationPlanItemStatus) {
  if (status === 'needs_input') return 'Needs info';
  if (status === 'needs_secure_session') return 'Needs secure session';
  if (status === 'needs_adapter_mapping') return 'Needs PDF mapping';
  if (status === 'guided_online') return 'Guided online';
  return 'Ready for population';
}

function getMappedFieldNote(field: NameChangeFormPopulationFieldMapping, mapping: NameChangePdfAdapterFieldMapping) {
  const confidenceLabel = mapping.confidence === 'verified_probe' ? 'verified by PDF probe' : 'needs manual review';
  return [
    `${field.officialFieldLabel} is mapped to PDF field ${mapping.pdfFieldName} (${confidenceLabel}).`,
    mapping.note,
  ].filter((line): line is string => Boolean(line)).join(' ');
}

function findAdapterMapping(
  catalog: NameChangePdfAdapterCatalog,
  item: NameChangeFormPopulationPlanItem,
  field: NameChangeFormPopulationFieldMapping,
) {
  const adapter = catalog.adapters.find((entry) => (
    entry.formCode === item.formCode
    && entry.officialRevisionLabel === item.officialRevisionLabel
  ));

  return adapter?.fieldMappings.find((mapping) => mapping.fieldKey === field.fieldKey) ?? null;
}

function applyFieldMapping(
  item: NameChangeFormPopulationPlanItem,
  field: NameChangeFormPopulationFieldMapping,
  catalog: NameChangePdfAdapterCatalog,
) {
  if (field.mappingStatus === 'blocked' || item.adapterKind !== 'official_pdf_fill') {
    return {
      field,
      applied: false,
    };
  }

  const mapping = findAdapterMapping(catalog, item, field);
  if (!mapping) {
    return {
      field,
      applied: false,
    };
  }

  return {
    field: {
      ...field,
      adapterFieldName: mapping.pdfFieldName,
      adapterMappingConfidence: mapping.confidence,
      mappingStatus: 'mapped' as const,
      note: getMappedFieldNote(field, mapping),
    },
    applied: field.mappingStatus !== 'mapped' || field.adapterFieldName !== mapping.pdfFieldName,
  };
}

function getItemStatus(item: NameChangeFormPopulationPlanItem, fieldMappings: NameChangeFormPopulationFieldMapping[]): NameChangeFormPopulationPlanItemStatus {
  if (item.status === 'needs_input' || item.status === 'needs_secure_session' || item.status === 'guided_online') {
    return item.status;
  }
  if (fieldMappings.some((field) => field.mappingStatus === 'needs_pdf_field_probe')) return 'needs_adapter_mapping';
  if (fieldMappings.some((field) => field.mappingStatus === 'blocked')) return 'needs_input';
  return 'ready_for_population';
}

function getNextAction(item: NameChangeFormPopulationPlanItem, status: NameChangeFormPopulationPlanItemStatus, fieldMappings: NameChangeFormPopulationFieldMapping[]) {
  if (status === 'needs_input') return item.blockers[0] ?? 'Collect missing user information before population.';
  if (status === 'needs_secure_session') return item.nextAction;
  if (status === 'guided_online') return 'Use the fill payload as copy guidance while the user completes the official online flow.';
  if (status === 'needs_adapter_mapping') {
    const firstUnmappedField = fieldMappings.find((field) => field.mappingStatus === 'needs_pdf_field_probe');
    return firstUnmappedField
      ? `Map ${firstUnmappedField.officialFieldLabel} to an official PDF field name before generating a filled draft.`
      : 'Review the official source/version before enabling a production population adapter.';
  }

  return 'Generate a review-only draft, then require the user to inspect, sign, and submit through official instructions.';
}

function getPrimaryAction(summary: NameChangeFormPopulationPlan['summary']) {
  if (summary.needsInput > 0) return 'Collect the missing user information first, then refresh the population plan.';
  if (summary.needsSecureSession > 0) return 'Collect secure-session-only values before generating review drafts.';
  if (summary.needsAdapterMapping > 0) return 'Probe official PDF field names for the PDF candidates before generating filled PDFs.';
  if (summary.guidedOnline > 0) return 'Use guided online copy support for agency flows that do not expose a production PDF path.';
  return 'Generate review-only draft outputs and require user review before submission.';
}

export function applyNameChangePdfAdapterCatalogToPopulationPlan(
  populationPlan: NameChangeFormPopulationPlan,
  catalog: NameChangePdfAdapterCatalog,
): NameChangePopulationCatalogApplyPlan {
  let appliedMappings = 0;
  const items = populationPlan.items.map((item) => {
    const mappedFields = item.fieldMappings.map((field) => {
      const result = applyFieldMapping(item, field, catalog);
      if (result.applied) appliedMappings += 1;
      return result.field;
    });
    const status = getItemStatus(item, mappedFields);

    return {
      ...item,
      status,
      statusLabel: getStatusLabel(status),
      nextAction: getNextAction(item, status, mappedFields),
      fieldMappings: mappedFields,
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
  const appliedSummary = {
    ...summary,
    appliedMappings,
    unmappedFields: items.reduce((sum, item) => (
      sum + item.fieldMappings.filter((field) => field.mappingStatus === 'needs_pdf_field_probe').length
    ), 0),
  };
  const refreshedPlan = {
    items,
    populationPayloadJson: JSON.stringify({ reviewOnly: true, items }, null, 2),
    primaryAction: getPrimaryAction(summary),
    summary,
  };

  return {
    populationPlan: refreshedPlan,
    populationPayloadJson: refreshedPlan.populationPayloadJson,
    summary: appliedSummary,
  };
}
