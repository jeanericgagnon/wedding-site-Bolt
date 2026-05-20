import type { NameChangeFormPopulationPlan } from './formPopulationPlan';
import type { NameChangeSupplementalIntakePlan, NameChangeSupplementalIntakePrompt } from './formSupplementalIntake';

export type NameChangeSecureSessionFieldPolicy = 'ephemeral_only' | 'save_with_consent' | 'use_existing_with_consent';

export interface NameChangeSecureSessionField {
  fieldKey: string;
  label: string;
  question: string;
  helperText: string;
  formCodes: string[];
  policy: NameChangeSecureSessionFieldPolicy;
  status: 'needs_secure_entry' | 'optional_save_with_consent' | 'needs_use_consent';
  statusLabel: string;
  currentValueLabel: string | null;
  hasCurrentValue: boolean;
}

export interface NameChangeSecureSessionPlan {
  fields: NameChangeSecureSessionField[];
  secureSessionJson: string;
  primaryAction: string;
  summary: {
    total: number;
    ephemeralOnly: number;
    saveWithConsent: number;
    useExistingWithConsent: number;
    missingPopulationForms: number;
  };
}

function getPolicy(prompt: NameChangeSupplementalIntakePrompt): NameChangeSecureSessionFieldPolicy {
  if (prompt.sensitivity === 'secure_session_only') return 'ephemeral_only';
  if (prompt.status === 'available') return 'use_existing_with_consent';
  return 'save_with_consent';
}

function getStatusLabel(policy: NameChangeSecureSessionFieldPolicy) {
  if (policy === 'ephemeral_only') return 'Secure entry only';
  if (policy === 'use_existing_with_consent') return 'Use only with consent';
  return 'Save only with consent';
}

function shouldIncludePrompt(prompt: NameChangeSupplementalIntakePrompt) {
  return (
    prompt.status === 'secure_session_required'
    || (prompt.status === 'missing' && prompt.sensitivity === 'sensitive')
    || (prompt.status === 'available' && prompt.sensitivity === 'sensitive')
  );
}

function getStatus(policy: NameChangeSecureSessionFieldPolicy) {
  if (policy === 'ephemeral_only') return 'needs_secure_entry' as const;
  if (policy === 'use_existing_with_consent') return 'needs_use_consent' as const;
  return 'optional_save_with_consent' as const;
}

export function buildNameChangeSecureSessionPlan(
  supplementalIntakePlan: NameChangeSupplementalIntakePlan,
  populationPlan: NameChangeFormPopulationPlan,
): NameChangeSecureSessionPlan {
  const fields = supplementalIntakePlan.prompts
    .filter(shouldIncludePrompt)
    .map((prompt) => {
      const policy = getPolicy(prompt);

      return {
        fieldKey: `secure.${prompt.promptKey}`,
        label: prompt.label,
        question: prompt.question,
        helperText: prompt.helperText,
        formCodes: prompt.formCodes,
        policy,
        status: getStatus(policy),
        statusLabel: getStatusLabel(policy),
        currentValueLabel: null,
        hasCurrentValue: Boolean(prompt.currentValueLabel),
      };
    });
  const summary = {
    total: fields.length,
    ephemeralOnly: fields.filter((field) => field.policy === 'ephemeral_only').length,
    saveWithConsent: fields.filter((field) => field.policy === 'save_with_consent').length,
    useExistingWithConsent: fields.filter((field) => field.policy === 'use_existing_with_consent').length,
    missingPopulationForms: populationPlan.items.filter((item) => item.status === 'needs_input' || item.status === 'needs_secure_session').length,
  };
  const primaryAction = summary.ephemeralOnly > 0
    ? 'Collect secure-entry-only values in a short-lived session before generating review drafts.'
    : summary.saveWithConsent > 0
      ? 'Collect sensitive values and save them only if the user explicitly consents.'
      : summary.useExistingWithConsent > 0
        ? 'Capture consent before using saved sensitive values in review drafts.'
      : 'No secure form session is needed for the current companion set.';

  return {
    fields,
    secureSessionJson: JSON.stringify({
      reviewOnly: true,
      retention: {
        ephemeralOnly: 'Use only during draft generation. Do not store in normal planner state.',
        saveWithConsent: 'Save only after explicit user consent and appropriate encryption/storage controls.',
        useExistingWithConsent: 'Use saved sensitive values only after explicit consent for the current review-only draft.',
      },
      fields,
    }, null, 2),
    primaryAction,
    summary,
  };
}
