import type { NameChangeFormPopulationFieldMapping, NameChangeFormPopulationPlan } from './formPopulationPlan';

export type NameChangePopulationIntakeGapCategory = 'user_info' | 'secure_session' | 'consent' | 'pdf_mapping';

export interface NameChangePopulationIntakeGap {
  gapKey: string;
  category: NameChangePopulationIntakeGapCategory;
  statusLabel: string;
  fieldKey: string;
  label: string;
  prompt: string;
  helperText: string;
  formCodes: string[];
  formLabels: string[];
  officialRevisionLabels: string[];
  sources: NameChangeFormPopulationFieldMapping['source'][];
  redactionPolicy: NameChangeFormPopulationFieldMapping['redactionPolicy'];
  currentValueKnown: boolean;
  priority: number;
  nextAction: string;
}

export interface NameChangePopulationIntakeGapPlan {
  reviewOnly: true;
  safePayload: true;
  containsUserValues: false;
  primaryAction: string;
  gaps: NameChangePopulationIntakeGap[];
  intakeGapJson: string;
  summary: {
    totalGaps: number;
    userInfo: number;
    secureSession: number;
    consent: number;
    pdfMapping: number;
    impactedForms: number;
  };
}

function uniq<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getCategory(field: NameChangeFormPopulationFieldMapping): NameChangePopulationIntakeGapCategory | null {
  if (field.redactionPolicy === 'requires_secure_session') return 'secure_session';
  if (field.redactionPolicy === 'requires_consent') return 'consent';
  if (!field.hasValue || field.valueStatus === 'missing' || field.mappingStatus === 'blocked') return 'user_info';
  if (field.mappingStatus === 'needs_pdf_field_probe') return 'pdf_mapping';
  return null;
}

function getPriority(category: NameChangePopulationIntakeGapCategory) {
  if (category === 'user_info') return 0;
  if (category === 'secure_session') return 1;
  if (category === 'consent') return 2;
  return 3;
}

function getStatusLabel(category: NameChangePopulationIntakeGapCategory) {
  if (category === 'user_info') return 'Needs answer';
  if (category === 'secure_session') return 'Secure session';
  if (category === 'consent') return 'Consent needed';
  return 'PDF mapping';
}

function lowerFirst(value: string) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function getPrompt(field: NameChangeFormPopulationFieldMapping, category: NameChangePopulationIntakeGapCategory) {
  if (category === 'secure_session') return `Enter ${lowerFirst(field.officialFieldLabel)} in a secure session.`;
  if (category === 'consent' && field.hasValue) return `May DayOf use saved ${lowerFirst(field.officialFieldLabel)} for this review-only draft?`;
  if (category === 'consent') return `Collect ${lowerFirst(field.officialFieldLabel)} with explicit consent.`;
  if (category === 'pdf_mapping') return `Which official PDF field should receive ${lowerFirst(field.officialFieldLabel)}?`;
  return `What should DayOf use for ${lowerFirst(field.officialFieldLabel)}?`;
}

function getHelperText(field: NameChangeFormPopulationFieldMapping, category: NameChangePopulationIntakeGapCategory) {
  if (category === 'secure_session') return 'Use the value only during draft generation. Do not store it in the normal planner.';
  if (category === 'consent') return 'Use or save this sensitive value only after explicit consent for the current review-only draft.';
  if (category === 'pdf_mapping') return 'Map this semantic field to a visually reviewed official PDF field before generating drafts.';
  return 'Ask once, then reuse the answer anywhere this field is needed.';
}

function getNextAction(field: NameChangeFormPopulationFieldMapping, category: NameChangePopulationIntakeGapCategory) {
  if (category === 'secure_session') return `Open secure intake for ${field.officialFieldLabel}.`;
  if (category === 'consent' && field.hasValue) return `Capture consent to use saved ${field.officialFieldLabel}.`;
  if (category === 'consent') return `Collect ${field.officialFieldLabel} and capture save/use consent.`;
  if (category === 'pdf_mapping') return `Visually map ${field.officialFieldLabel} to the official PDF field.`;
  return `Ask for ${field.officialFieldLabel} once and refresh the population plan.`;
}

function buildGap(
  field: NameChangeFormPopulationFieldMapping,
  category: NameChangePopulationIntakeGapCategory,
  item: NameChangeFormPopulationPlan['items'][number],
): NameChangePopulationIntakeGap {
  return {
    gapKey: `${category}:${field.fieldKey}`,
    category,
    statusLabel: getStatusLabel(category),
    fieldKey: field.fieldKey,
    label: field.officialFieldLabel,
    prompt: getPrompt(field, category),
    helperText: getHelperText(field, category),
    formCodes: [item.formCode],
    formLabels: [item.formLabel],
    officialRevisionLabels: [item.officialRevisionLabel],
    sources: [field.source],
    redactionPolicy: field.redactionPolicy,
    currentValueKnown: field.hasValue,
    priority: getPriority(category),
    nextAction: getNextAction(field, category),
  };
}

function mergeGap(
  existing: NameChangePopulationIntakeGap,
  field: NameChangeFormPopulationFieldMapping,
  item: NameChangeFormPopulationPlan['items'][number],
): NameChangePopulationIntakeGap {
  return {
    ...existing,
    formCodes: uniq([...existing.formCodes, item.formCode]),
    formLabels: uniq([...existing.formLabels, item.formLabel]),
    officialRevisionLabels: uniq([...existing.officialRevisionLabels, item.officialRevisionLabel]),
    sources: uniq([...existing.sources, field.source]),
    currentValueKnown: existing.currentValueKnown || field.hasValue,
  };
}

function getPrimaryAction(summary: NameChangePopulationIntakeGapPlan['summary']) {
  if (summary.userInfo > 0) return 'Collect missing user answers once, then refresh the population plan.';
  if (summary.secureSession > 0) return 'Open secure intake for values that should not live in normal planner state.';
  if (summary.consent > 0) return 'Capture consent before using sensitive saved values in review-only drafts.';
  if (summary.pdfMapping > 0) return 'Finish visually reviewed PDF field mappings before generating drafts.';
  return 'No intake gaps are blocking the current population plan.';
}

export function buildNameChangePopulationIntakeGapPlan(
  populationPlan: NameChangeFormPopulationPlan,
): NameChangePopulationIntakeGapPlan {
  const grouped = new Map<string, NameChangePopulationIntakeGap>();

  for (const item of populationPlan.items) {
    for (const field of item.fieldMappings) {
      const category = getCategory(field);
      if (!category) continue;
      const gapKey = `${category}:${field.fieldKey}`;
      const current = grouped.get(gapKey);
      grouped.set(
        gapKey,
        current ? mergeGap(current, field, item) : buildGap(field, category, item),
      );
    }
  }

  const gaps = Array.from(grouped.values()).sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    if (right.formCodes.length !== left.formCodes.length) return right.formCodes.length - left.formCodes.length;
    return left.label.localeCompare(right.label);
  });
  const impactedForms = uniq(gaps.flatMap((gap) => gap.formCodes)).length;
  const summary = {
    totalGaps: gaps.length,
    userInfo: gaps.filter((gap) => gap.category === 'user_info').length,
    secureSession: gaps.filter((gap) => gap.category === 'secure_session').length,
    consent: gaps.filter((gap) => gap.category === 'consent').length,
    pdfMapping: gaps.filter((gap) => gap.category === 'pdf_mapping').length,
    impactedForms,
  };
  const payload: Omit<NameChangePopulationIntakeGapPlan, 'intakeGapJson'> = {
    reviewOnly: true,
    safePayload: true,
    containsUserValues: false,
    primaryAction: getPrimaryAction(summary),
    summary,
    gaps,
  };

  return {
    ...payload,
    intakeGapJson: JSON.stringify(payload, null, 2),
  };
}
