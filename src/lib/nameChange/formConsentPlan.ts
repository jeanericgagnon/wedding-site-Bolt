import type { NameChangeSecureSessionPlan, NameChangeSecureSessionField } from './formSecureSession';

export type NameChangeConsentType = 'ephemeral_use_acknowledgment' | 'save_sensitive_value' | 'use_existing_sensitive_value';
export type NameChangeConsentStatus = 'needs_consent' | 'not_required';

export interface NameChangeConsentItem {
  consentKey: string;
  fieldKey: string;
  label: string;
  consentType: NameChangeConsentType;
  status: NameChangeConsentStatus;
  statusLabel: string;
  prompt: string;
  retentionPolicy: string;
  formCodes: string[];
}

export interface NameChangeConsentPlan {
  items: NameChangeConsentItem[];
  consentPayloadJson: string;
  primaryAction: string;
  summary: {
    total: number;
    needsConsent: number;
    ephemeralAcknowledgments: number;
    saveConsents: number;
    useExistingConsents: number;
  };
}

function getConsentType(field: NameChangeSecureSessionField): NameChangeConsentType {
  if (field.policy === 'ephemeral_only') return 'ephemeral_use_acknowledgment';
  if (field.policy === 'use_existing_with_consent') return 'use_existing_sensitive_value';
  return 'save_sensitive_value';
}

function getRetentionPolicy(consentType: NameChangeConsentType) {
  if (consentType === 'ephemeral_use_acknowledgment') {
    return 'Use only during review-only draft generation. Do not store in normal planner state.';
  }
  if (consentType === 'use_existing_sensitive_value') {
    return 'Use the saved sensitive value only for the current review-only draft unless the user separately opts into future reuse.';
  }

  return 'Save only after explicit consent and only with appropriate secure storage controls.';
}

function getConsentPrompt(field: NameChangeSecureSessionField, consentType: NameChangeConsentType) {
  if (consentType === 'ephemeral_use_acknowledgment') {
    return `Confirm DayOf may use ${field.label.toLowerCase()} only during this short-lived draft session.`;
  }
  if (consentType === 'use_existing_sensitive_value') {
    return `Confirm DayOf may use the saved ${field.label.toLowerCase()} for this review-only draft.`;
  }

  return `Ask whether DayOf may save ${field.label.toLowerCase()} for future form drafts.`;
}

function getStatusLabel(consentType: NameChangeConsentType) {
  if (consentType === 'ephemeral_use_acknowledgment') return 'Needs acknowledgment';
  if (consentType === 'use_existing_sensitive_value') return 'Needs use consent';
  return 'Needs save consent';
}

export function buildNameChangeConsentPlan(
  secureSessionPlan: NameChangeSecureSessionPlan,
): NameChangeConsentPlan {
  const items = secureSessionPlan.fields.map((field) => {
    const consentType = getConsentType(field);

    return {
      consentKey: `consent.${field.fieldKey.replace(/^secure\./, '')}`,
      fieldKey: field.fieldKey,
      label: field.label,
      consentType,
      status: 'needs_consent' as const,
      statusLabel: getStatusLabel(consentType),
      prompt: getConsentPrompt(field, consentType),
      retentionPolicy: getRetentionPolicy(consentType),
      formCodes: field.formCodes,
    };
  });
  const summary = {
    total: items.length,
    needsConsent: items.filter((item) => item.status === 'needs_consent').length,
    ephemeralAcknowledgments: items.filter((item) => item.consentType === 'ephemeral_use_acknowledgment').length,
    saveConsents: items.filter((item) => item.consentType === 'save_sensitive_value').length,
    useExistingConsents: items.filter((item) => item.consentType === 'use_existing_sensitive_value').length,
  };
  const primaryAction = summary.needsConsent > 0
    ? 'Capture consent and retention choices before using sensitive values for draft generation.'
    : 'No additional consent is required for the current secure-session plan.';

  return {
    items,
    consentPayloadJson: JSON.stringify({
      reviewOnly: true,
      consentRequired: summary.needsConsent > 0,
      items,
    }, null, 2),
    primaryAction,
    summary,
  };
}
