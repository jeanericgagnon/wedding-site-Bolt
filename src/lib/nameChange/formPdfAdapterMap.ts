export type NameChangePdfAdapterFieldMappingConfidence = 'verified_probe' | 'manual_review';

export interface NameChangePdfAdapterFieldMapping {
  fieldKey: string;
  pdfFieldName: string;
  confidence: NameChangePdfAdapterFieldMappingConfidence;
  note?: string;
  reviewAudit?: {
    visualReviewConfirmed: boolean;
    reviewedAt: string;
    reviewerNote?: string | null;
  };
}

export interface NameChangePdfAdapterDefinition {
  formCode: string;
  officialRevisionLabel: string;
  probeSourceLabel: string;
  lastMappedAt: string;
  fieldMappings: NameChangePdfAdapterFieldMapping[];
  unmappedPdfFieldNames?: string[];
}

export interface NameChangePdfAdapterCatalog {
  adapters: NameChangePdfAdapterDefinition[];
  adapterMapPayloadJson: string;
  summary: {
    totalAdapters: number;
    mappedFields: number;
    fieldsNeedingReview: number;
    unmappedPdfFields: number;
  };
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeFieldMappings(fieldMappings: NameChangePdfAdapterFieldMapping[]) {
  const seen = new Set<string>();

  return fieldMappings.filter((mapping) => {
    if (!mapping.fieldKey || !mapping.pdfFieldName) return false;
    if (seen.has(mapping.fieldKey)) return false;
    seen.add(mapping.fieldKey);
    return true;
  });
}

export function buildNameChangePdfAdapterCatalog(
  adapters: NameChangePdfAdapterDefinition[],
): NameChangePdfAdapterCatalog {
  const normalizedAdapters = adapters.map((adapter) => ({
    ...adapter,
    fieldMappings: normalizeFieldMappings(adapter.fieldMappings),
    unmappedPdfFieldNames: uniq(adapter.unmappedPdfFieldNames ?? []),
  }));
  const summary = {
    totalAdapters: normalizedAdapters.length,
    mappedFields: normalizedAdapters.reduce((sum, adapter) => sum + adapter.fieldMappings.length, 0),
    fieldsNeedingReview: normalizedAdapters.reduce(
      (sum, adapter) => sum + adapter.fieldMappings.filter((mapping) => mapping.confidence === 'manual_review').length,
      0,
    ),
    unmappedPdfFields: normalizedAdapters.reduce((sum, adapter) => sum + (adapter.unmappedPdfFieldNames?.length ?? 0), 0),
  };

  return {
    adapters: normalizedAdapters,
    adapterMapPayloadJson: JSON.stringify({
      reviewOnly: true,
      summary,
      adapters: normalizedAdapters,
    }, null, 2),
    summary,
  };
}

export function findNameChangePdfAdapterFieldMapping(
  catalog: NameChangePdfAdapterCatalog | undefined,
  formCode: string,
  officialRevisionLabel: string,
  fieldKey: string,
) {
  const adapter = catalog?.adapters.find((entry) => (
    entry.formCode === formCode
    && entry.officialRevisionLabel === officialRevisionLabel
  ));

  return adapter?.fieldMappings.find((mapping) => mapping.fieldKey === fieldKey) ?? null;
}
