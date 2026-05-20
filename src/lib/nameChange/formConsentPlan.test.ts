import { describe, expect, it } from 'vitest';
import { buildNameChangeConsentPlan } from './formConsentPlan';
import type { NameChangeSecureSessionPlan } from './formSecureSession';

const secureSessionPlan: NameChangeSecureSessionPlan = {
  primaryAction: 'Collect secure-entry-only values.',
  secureSessionJson: '{}',
  summary: {
    total: 3,
    ephemeralOnly: 1,
    saveWithConsent: 1,
    useExistingWithConsent: 1,
    missingPopulationForms: 1,
  },
  fields: [
    {
      fieldKey: 'secure.socialSecurityNumber',
      label: 'Social Security number',
      question: 'Enter your Social Security number in a secure form session.',
      helperText: 'Do not store this in the normal planner.',
      formCodes: ['SSA-SS5'],
      policy: 'ephemeral_only',
      status: 'needs_secure_entry',
      statusLabel: 'Secure entry only',
      currentValueLabel: null,
      hasCurrentValue: false,
    },
    {
      fieldKey: 'secure.dateOfBirth',
      label: 'Date of birth',
      question: 'What is your date of birth?',
      helperText: 'Needed for SSA.',
      formCodes: ['SSA-SS5'],
      policy: 'save_with_consent',
      status: 'optional_save_with_consent',
      statusLabel: 'Save only with consent',
      currentValueLabel: null,
      hasCurrentValue: false,
    },
    {
      fieldKey: 'secure.placeOfBirth',
      label: 'Place of birth',
      question: 'What city and state or country are listed as your place of birth?',
      helperText: 'Needed for SSA.',
      formCodes: ['SSA-SS5'],
      policy: 'use_existing_with_consent',
      status: 'needs_use_consent',
      statusLabel: 'Use only with consent',
      currentValueLabel: null,
      hasCurrentValue: true,
    },
  ],
};

describe('name change consent plan', () => {
  it('creates retention consent items from secure-session fields', () => {
    const plan = buildNameChangeConsentPlan(secureSessionPlan);

    expect(plan.summary).toMatchObject({
      total: 3,
      needsConsent: 3,
      ephemeralAcknowledgments: 1,
      saveConsents: 1,
      useExistingConsents: 1,
    });
    expect(plan.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        consentKey: 'consent.socialSecurityNumber',
        consentType: 'ephemeral_use_acknowledgment',
        statusLabel: 'Needs acknowledgment',
      }),
      expect.objectContaining({
        consentKey: 'consent.dateOfBirth',
        consentType: 'save_sensitive_value',
        statusLabel: 'Needs save consent',
      }),
      expect.objectContaining({
        consentKey: 'consent.placeOfBirth',
        consentType: 'use_existing_sensitive_value',
        statusLabel: 'Needs use consent',
      }),
    ]));
    expect(plan.consentPayloadJson).toContain('"consentRequired": true');
  });
});
