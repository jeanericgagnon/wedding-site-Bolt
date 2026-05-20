import type { NameChangeFormPopulationFieldMapping, NameChangeFormPopulationPlan } from './formPopulationPlan';

export interface NameChangePdfProbeResult {
  formCode: string;
  filePath?: string;
  fieldCount: number;
  fieldNames: string[];
  probeStatus: 'raw_fields_found' | 'needs_pdf_field_inspector' | 'probe_failed' | string;
  note?: string;
}

export interface NameChangePdfAdapterTemplateCandidate {
  pdfFieldName: string;
  score: number;
  reasons: string[];
}

export interface NameChangePdfAdapterTemplateField {
  fieldKey: string;
  officialFieldLabel: string;
  source: NameChangeFormPopulationFieldMapping['source'];
  redactionPolicy: NameChangeFormPopulationFieldMapping['redactionPolicy'];
  valueStatus: NameChangeFormPopulationFieldMapping['valueStatus'];
  selectedPdfFieldName: string | null;
  visualReviewConfirmed?: boolean;
  reviewedAt?: string | null;
  reviewerNote?: string | null;
  mappingConfidence: 'manual_review';
  candidatePdfFields: NameChangePdfAdapterTemplateCandidate[];
  note: string;
}

export interface NameChangePdfAdapterTemplateItem {
  formCode: string;
  formLabel: string;
  officialRevisionLabel: string;
  probeStatus: NameChangePdfProbeResult['probeStatus'];
  probeSourceLabel: string;
  status: 'ready_for_review' | 'needs_pdf_probe' | 'guided_online';
  statusLabel: string;
  nextAction: string;
  fields: NameChangePdfAdapterTemplateField[];
  unmappedPdfFieldNames: string[];
}

export interface NameChangePdfAdapterTemplatePlan {
  items: NameChangePdfAdapterTemplateItem[];
  templatePayloadJson: string;
  primaryAction: string;
  summary: {
    totalForms: number;
    readyForReview: number;
    needsPdfProbe: number;
    guidedOnline: number;
    fieldsToMap: number;
    candidateMatches: number;
  };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function splitTokens(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function getAliasTokens(field: NameChangeFormPopulationFieldMapping) {
  const key = field.fieldKey.toLowerCase();
  const label = field.officialFieldLabel.toLowerCase();
  const aliases: string[] = [];

  if (key.includes('dateofbirth') || label.includes('date of birth')) aliases.push('dob', 'birth');
  if (key.includes('socialsecurity') || label.includes('social security')) aliases.push('ssn', 'social', 'security');
  if (key.includes('firstname') || label.includes('first name')) aliases.push('first', 'given');
  if (key.includes('middlename') || label.includes('middle name')) aliases.push('middle');
  if (key.includes('lastname') || label.includes('last name')) aliases.push('last', 'surname', 'family');
  if (key.includes('address') || label.includes('address')) aliases.push('address', 'street', 'city', 'state', 'zip');
  if (key.includes('phone') || label.includes('phone')) aliases.push('phone', 'telephone');
  if (key.includes('email') || label.includes('email')) aliases.push('email');
  if (key.includes('passport')) aliases.push('passport');
  if (key.includes('marriage')) aliases.push('marriage');

  return aliases;
}

function scoreCandidate(field: NameChangeFormPopulationFieldMapping, pdfFieldName: string): NameChangePdfAdapterTemplateCandidate | null {
  const fieldKey = field.fieldKey;
  const label = field.officialFieldLabel;
  const normalizedPdf = normalize(pdfFieldName);
  const normalizedLabel = normalize(label);
  const fieldKeyTail = normalize(fieldKey.split('.').at(-1) ?? fieldKey);
  const tokens = Array.from(new Set([
    ...splitTokens(fieldKey),
    ...splitTokens(label),
    ...getAliasTokens(field),
  ]));
  const reasons: string[] = [];
  let score = 0;

  if (normalizedPdf && normalizedLabel && (normalizedPdf.includes(normalizedLabel) || normalizedLabel.includes(normalizedPdf))) {
    score += 45;
    reasons.push('label overlap');
  }
  if (fieldKeyTail && normalizedPdf.includes(fieldKeyTail)) {
    score += 30;
    reasons.push('field key overlap');
  }

  tokens.forEach((token) => {
    const normalizedToken = normalize(token);
    if (!normalizedToken || !normalizedPdf.includes(normalizedToken)) return;
    score += 10;
    reasons.push(`${token} token`);
  });

  if (score === 0) return null;

  return {
    pdfFieldName,
    score,
    reasons: Array.from(new Set(reasons)),
  };
}

function getCandidates(field: NameChangeFormPopulationFieldMapping, fieldNames: string[]) {
  return fieldNames
    .map((fieldName) => scoreCandidate(field, fieldName))
    .filter((candidate): candidate is NameChangePdfAdapterTemplateCandidate => Boolean(candidate))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.pdfFieldName.localeCompare(right.pdfFieldName);
    })
    .slice(0, 5);
}

function getProbeSourceLabel(probe: NameChangePdfProbeResult | undefined) {
  if (!probe) return 'No PDF probe result supplied';
  return probe.filePath ? `PDF probe: ${probe.filePath}` : `PDF probe for ${probe.formCode}`;
}

function getStatusLabel(status: NameChangePdfAdapterTemplateItem['status']) {
  if (status === 'ready_for_review') return 'Ready for review';
  if (status === 'guided_online') return 'Guided online';
  return 'Needs PDF probe';
}

function getNextAction(status: NameChangePdfAdapterTemplateItem['status']) {
  if (status === 'ready_for_review') return 'Review each suggested PDF field, then save confirmed mappings into a PDF adapter catalog.';
  if (status === 'guided_online') return 'Use guided online entry for this agency flow instead of PDF field mapping.';
  return 'Run the PDF probe script on the official downloaded PDF before building a mapping template.';
}

function buildFieldTemplate(field: NameChangeFormPopulationFieldMapping, fieldNames: string[]): NameChangePdfAdapterTemplateField {
  const candidatePdfFields = getCandidates(field, fieldNames);

  return {
    fieldKey: field.fieldKey,
    officialFieldLabel: field.officialFieldLabel,
    source: field.source,
    redactionPolicy: field.redactionPolicy,
    valueStatus: field.valueStatus,
    selectedPdfFieldName: null,
    visualReviewConfirmed: false,
    reviewedAt: null,
    mappingConfidence: 'manual_review',
    candidatePdfFields,
    note: candidatePdfFields.length > 0
      ? 'Review candidates against the visual official PDF before accepting a mapping.'
      : 'No likely PDF field candidate was found. Review raw PDF fields manually.',
  };
}

export function buildNameChangePdfAdapterTemplatePlan(
  populationPlan: NameChangeFormPopulationPlan,
  probeResults: NameChangePdfProbeResult[],
): NameChangePdfAdapterTemplatePlan {
  const probeByFormCode = new Map(probeResults.map((probe) => [probe.formCode, probe]));
  const items = populationPlan.items.map((item) => {
    if (item.adapterKind === 'guided_online_entry') {
      return {
        formCode: item.formCode,
        formLabel: item.formLabel,
        officialRevisionLabel: item.officialRevisionLabel,
        probeStatus: 'guided_online',
        probeSourceLabel: 'No PDF probe needed',
        status: 'guided_online' as const,
        statusLabel: getStatusLabel('guided_online'),
        nextAction: getNextAction('guided_online'),
        fields: [],
        unmappedPdfFieldNames: [],
      };
    }

    const probe = probeByFormCode.get(item.formCode);
    const fieldNames = probe?.fieldNames ?? [];
    const hasRawFields = probe?.probeStatus === 'raw_fields_found' && fieldNames.length > 0;
    const status = hasRawFields ? 'ready_for_review' as const : 'needs_pdf_probe' as const;
    const fields = hasRawFields ? item.fieldMappings
      .filter((field) => field.mappingStatus !== 'blocked')
      .map((field) => buildFieldTemplate(field, fieldNames)) : [];
    const candidateNames = new Set(fields.flatMap((field) => field.candidatePdfFields.map((candidate) => candidate.pdfFieldName)));

    return {
      formCode: item.formCode,
      formLabel: item.formLabel,
      officialRevisionLabel: item.officialRevisionLabel,
      probeStatus: probe?.probeStatus ?? 'missing_probe',
      probeSourceLabel: getProbeSourceLabel(probe),
      status,
      statusLabel: getStatusLabel(status),
      nextAction: getNextAction(status),
      fields,
      unmappedPdfFieldNames: fieldNames.filter((fieldName) => !candidateNames.has(fieldName)),
    };
  });
  const summary = {
    totalForms: items.length,
    readyForReview: items.filter((item) => item.status === 'ready_for_review').length,
    needsPdfProbe: items.filter((item) => item.status === 'needs_pdf_probe').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    fieldsToMap: items.reduce((sum, item) => sum + item.fields.length, 0),
    candidateMatches: items.reduce((sum, item) => (
      sum + item.fields.reduce((fieldSum, field) => fieldSum + field.candidatePdfFields.length, 0)
    ), 0),
  };
  const primaryAction = summary.readyForReview > 0
    ? 'Review PDF field candidates and confirm adapter mappings before enabling filled draft generation.'
    : summary.needsPdfProbe > 0
      ? 'Run PDF field probes for the official PDFs before mapping fields.'
      : 'Use guided online entry for the current agency flows.';

  return {
    items,
    templatePayloadJson: JSON.stringify({
      reviewOnly: true,
      summary,
      items,
    }, null, 2),
    primaryAction,
    summary,
  };
}
