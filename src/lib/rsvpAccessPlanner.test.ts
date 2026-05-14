import { describe, expect, it } from 'vitest';
import {
  RSVP_QUESTION_TEMPLATES,
  buildRsvpAccessModePlan,
  buildRsvpRecoveryVerificationReadiness,
  buildRsvpQuestionTemplateCoverage,
  buildRsvpSetupChecklist,
  createRsvpQuestionFromTemplate,
  deriveDefaultRsvpAccessSelection,
  normalizePersistedRsvpAccessSelection,
  serializePersistedRsvpAccessSelection,
} from './rsvpAccessPlanner';

describe('rsvpAccessPlanner', () => {
  it('recommends private guest links when token coverage is high', () => {
    const plan = buildRsvpAccessModePlan({ guestCount: 100, inviteTokenCount: 94, householdCount: 32 });

    expect(plan.find((mode) => mode.id === 'private_link')).toMatchObject({
      status: 'recommended',
      label: 'Private guest links',
    });
    expect(plan.find((mode) => mode.id === 'private_link')?.selected).toBe(true);
    expect(plan.find((mode) => mode.id === 'private_link')?.detail).toContain('household');
    expect(plan.find((mode) => mode.id === 'name_lookup')?.status).toBe('ready');
  });

  it('recommends name lookup as a backup when private links are not ready', () => {
    const plan = buildRsvpAccessModePlan({ guestCount: 50, inviteTokenCount: 8 });

    expect(plan.find((mode) => mode.id === 'private_link')?.status).toBe('needs-setup');
    expect(plan.find((mode) => mode.id === 'name_lookup')?.status).toBe('recommended');
  });

  it('keeps open RSVP away from the recommended path once a guest list exists', () => {
    const plan = buildRsvpAccessModePlan({ guestCount: 12, inviteTokenCount: 12 });

    expect(plan.find((mode) => mode.id === 'open')?.status).toBe('future');
  });

  it('keeps future access modes visibly blocked on recovery, household, and bad-code proof', () => {
    const plan = buildRsvpAccessModePlan({
      guestCount: 24,
      inviteTokenCount: 24,
      householdCount: 9,
      eventCount: 3,
      emailCount: 20,
      phoneCount: 6,
    });

    expect(plan.find((mode) => mode.id === 'unique_code')?.detail).toContain('replacement-link recovery');
    expect(plan.find((mode) => mode.id === 'unique_code')?.detail).toContain('phone or email verification');
    expect(plan.find((mode) => mode.id === 'unique_code')?.detail).toContain('household-safe verification');
    expect(plan.find((mode) => mode.id === 'password')?.detail).toContain('bad-password lockouts');
    expect(plan.find((mode) => mode.id === 'open')?.detail).toContain('verification fallout');
  });

  it('builds verification readiness that protects private links as the primary RSVP path', () => {
    const readiness = buildRsvpRecoveryVerificationReadiness({
      guestCount: 18,
      inviteTokenCount: 18,
      householdCount: 7,
      eventCount: 2,
      emailCount: 14,
      phoneCount: 5,
    }, {
      primaryMode: 'private_link',
      allowNameLookupBackup: true,
    });

    expect(readiness.status).toBe('needs-setup');
    expect(readiness.detail).toContain('14 guest emails and 5 phone numbers');
    expect(readiness.detail).toContain('keeps private guest links as the primary RSVP path');
    expect(readiness.blockers).toContain('keep any future verification challenge scoped to the right event instead of the full weekend');
  });

  it('keeps verification readiness blocked when contact data is missing', () => {
    const readiness = buildRsvpRecoveryVerificationReadiness({
      guestCount: 10,
      inviteTokenCount: 10,
      householdCount: 3,
      eventCount: 1,
      emailCount: 0,
      phoneCount: 0,
    });

    expect(readiness.status).toBe('needs-setup');
    expect(readiness.supportLabel).toBe('no saved guest phone or email contacts');
    expect(readiness.detail).toContain('safer recovery step than name-only lookup');
  });

  it('normalizes persisted RSVP access selection from current and legacy shapes', () => {
    const fallback = deriveDefaultRsvpAccessSelection({ guestCount: 20, inviteTokenCount: 19 });

    expect(normalizePersistedRsvpAccessSelection({
      primary_mode: 'name_lookup',
      allow_name_lookup_backup: false,
    }, fallback)).toEqual({
      primaryMode: 'name_lookup',
      allowNameLookupBackup: false,
    });

    expect(normalizePersistedRsvpAccessSelection({
      primaryMode: 'private_link',
      allowNameLookupBackup: true,
    }, fallback)).toEqual({
      primaryMode: 'private_link',
      allowNameLookupBackup: true,
    });

    expect(normalizePersistedRsvpAccessSelection({
      primary_mode: 'open',
      allow_name_lookup_backup: false,
    }, fallback)).toEqual({
      primaryMode: fallback.primaryMode,
      allowNameLookupBackup: false,
    });

    expect(serializePersistedRsvpAccessSelection({
      primaryMode: 'private_link',
      allowNameLookupBackup: true,
    })).toEqual({
      primary_mode: 'private_link',
      allow_name_lookup_backup: true,
    });
  });

  it('creates reusable question templates without sharing mutable option arrays', () => {
    const shuttle = RSVP_QUESTION_TEMPLATES.find((template) => template.key === 'shuttle');
    expect(shuttle).toBeTruthy();

    const question = createRsvpQuestionFromTemplate(shuttle!, 'q_shuttle');
    question.options.push('Maybe');

    expect(question).toMatchObject({
      id: 'q_shuttle',
      label: 'Will you use the wedding shuttle?',
      type: 'single_choice',
      appliesTo: 'all',
    });
    expect(shuttle?.options).toEqual(['Yes', 'No', 'Not sure yet']);
  });

  it('reports reusable question template coverage by normalized label', () => {
    const coverage = buildRsvpQuestionTemplateCoverage([
      { label: '  WILL you use the wedding shuttle?  ' },
      { label: 'What song would get you on the dance floor?' },
    ]);

    expect(coverage.find((template) => template.key === 'shuttle')?.added).toBe(true);
    expect(coverage.find((template) => template.key === 'song')?.added).toBe(true);
    expect(coverage.find((template) => template.key === 'dietary')?.added).toBe(false);
  });

  it('builds an owner-facing RSVP setup checklist without marking future access modes ready', () => {
    const checklist = buildRsvpSetupChecklist({
      guestCount: 80,
      inviteTokenCount: 78,
      householdCount: 28,
      eventCount: 3,
      emailCount: 70,
      phoneCount: 24,
      mealEnabled: true,
      mealOptionCount: 4,
      questions: [
        { label: 'Any allergies or dietary notes we should know?' },
        { label: 'Which wedding weekend events do you plan to attend?' },
      ],
    });

    expect(checklist.find((item) => item.id === 'private_links')).toMatchObject({ status: 'ready' });
    expect(checklist.find((item) => item.id === 'name_lookup_backup')).toMatchObject({ status: 'ready' });
    expect(checklist.find((item) => item.id === 'household_scope')).toMatchObject({ status: 'ready' });
    expect(checklist.find((item) => item.id === 'verification_inputs')).toMatchObject({ status: 'needs-setup' });
    expect(checklist.find((item) => item.id === 'verification_inputs')?.detail).toContain('private guest links as the primary RSVP path');
    expect(checklist.find((item) => item.id === 'household_scope')?.detail).toContain('event invitations');
    expect(checklist.find((item) => item.id === 'question_templates')?.detail).toContain('2 of 7');
    expect(checklist.find((item) => item.id === 'meal_choices')).toMatchObject({ status: 'ready' });
    expect(checklist.find((item) => item.id === 'future_access_modes')).toMatchObject({ status: 'planned' });
    expect(checklist.find((item) => item.id === 'future_access_modes')?.detail).toContain('bad-code');
  });

  it('keeps name lookup backup honest when owners turn it off', () => {
    const checklist = buildRsvpSetupChecklist({
      guestCount: 24,
      inviteTokenCount: 24,
      mealEnabled: false,
      mealOptionCount: 0,
      questions: [],
    }, {
      primaryMode: 'private_link',
      allowNameLookupBackup: false,
    });

    expect(checklist.find((item) => item.id === 'name_lookup_backup')).toMatchObject({
      status: 'needs-setup',
    });
  });

  it('flags missing RSVP setup pieces before launch proof', () => {
    const checklist = buildRsvpSetupChecklist({
      guestCount: 24,
      inviteTokenCount: 4,
      householdCount: 0,
      emailCount: 2,
      phoneCount: 0,
      mealEnabled: true,
      mealOptionCount: 1,
      questions: [],
    });

    expect(checklist.find((item) => item.id === 'private_links')).toMatchObject({ status: 'needs-setup' });
    expect(checklist.find((item) => item.id === 'household_scope')).toMatchObject({ status: 'needs-setup' });
    expect(checklist.find((item) => item.id === 'verification_inputs')).toMatchObject({ status: 'needs-setup' });
    expect(checklist.find((item) => item.id === 'verification_inputs')?.detail).toContain('verification step');
    expect(checklist.find((item) => item.id === 'question_templates')).toMatchObject({ status: 'planned' });
    expect(checklist.find((item) => item.id === 'question_templates')?.detail).toContain('optional');
    expect(checklist.find((item) => item.id === 'meal_choices')).toMatchObject({ status: 'needs-setup' });
  });

  it('keeps optional template and meal setup out of the blocker state when owners do not need them yet', () => {
    const checklist = buildRsvpSetupChecklist({
      guestCount: 24,
      inviteTokenCount: 24,
      householdCount: 8,
      emailCount: 12,
      phoneCount: 4,
      mealEnabled: false,
      mealOptionCount: 0,
      questions: [],
    });

    expect(checklist.find((item) => item.id === 'question_templates')).toMatchObject({ status: 'planned' });
    expect(checklist.find((item) => item.id === 'meal_choices')).toMatchObject({ status: 'planned' });
    expect(checklist.find((item) => item.id === 'meal_choices')?.detail).toContain('unless you need catering choices');
  });
});
