import { describe, expect, it } from 'vitest';
import type { TemplateCatalogItem } from '../builder/constants/templateCatalog';
import { emptySetupDraft } from './setupDraft';
import { deriveSetupMode, getRecommendedTemplates, SETUP_STYLE_OPTIONS } from './setupDraftRecommendations';

const makeTemplate = (overrides: Partial<TemplateCatalogItem>): TemplateCatalogItem => ({
  id: 'template-a',
  name: 'Template A',
  previewImage: '/a.webp',
  previewFallbackImage: '/fallback.svg',
  styleTags: ['Modern'],
  seasonTags: ['Spring'],
  colorwayId: 'ivory-ink',
  designFamily: 'template-a',
  description: 'Clean wedding website',
  bestFor: ['Modern weddings'],
  includedModules: ['Hero'],
  defaultSectionOrder: ['Hero', 'Story'],
  ...overrides,
});

describe('setupDraftRecommendations', () => {
  it('exposes bilingual and interfaith style options in guided setup', () => {
    expect(SETUP_STYLE_OPTIONS).toContain('Bilingual');
    expect(SETUP_STYLE_OPTIONS).toContain('Interfaith');
  });

  it('derives setup mode flags from style preferences and guest count', () => {
    expect(deriveSetupMode({
      ...emptySetupDraft,
      stylePreferences: ['Destination', 'Bilingual', 'Interfaith'],
      guestEstimateBand: '200plus',
    })).toEqual({
      destination: true,
      bilingual: true,
      interfaith: true,
      weekend: true,
    });
  });

  it('boosts destination-ready templates for destination and weekend setups', () => {
    const templates = [
      makeTemplate({ id: 'modern-clean', name: 'Modern Clean' }),
      makeTemplate({
        id: 'destination-adventure',
        name: 'Destination Adventure',
        styleTags: ['Destination', 'Modern'],
        description: 'Travel-first getaway with hotel details',
        defaultSectionOrder: ['Hero', 'Travel', 'Schedule'],
      }),
    ];

    const [first] = getRecommendedTemplates({
      ...emptySetupDraft,
      stylePreferences: ['Destination', 'Weekend'],
      guestEstimateBand: '200plus',
    }, templates, 2);

    expect(first?.id).toBe('destination-adventure');
  });

  it('boosts ceremony-and-guidance templates for interfaith setups', () => {
    const templates = [
      makeTemplate({ id: 'modern-clean', name: 'Modern Clean', styleTags: ['Modern'] }),
      makeTemplate({
        id: 'refined-elegance',
        name: 'Refined Elegance',
        styleTags: ['Classic'],
        description: 'Ceremony details with family guidance and schedule context',
        defaultSectionOrder: ['Hero', 'Story', 'Schedule', 'FAQ'],
      }),
    ];

    const [first] = getRecommendedTemplates({
      ...emptySetupDraft,
      stylePreferences: ['Interfaith'],
      guestEstimateBand: '',
    }, templates, 2);

    expect(first?.id).toBe('refined-elegance');
  });

  it('fills sparse recommendation sets with stable fallback templates', () => {
    const templates = [
      makeTemplate({ id: 'a', name: 'A', styleTags: ['Classic'] }),
      makeTemplate({ id: 'b', name: 'B', styleTags: ['Destination'], description: 'Travel-first hotel itinerary' }),
      makeTemplate({ id: 'c', name: 'C', styleTags: ['Floral'] }),
      makeTemplate({ id: 'd', name: 'D', styleTags: ['Bold'] }),
    ];

    expect(getRecommendedTemplates({
      ...emptySetupDraft,
      stylePreferences: ['Destination'],
      guestEstimateBand: '',
    }, templates, 3).map((template) => template.id)).toEqual(['b', 'a', 'c']);
  });

  it('falls back to the first templates when no setup preferences exist', () => {
    const templates = [
      makeTemplate({ id: 'a', name: 'A' }),
      makeTemplate({ id: 'b', name: 'B' }),
      makeTemplate({ id: 'c', name: 'C' }),
      makeTemplate({ id: 'd', name: 'D' }),
    ];

    expect(getRecommendedTemplates(emptySetupDraft, templates, 3).map((template) => template.id)).toEqual(['a', 'b', 'c']);
  });

  it('matches setup preferences case-insensitively and ignores whitespace noise', () => {
    const templates = [
      makeTemplate({ id: 'clean', name: 'Clean', styleTags: ['Modern'] }),
      makeTemplate({ id: 'trip', name: 'Trip', styleTags: ['Destination'], description: 'Travel-first hotel itinerary' }),
    ];

    const [first] = getRecommendedTemplates({
      ...emptySetupDraft,
      stylePreferences: ['  destination  ', 'modern'],
      guestEstimateBand: '',
    }, templates, 1);

    expect(first?.id).toBe('trip');
  });

  it('rewards multi-day destination copy when both destination and weekend are selected', () => {
    const templates = [
      makeTemplate({
        id: 'destination-weekend',
        name: 'Destination Weekend',
        styleTags: ['Destination'],
        description: 'Multi-day getaway with hotel details and travel notes',
      }),
      makeTemplate({
        id: 'destination-basic',
        name: 'Destination Basic',
        styleTags: ['Destination'],
        description: 'Travel-first hotel itinerary',
      }),
    ];

    const [first] = getRecommendedTemplates({
      ...emptySetupDraft,
      stylePreferences: ['Destination', 'Weekend'],
      guestEstimateBand: '200plus',
    }, templates, 1);

    expect(first?.id).toBe('destination-weekend');
  });
});
