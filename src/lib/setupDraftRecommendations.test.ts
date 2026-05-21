import { describe, expect, it } from 'vitest';
import type { TemplateCatalogItem } from '../builder/constants/templateCatalog';
import { emptySetupDraft } from './setupDraft';
import { deriveSetupMode, getRecommendedTemplateMatches, getRecommendedTemplates, SETUP_STYLE_OPTIONS } from './setupDraftRecommendations';

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
  pageCount: 1,
  pageTitles: ['Home'],
  guestRoutes: ['/'],
  pageBlueprints: [{ title: 'Home', route: '/', sections: ['Hero', 'Story'] }],
  useCaseIds: [],
  readinessScore: 50,
  readinessLabel: 'Needs details',
  readinessGaps: ['Venue'],
  ...overrides,
});

describe('setupDraftRecommendations', () => {
  it('exposes bilingual and interfaith style options in guided setup', () => {
    expect(SETUP_STYLE_OPTIONS).toContain('Bilingual');
    expect(SETUP_STYLE_OPTIONS).toContain('Interfaith');
    expect(SETUP_STYLE_OPTIONS).toContain('Black tie');
    expect(SETUP_STYLE_OPTIONS).toContain('Guest interactive');
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
      blackTie: false,
      guestInteractive: false,
    });
  });

  it('derives formal and interactive setup modes from style preferences', () => {
    expect(deriveSetupMode({
      ...emptySetupDraft,
      stylePreferences: ['Black tie', 'Guest interactive'],
      guestEstimateBand: '',
    })).toEqual({
      destination: false,
      bilingual: false,
      interfaith: false,
      weekend: false,
      blackTie: true,
      guestInteractive: true,
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
        pageCount: 4,
        pageTitles: ['Home', 'Schedule', 'Travel', 'RSVP'],
        guestRoutes: ['/', '/schedule', '/travel', '/rsvp'],
      }),
    ];

    const [first] = getRecommendedTemplates({
      ...emptySetupDraft,
      stylePreferences: ['Destination', 'Weekend'],
      guestEstimateBand: '200plus',
    }, templates, 2);

    expect(first?.id).toBe('destination-adventure');
  });

  it('uses dedicated page routes when recommending full-weekend templates', () => {
    const templates = [
      makeTemplate({
        id: 'single-page-travel',
        name: 'Single Page Travel',
        styleTags: ['Destination'],
        description: 'Travel-first hotel itinerary',
        defaultSectionOrder: ['Hero', 'Travel', 'Schedule', 'RSVP'],
        pageCount: 1,
        guestRoutes: ['/'],
      }),
      makeTemplate({
        id: 'multi-page-weekend',
        name: 'Multi Page Weekend',
        styleTags: ['Destination'],
        description: 'Travel-first hotel itinerary',
        defaultSectionOrder: ['Hero', 'Travel', 'Schedule', 'RSVP'],
        pageCount: 4,
        pageTitles: ['Home', 'Schedule', 'Travel', 'RSVP'],
        guestRoutes: ['/', '/schedule', '/travel', '/rsvp'],
      }),
    ];

    const [first] = getRecommendedTemplates({
      ...emptySetupDraft,
      stylePreferences: ['Destination', 'Weekend'],
      guestEstimateBand: '',
    }, templates, 1);

    expect(first?.id).toBe('multi-page-weekend');
  });

  it('returns transparent recommendation reasons with scores', () => {
    const templates = [
      makeTemplate({ id: 'modern-clean', name: 'Modern Clean' }),
      makeTemplate({
        id: 'coastal-weekend',
        name: 'Coastal Weekend',
        styleTags: ['Destination'],
        description: 'Destination weekend with hotel travel notes',
        pageCount: 4,
        guestRoutes: ['/', '/schedule', '/travel', '/rsvp'],
      }),
    ];

    const [first] = getRecommendedTemplateMatches({
      ...emptySetupDraft,
      stylePreferences: ['Destination', 'Weekend'],
      guestEstimateBand: '',
    }, templates, 1);

    expect(first.template.id).toBe('coastal-weekend');
    expect(first.score).toBeGreaterThan(0);
    expect(first.isFallback).toBe(false);
    expect(first.reasons).toEqual(expect.arrayContaining([
      'Includes a dedicated travel page',
      'Separates schedule and RSVP',
    ]));
  });

  it('explains fallback recommendations when no preferences are selected', () => {
    const matches = getRecommendedTemplateMatches(emptySetupDraft, [
      makeTemplate({ id: 'a', name: 'A' }),
    ], 1);

    expect(matches).toEqual([
      expect.objectContaining({
        score: 0,
        isFallback: true,
        reasons: ['Good all-purpose starting point'],
      }),
    ]);
  });

  it('boosts black-tie and guest-interactive templates from richer catalog metadata', () => {
    const templates = [
      makeTemplate({ id: 'modern-clean', name: 'Modern Clean', styleTags: ['Modern'] }),
      makeTemplate({
        id: 'black-tie-ballroom',
        name: 'Black Tie Ballroom',
        styleTags: ['Classic', 'Formal'],
        description: 'Formal invitation wording for a ballroom wedding',
        includedModules: ['Hero', 'Dress Code', 'Menu', 'RSVP'],
      }),
      makeTemplate({
        id: 'playful-color',
        name: 'Playful Color',
        styleTags: ['Bold'],
        description: 'Music, guestbook, and photo moments for guests',
        includedModules: ['Hero', 'Music', 'Quotes', 'Gallery'],
      }),
    ];

    expect(getRecommendedTemplates({
      ...emptySetupDraft,
      stylePreferences: ['Black tie'],
      guestEstimateBand: '',
    }, templates, 1)[0]?.id).toBe('black-tie-ballroom');

    expect(getRecommendedTemplates({
      ...emptySetupDraft,
      stylePreferences: ['Guest interactive'],
      guestEstimateBand: '',
    }, templates, 1)[0]?.id).toBe('playful-color');
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

  it('returns no recommendations when the requested limit is zero', () => {
    const templates = [
      makeTemplate({ id: 'a', name: 'A' }),
      makeTemplate({ id: 'b', name: 'B' }),
    ];

    expect(getRecommendedTemplates(emptySetupDraft, templates, 0)).toEqual([]);
  });

  it('normalizes fractional and invalid limits before slicing recommendations', () => {
    const templates = [
      makeTemplate({ id: 'a', name: 'A' }),
      makeTemplate({ id: 'b', name: 'B' }),
      makeTemplate({ id: 'c', name: 'C' }),
    ];

    expect(getRecommendedTemplates(emptySetupDraft, templates, 1.9).map((template) => template.id)).toEqual(['a']);
    expect(getRecommendedTemplates(emptySetupDraft, templates, Number.NaN)).toEqual([]);
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
