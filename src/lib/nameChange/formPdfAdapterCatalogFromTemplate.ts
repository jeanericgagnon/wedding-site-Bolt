import { buildNameChangePdfAdapterCatalog, type NameChangePdfAdapterCatalog, type NameChangePdfAdapterDefinition } from './formPdfAdapterMap';
import type { NameChangePdfAdapterTemplateField, NameChangePdfAdapterTemplateItem, NameChangePdfAdapterTemplatePlan } from './formPdfAdapterTemplate';

export interface NameChangePdfAdapterCatalogIssue {
  formCode: string;
  fieldKey?: string;
  reason: string;
}

export interface NameChangePdfAdapterCatalogFromTemplatePlan {
  catalog: NameChangePdfAdapterCatalog;
  catalogPayloadJson: string;
  issues: NameChangePdfAdapterCatalogIssue[];
  primaryAction: string;
  summary: {
    reviewedForms: number;
    catalogAdapters: number;
    mappedFields: number;
    issues: number;
  };
}

function getKnownPdfFieldNames(field: NameChangePdfAdapterTemplateField, item: NameChangePdfAdapterTemplateItem) {
  return new Set([
    ...field.candidatePdfFields.map((candidate) => candidate.pdfFieldName),
    ...item.unmappedPdfFieldNames,
  ]);
}

function isReviewDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getFieldIssue(
  field: NameChangePdfAdapterTemplateField,
  item: NameChangePdfAdapterTemplateItem,
): NameChangePdfAdapterCatalogIssue | null {
  if (!field.selectedPdfFieldName) {
    return {
      formCode: item.formCode,
      fieldKey: field.fieldKey,
      reason: `${field.officialFieldLabel} needs a selected PDF field name.`,
    };
  }

  if (!getKnownPdfFieldNames(field, item).has(field.selectedPdfFieldName)) {
    return {
      formCode: item.formCode,
      fieldKey: field.fieldKey,
      reason: `${field.officialFieldLabel} is mapped to ${field.selectedPdfFieldName}, which was not present in the PDF probe output.`,
    };
  }

  if (field.visualReviewConfirmed !== true) {
    return {
      formCode: item.formCode,
      fieldKey: field.fieldKey,
      reason: `${field.officialFieldLabel} must be visually confirmed against the official PDF before catalog promotion.`,
    };
  }

  if (!isReviewDate(field.reviewedAt)) {
    return {
      formCode: item.formCode,
      fieldKey: field.fieldKey,
      reason: `${field.officialFieldLabel} needs reviewedAt in YYYY-MM-DD format before catalog promotion.`,
    };
  }

  return null;
}

function getDuplicateFieldIssues(item: NameChangePdfAdapterTemplateItem): NameChangePdfAdapterCatalogIssue[] {
  const fieldsBySelectedName = new Map<string, NameChangePdfAdapterTemplateField[]>();

  item.fields.forEach((field) => {
    if (!field.selectedPdfFieldName) return;
    const fields = fieldsBySelectedName.get(field.selectedPdfFieldName) ?? [];
    fields.push(field);
    fieldsBySelectedName.set(field.selectedPdfFieldName, fields);
  });

  return Array.from(fieldsBySelectedName.entries()).flatMap(([selectedPdfFieldName, fields]) => {
    if (fields.length < 2) return [];

    return [{
      formCode: item.formCode,
      fieldKey: fields.map((field) => field.fieldKey).join(', '),
      reason: `${selectedPdfFieldName} is selected for multiple DayOf fields: ${fields.map((field) => field.officialFieldLabel).join(', ')}.`,
    }];
  });
}

function getTemplateIssues(reviewedItems: NameChangePdfAdapterTemplateItem[]) {
  return reviewedItems.flatMap((item) => [
    ...item.fields
      .map((field) => getFieldIssue(field, item))
      .filter((issue): issue is NameChangePdfAdapterCatalogIssue => Boolean(issue)),
    ...getDuplicateFieldIssues(item),
  ]);
}

function buildAdapterDefinition(
  item: NameChangePdfAdapterTemplateItem,
  lastMappedAt: string,
): NameChangePdfAdapterDefinition {
  return {
    formCode: item.formCode,
    officialRevisionLabel: item.officialRevisionLabel,
    probeSourceLabel: item.probeSourceLabel,
    lastMappedAt,
    fieldMappings: item.fields
      .filter((field) => field.selectedPdfFieldName)
      .map((field) => ({
        fieldKey: field.fieldKey,
        pdfFieldName: field.selectedPdfFieldName ?? '',
        confidence: field.mappingConfidence,
        reviewAudit: {
          visualReviewConfirmed: field.visualReviewConfirmed === true,
          reviewedAt: field.reviewedAt ?? '',
          reviewerNote: field.reviewerNote ?? null,
        },
        note: `Visually confirmed mapping for ${field.officialFieldLabel} on ${field.reviewedAt}. ${field.note}`,
      })),
    unmappedPdfFieldNames: item.unmappedPdfFieldNames,
  };
}

export function buildNameChangePdfAdapterCatalogFromTemplate(
  templatePlan: NameChangePdfAdapterTemplatePlan,
  lastMappedAt: string,
): NameChangePdfAdapterCatalogFromTemplatePlan {
  const reviewedItems = templatePlan.items.filter((item) => item.status === 'ready_for_review');
  const issues = getTemplateIssues(reviewedItems);
  const adapterDefinitions = issues.length === 0
    ? reviewedItems.map((item) => buildAdapterDefinition(item, lastMappedAt))
    : [];
  const catalog = buildNameChangePdfAdapterCatalog(adapterDefinitions);
  const summary = {
    reviewedForms: reviewedItems.length,
    catalogAdapters: catalog.summary.totalAdapters,
    mappedFields: catalog.summary.mappedFields,
    issues: issues.length,
  };
  const primaryAction = issues.length > 0
    ? 'Resolve selected PDF field issues before saving an adapter catalog.'
    : summary.catalogAdapters > 0
      ? 'Save this adapter catalog and pass it into population readiness for mapped PDF draft generation.'
      : 'No reviewed PDF mappings are ready to promote.';

  return {
    catalog,
    catalogPayloadJson: JSON.stringify({
      reviewOnly: true,
      summary,
      issues,
      adapters: catalog.adapters,
    }, null, 2),
    issues,
    primaryAction,
    summary,
  };
}
