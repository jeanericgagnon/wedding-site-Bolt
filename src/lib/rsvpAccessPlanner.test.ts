import { describe, expect, it } from 'vitest';
import {
  RSVP_QUESTION_TEMPLATES,
  buildRsvpAccessModePlan,
  buildRsvpQuestionTemplateCoverage,
  buildRsvpSetupChecklist,
  createRsvpQuestionFromTemplate,
  deriveDefaultRsvpAccessSelection,
  normalizePersistedRsvpAccessSelection,
  serializePersistedRsvpAccessSelection,
} from './rsvpAccessPlanner';

describe('rsvpAccessPlanner', () => {
  it('recommends private guest links when token coverage is high', () => {
    const plan = buildRsvpAccessModePlan({ guestCount: 100, inviteTokenCount: 94 });

    expect(plan.find((mode) => mode.id === 'private_link')).toMatchObject({
      status: 'recommended',
      label: 'Private guest links',
    });
    expect(plan.find((mode) => mode.id === 'private_link')?.selected).toBe(true);
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
      mealEnabled: true,
      mealOptionCount: 4,
      questions: [
        { label: 'Any allergies or dietary notes we should know?' },
        { label: 'Which wedding weekend events do you plan to attend?' },
      ],
    });

    expect(checklist.find((item) => item.id === 'private_links')).toMatchObject({ status: 'ready' });
    expect(checklist.find((item) => item.id === 'name_lookup_backup')).toMatchObject({ status: 'ready' });
    expect(checklist.find((item) => item.id === 'question_templates')?.detail).toContain('2 of 7');
    expect(checklist.find((item) => item.id === 'meal_choices')).toMatchObject({ status: 'ready' });
    expect(checklist.find((item) => item.id === 'future_access_modes')).toMatchObject({ status: 'planned' });
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
      mealEnabled: true,
      mealOptionCount: 1,
      questions: [],
    });

    expect(checklist.find((item) => item.id === 'private_links')).toMatchObject({ status: 'needs-setup' });
    expect(checklist.find((item) => item.id === 'question_templates')).toMatchObject({ status: 'needs-setup' });
    expect(checklist.find((item) => item.id === 'meal_choices')).toMatchObject({ status: 'needs-setup' });
  });
});
