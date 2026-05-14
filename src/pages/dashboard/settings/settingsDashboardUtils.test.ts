import { describe, expect, it, vi } from 'vitest';
import {
  SETTINGS_SITE_MISSING_COPY,
  buildPrivacySettingsUpdates,
  cleanRsvpSettings,
  formatTranslationStatusDate,
  getSiteLanguageLabel,
  makeQuestion,
  normalizeAllowedSiteLanguages,
  normalizeMealOptions,
  normalizeRsvpQuestions,
  normalizeSettingsSlug,
  plannerPermissionLabel,
  safeSettingsError,
  splitCoupleNames,
} from './settingsDashboardUtils';

describe('settingsDashboardUtils', () => {
  it('creates a safe blank RSVP question draft', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.123456789);

    expect(makeQuestion()).toEqual({
      id: 'q_4fzzzxjy',
      label: '',
      type: 'short_text',
      required: false,
      appliesTo: 'all',
      options: [],
    });

    vi.restoreAllMocks();
  });

  it('formats language and translation status labels', () => {
    expect(getSiteLanguageLabel('en')).toBe('English');
    expect(getSiteLanguageLabel('zz')).toBe('ZZ');
    expect(formatTranslationStatusDate(null)).toBe('Not generated yet');
    expect(formatTranslationStatusDate('not-a-date')).toBe('Generated recently');
  });

  it('keeps settings errors customer-safe', () => {
    expect(safeSettingsError(new Error('JWT failed for wedding_sites'), 'Try again.')).toBe('Try again.');
    expect(SETTINGS_SITE_MISSING_COPY).toContain('Refresh and try again');
  });

  it('maps planner permission keys to labels with a safe fallback', () => {
    expect(plannerPermissionLabel('guests')).toBe('Guests');
    expect(plannerPermissionLabel('unknown' as never)).toBe('Planner access');
  });

  it('normalizes saved RSVP question and meal config shapes', () => {
    expect(normalizeRsvpQuestions([
      { id: 'q1', label: 'Song request', type: 'long_text', required: true, appliesTo: 'reception', options: ['A', 2] },
      { id: 'missing-label', type: 'short_text' },
    ])).toEqual([
      {
        id: 'q1',
        label: 'Song request',
        type: 'long_text',
        required: true,
        appliesTo: 'reception',
        options: ['A'],
      },
    ]);

    expect(normalizeRsvpQuestions({ bad: true })).toEqual([]);
    expect(normalizeMealOptions(['Chicken', '', 3, 'Vegan'])).toEqual(['Chicken', 'Vegan']);
    expect(normalizeMealOptions(null)).toEqual(['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan']);
    expect(normalizeAllowedSiteLanguages(['es', 'fr', 'es', 'bad'])).toEqual(['es', 'fr']);
    expect(normalizeAllowedSiteLanguages(null, ['en'])).toEqual(['en']);
  });

  it('normalizes account names and site slugs before saving', () => {
    expect(splitCoupleNames('Alex & Jordan')).toEqual({ name1: 'Alex', name2: 'Jordan' });
    expect(splitCoupleNames('Alex')).toEqual({ name1: 'Alex', name2: '' });
    expect(normalizeSettingsSlug('https://dayof.love/site/Alex--Jordan!')).toBe('alex-jordan');
    expect(normalizeSettingsSlug('  --Our Wedding--  ')).toBe('ourwedding');
  });

  it('builds privacy updates without leaking blank password or token values', () => {
    expect(buildPrivacySettingsUpdates({
      privacyMode: 'public',
      hideFromSearch: true,
      defaultLanguage: 'en',
      allowedLanguages: ['en', 'es'],
      sitePasswordHash: 'hash',
      guestAccessToken: 'token',
    })).toEqual({
      privacy_mode: 'public',
      hide_from_search: true,
      default_language: 'en',
      wedding_data: {
        language_settings: {
          allowed_languages: ['en', 'es'],
        },
      },
    });

    expect(buildPrivacySettingsUpdates({
      privacyMode: 'password_protected',
      hideFromSearch: false,
      defaultLanguage: 'fr',
      allowedLanguages: ['fr'],
      sitePasswordHash: 'hash',
    })).toMatchObject({ site_password_hash: 'hash' });

    expect(buildPrivacySettingsUpdates({
      privacyMode: 'invite_only',
      hideFromSearch: false,
      defaultLanguage: 'es',
      allowedLanguages: ['fr'],
      guestAccessToken: 'token',
    })).toMatchObject({
      guest_access_token: 'token',
      wedding_data: {
        language_settings: {
          allowed_languages: ['es', 'fr'],
        },
      },
    });
  });

  it('cleans RSVP settings and preserves validation guardrails outside the page component', () => {
    const valid = cleanRsvpSettings({
      mealEnabled: true,
      mealOptions: [' Chicken ', '', 'Vegan'],
      questions: [
        { id: 'q1', label: ' Song? ', type: 'short_text', required: false, appliesTo: 'all', options: ['ignored'] },
        { id: 'q2', label: 'Meal side', type: 'single_choice', required: true, appliesTo: 'reception', options: [' Salad ', '', 'Soup'] },
        { id: 'q3', label: '   ', type: 'long_text', required: false, appliesTo: 'all', options: [] },
      ],
    });

    expect(valid).toEqual({
      validationError: null,
      cleanedMealOptions: ['Chicken', 'Vegan'],
      cleanedQuestions: [
        { id: 'q1', label: 'Song?', type: 'short_text', required: false, appliesTo: 'all', options: [] },
        { id: 'q2', label: 'Meal side', type: 'single_choice', required: true, appliesTo: 'reception', options: ['Salad', 'Soup'] },
      ],
    });

    expect(cleanRsvpSettings({
      mealEnabled: true,
      mealOptions: ['Only one'],
      questions: [],
    }).validationError).toBe('Meal choices need at least 2 options when enabled.');

    expect(cleanRsvpSettings({
      mealEnabled: false,
      mealOptions: ['Only one'],
      questions: [{ id: 'q1', label: 'Pick one', type: 'single_choice', required: false, appliesTo: 'all', options: ['Only'] }],
    }).validationError).toBe('Choice question "Pick one" needs at least 2 options.');
  });
});
