import type { NameChangeCaseInput } from './types';

export type NameChangeSupplementalIntakeSensitivity = 'standard' | 'sensitive' | 'secure_session_only';
export type NameChangeSupplementalIntakePromptStatus = 'available' | 'missing' | 'secure_session_required';

export interface NameChangeSupplementalIntakePrompt {
  promptKey: string;
  label: string;
  question: string;
  helperText: string;
  formCodes: string[];
  sensitivity: NameChangeSupplementalIntakeSensitivity;
  status: NameChangeSupplementalIntakePromptStatus;
  statusLabel: string;
  currentValueLabel: string | null;
  priority: number;
}

export interface NameChangeSupplementalIntakeSummary {
  total: number;
  available: number;
  missing: number;
  secureSessionRequired: number;
}

export interface NameChangeSupplementalIntakePlan {
  prompts: NameChangeSupplementalIntakePrompt[];
  summary: NameChangeSupplementalIntakeSummary;
  primaryAction: string;
}

interface SupplementalPromptDefinition {
  promptKey: string;
  label: string;
  question: string;
  helperText: string;
  formCodes: string[];
  sensitivity: NameChangeSupplementalIntakeSensitivity;
  structuredKey?: string;
  currentValueFromCase?: (draft: NameChangeCaseInput) => string | null;
}

const SUPPLEMENTAL_PROMPT_DEFINITIONS: SupplementalPromptDefinition[] = [
  {
    promptKey: 'dateOfBirth',
    label: 'Date of birth',
    question: 'What is your date of birth?',
    helperText: 'Needed for SSA, passport, and DMV identity sections.',
    formCodes: ['SSA-SS5', 'DS-11', 'DS-82', 'DS-5504', 'CA-DL-44'],
    sensitivity: 'sensitive',
    structuredKey: 'dateOfBirth',
  },
  {
    promptKey: 'socialSecurityNumber',
    label: 'Social Security number',
    question: 'Enter your Social Security number in a secure form session.',
    helperText: 'Do not store this in the normal planner. Use only for review-only draft generation.',
    formCodes: ['SSA-SS5', 'DS-11', 'DS-82', 'DS-5504', 'CA-DL-44'],
    sensitivity: 'secure_session_only',
  },
  {
    promptKey: 'mailingAddress',
    label: 'Mailing address',
    question: 'What mailing address should appear on government forms?',
    helperText: 'Needed for mailed passport packets and agency contact records.',
    formCodes: ['SSA-SS5', 'DS-11', 'DS-82', 'DS-5504'],
    sensitivity: 'sensitive',
    structuredKey: 'mailingAddress',
  },
  {
    promptKey: 'residentialAddress',
    label: 'Residential address',
    question: 'What residential address should be used for DMV identity work?',
    helperText: 'Needed for DMV and proof-of-residence checks.',
    formCodes: ['CA-DL-44'],
    sensitivity: 'sensitive',
    structuredKey: 'residentialAddress',
  },
  {
    promptKey: 'fullPhoneNumber',
    label: 'Full phone number',
    question: 'What phone number should agencies use if they need to contact you?',
    helperText: 'The current planner only keeps phone last four, which is not enough for official forms.',
    formCodes: ['SSA-SS5', 'DS-11', 'DS-82', 'DS-5504', 'CA-DL-44'],
    sensitivity: 'sensitive',
    structuredKey: 'fullPhoneNumber',
  },
  {
    promptKey: 'email',
    label: 'Email address',
    question: 'What email address should be used for agency status updates?',
    helperText: 'Already available if the saved name-change profile includes email.',
    formCodes: ['DS-11', 'DS-82', 'DS-5504', 'CA-DL-44'],
    sensitivity: 'standard',
    currentValueFromCase: (draft) => draft.email ?? null,
  },
  {
    promptKey: 'placeOfBirth',
    label: 'Place of birth',
    question: 'What city and state or country are listed as your place of birth?',
    helperText: 'Needed for passport and Social Security identity sections.',
    formCodes: ['SSA-SS5', 'DS-11', 'DS-82', 'DS-5504'],
    sensitivity: 'sensitive',
    structuredKey: 'placeOfBirth',
  },
  {
    promptKey: 'citizenshipEvidence',
    label: 'Citizenship evidence',
    question: 'Which citizenship evidence will support the passport or SSA identity section?',
    helperText: 'Use document metadata or a secure review session for the exact document details.',
    formCodes: ['SSA-SS5', 'DS-11', 'DS-82', 'DS-5504'],
    sensitivity: 'sensitive',
    currentValueFromCase: (draft) => (draft.is_us_citizen ? 'U.S. citizen marked in intake' : null),
  },
  {
    promptKey: 'sexMarker',
    label: 'Sex marker',
    question: 'Which sex marker should be used where the official form asks for it?',
    helperText: 'Needed for SSA, passport, and DMV forms that include identity marker fields.',
    formCodes: ['SSA-SS5', 'DS-11', 'DS-82', 'DS-5504', 'CA-DL-44'],
    sensitivity: 'sensitive',
    structuredKey: 'sexMarker',
  },
  {
    promptKey: 'emergencyContact',
    label: 'Passport emergency contact',
    question: 'Who should be listed as the emergency contact for passport forms?',
    helperText: 'Needed for passport applications and renewals.',
    formCodes: ['DS-11', 'DS-82', 'DS-5504'],
    sensitivity: 'sensitive',
    structuredKey: 'passportEmergencyContact',
  },
];

function readStructuredValue(draft: NameChangeCaseInput, key: string | undefined) {
  if (!key) return null;
  const structured = draft.structured_intake as Record<string, unknown>;
  const value = structured[key];
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function getStatus(definition: SupplementalPromptDefinition, currentValueLabel: string | null): NameChangeSupplementalIntakePromptStatus {
  if (currentValueLabel) return 'available';
  if (definition.sensitivity === 'secure_session_only') return 'secure_session_required';
  return 'missing';
}

function getStatusLabel(status: NameChangeSupplementalIntakePromptStatus) {
  if (status === 'available') return 'Available';
  if (status === 'secure_session_required') return 'Secure session';
  return 'Needs answer';
}

function getPriority(status: NameChangeSupplementalIntakePromptStatus, sensitivity: NameChangeSupplementalIntakeSensitivity) {
  if (status === 'missing') return 0;
  if (status === 'secure_session_required') return 1;
  if (sensitivity === 'sensitive') return 2;
  return 3;
}

export function buildNameChangeSupplementalIntakePlan(
  draft: NameChangeCaseInput,
  activeFormCodes: string[],
): NameChangeSupplementalIntakePlan {
  const activeFormCodeSet = new Set(activeFormCodes);
  const prompts = SUPPLEMENTAL_PROMPT_DEFINITIONS
    .filter((definition) => definition.formCodes.some((formCode) => activeFormCodeSet.has(formCode)))
    .map((definition) => {
      const currentValueLabel = definition.currentValueFromCase?.(draft) ?? readStructuredValue(draft, definition.structuredKey);
      const status = getStatus(definition, currentValueLabel);

      return {
        promptKey: definition.promptKey,
        label: definition.label,
        question: definition.question,
        helperText: definition.helperText,
        formCodes: definition.formCodes.filter((formCode) => activeFormCodeSet.has(formCode)),
        sensitivity: definition.sensitivity,
        status,
        statusLabel: getStatusLabel(status),
        currentValueLabel,
        priority: getPriority(status, definition.sensitivity),
      };
    })
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      if (right.formCodes.length !== left.formCodes.length) return right.formCodes.length - left.formCodes.length;
      return left.label.localeCompare(right.label);
    });
  const summary = {
    total: prompts.length,
    available: prompts.filter((prompt) => prompt.status === 'available').length,
    missing: prompts.filter((prompt) => prompt.status === 'missing').length,
    secureSessionRequired: prompts.filter((prompt) => prompt.status === 'secure_session_required').length,
  };
  const primaryAction = summary.missing > 0
    ? 'Collect the missing supplemental details before promising complete prefilled forms.'
    : summary.secureSessionRequired > 0
      ? 'Open a secure form session for values that should not live in the normal planner.'
      : 'Supplemental form-population details are represented for the selected companions.';

  return {
    prompts,
    summary,
    primaryAction,
  };
}
