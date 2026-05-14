import { describe, expect, it } from 'vitest';
import {
  embedTranslatedRsvpAssets,
  normalizeRsvpQuestionTranslations,
  readTranslatedRsvpAssets,
  resolveLocalizedRsvpConfig,
} from './rsvpTranslationAssets';

describe('rsvpTranslationAssets', () => {
  it('normalizes RSVP question rows and drops malformed entries', () => {
    expect(normalizeRsvpQuestionTranslations([
      { id: 'song', label: 'Song request', type: 'short_text', required: false, appliesTo: 'all' },
      { bad: true },
    ])).toEqual([
      { id: 'song', label: 'Song request', type: 'short_text', required: false, appliesTo: 'all' },
    ]);
  });

  it('embeds translated RSVP assets into translated wedding data without dropping existing fields', () => {
    expect(embedTranslatedRsvpAssets(
      { welcome: 'hola', translation_meta: { existing: true } },
      {
        questions: [{ id: 'meal', label: 'Plato principal', type: 'single_choice', required: true, appliesTo: 'all', options: ['Pollo', 'Verduras'] }],
        mealConfig: { enabled: true, options: ['Pollo', 'Verduras'] },
      },
    )).toMatchObject({
      welcome: 'hola',
      translation_meta: {
        existing: true,
        rsvp_custom_questions: [{ id: 'meal', label: 'Plato principal' }],
        rsvp_meal_config: { enabled: true, options: ['Pollo', 'Verduras'] },
      },
    });
  });

  it('reads translated RSVP assets back out of translated wedding data', () => {
    expect(readTranslatedRsvpAssets({
      translation_meta: {
        rsvp_custom_questions: [{ id: 'song', label: 'Canción', type: 'short_text', required: false, appliesTo: 'all' }],
        rsvp_meal_config: { enabled: false, options: ['Vegetariano', 'Pescado'] },
      },
    })).toEqual({
      questions: [{ id: 'song', label: 'Canción', type: 'short_text', required: false, appliesTo: 'all' }],
      mealConfig: { enabled: false, options: ['Vegetariano', 'Pescado'] },
    });
  });

  it('returns translated RSVP questions and meal choices for allowed non-default guest languages', () => {
    expect(resolveLocalizedRsvpConfig({
      baseQuestions: [{ id: 'song', label: 'Song request', type: 'short_text', required: false, appliesTo: 'all' }],
      baseMealConfig: { enabled: true, options: ['Chicken', 'Fish'] },
      requestedLanguage: 'es',
      siteDefaultLanguage: 'en',
      weddingData: { language_settings: { allowed_languages: ['en', 'es'] } },
      translatedWeddingData: {
        translation_meta: {
          rsvp_custom_questions: [{ id: 'song', label: 'Canción favorita', type: 'short_text', required: false, appliesTo: 'all' }],
          rsvp_meal_config: { enabled: true, options: ['Pollo', 'Pescado'] },
        },
      },
    })).toEqual({
      questions: [{ id: 'song', label: 'Canción favorita', type: 'short_text', required: false, appliesTo: 'all' }],
      mealConfig: { enabled: true, options: ['Pollo', 'Pescado'] },
    });
  });

  it('falls back to base RSVP config when the requested language is not allowed or not translated', () => {
    expect(resolveLocalizedRsvpConfig({
      baseQuestions: [{ id: 'song', label: 'Song request', type: 'short_text', required: false, appliesTo: 'all' }],
      baseMealConfig: { enabled: true, options: ['Chicken', 'Fish'] },
      requestedLanguage: 'de',
      siteDefaultLanguage: 'en',
      weddingData: { language_settings: { allowed_languages: ['en', 'es'] } },
      translatedWeddingData: {
        translation_meta: {
          rsvp_custom_questions: [{ id: 'song', label: 'Lied', type: 'short_text', required: false, appliesTo: 'all' }],
        },
      },
    })).toEqual({
      questions: [{ id: 'song', label: 'Song request', type: 'short_text', required: false, appliesTo: 'all' }],
      mealConfig: { enabled: true, options: ['Chicken', 'Fish'] },
    });
  });
});
