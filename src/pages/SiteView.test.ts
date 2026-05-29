import { describe, expect, it, vi } from 'vitest';
import { createEmptyWeddingData } from '../types/weddingData';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value, i18n: { language: 'en' } }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({ select: vi.fn() })),
  },
}));

vi.mock('../data/siteRepository', () => ({
  siteRepository: {
    fetchPublishedSections: vi.fn(),
  },
}));

vi.mock('../sections/sectionRegistry', () => ({
  getSectionComponent: vi.fn(),
  getSectionVariants: vi.fn(() => []),
}));

vi.mock('../builder/components/SectionRenderer', () => ({
  SectionRenderer: () => null,
}));

vi.mock('../render/PageRenderer', () => ({
  PageRenderer: () => null,
}));

vi.mock('../lib/themePresets', () => ({
  applyThemePreset: vi.fn(),
  applyThemeTokens: vi.fn(),
}));

vi.mock('../lib/mediaUrl', () => ({
  rewriteSignedMediaUrlsToPublicDeep: vi.fn((value) => value),
}));

vi.mock('../lib/archiveMode', () => ({
  getArchiveModeDescriptor: vi.fn(() => null),
}));

vi.mock('../lib/siteVisibilityState', () => ({
  getSiteVisibilityState: vi.fn(() => ({ isLocked: false })),
}));

vi.mock('../lib/publicSiteProject', () => ({
  getIsPublishedFromSiteRow: vi.fn(() => false),
  getPublicBuilderProject: vi.fn(() => null),
  getPublicBuilderV2Document: vi.fn(() => null),
  getPublicWeddingData: vi.fn(() => null),
}));

import {
  buildPublicSiteMetadata,
  combineDateAndTime,
  createAlexJordanDemoWeddingData,
  normalizeSectionVariants,
  SITE_LOAD_ERROR_TITLE,
  SITE_INVALID_URL_ERROR,
  SITE_INVITE_ONLY_HELP,
  SITE_LOAD_RETRY_ERROR,
  SITE_NOT_FOUND_ERROR,
  SITE_PASSWORD_MISMATCH_ERROR,
  SITE_PASSWORD_RETRY_ERROR,
  SITE_SETUP_PENDING_ERROR,
  toIsoDateOrUndefined,
} from './SiteView';

describe('createAlexJordanDemoWeddingData', () => {
  it('skips invalid demo wedding dates instead of crashing public demo hydration', () => {
    expect(() => createAlexJordanDemoWeddingData({ wedding_date: 'not-a-date' })).not.toThrow();

    const data = createAlexJordanDemoWeddingData({ wedding_date: 'not-a-date' });

    expect(data.event.weddingDateISO).toBeUndefined();
  });

  it('skips impossible demo wedding dates instead of rolling them into fake public dates', () => {
    const data = createAlexJordanDemoWeddingData({ wedding_date: '2027-02-30' });

    expect(data.event.weddingDateISO).toBeUndefined();
    expect(toIsoDateOrUndefined('2027-02-30')).toBeUndefined();
  });

  it('builds a guest-ready canonical demo dataset instead of leaving public proof sections empty', () => {
    const data = createAlexJordanDemoWeddingData();

    expect(data.couple.displayName).toBe('Alex Thompson & Jordan Rivera');
    expect(data.couple.story).toMatch(/mutual friends/i);
    expect(data.venues[0]?.name).toBe('Sunset Gardens Estate');
    expect(data.schedule.map((item) => item.label)).toContain('Ceremony');
    expect(data.travel.hotelInfo).toMatch(/room blocks/i);
    expect(data.registry.links.length).toBeGreaterThan(0);
  });
});

describe('combineDateAndTime', () => {
  it('drops impossible persisted itinerary dates instead of rolling them forward', () => {
    expect(combineDateAndTime('2027-02-30', '16:30')).toBeUndefined();
  });

  it('drops malformed persisted itinerary times instead of producing broken schedule timestamps', () => {
    expect(combineDateAndTime('2027-02-17', '4:30 PM')).toBeUndefined();
  });
});

describe('buildPublicSiteMetadata', () => {
  it('builds a public-facing title, description, and canonical url without leaking invite params', () => {
    window.history.replaceState({}, '', '/alex-jordan?page=weekend&invite_token=secret&previewGuest=guest-1');

    const metadata = buildPublicSiteMetadata({
      weddingData: {
        ...createEmptyWeddingData(),
        couple: {
          partner1Name: 'Alex',
          partner2Name: 'Jordan',
          displayName: 'Alex & Jordan',
          story: 'A September weekend in Napa.',
        },
        event: {
          weddingDateISO: '2027-09-14T16:00:00.000Z',
          timezone: '',
        },
        venues: [{ id: 'venue-1', name: 'Main Lawn' }],
        media: {
          heroImageUrl: 'https://example.com/hero.jpg',
          gallery: [],
        },
      },
      activePageTitle: 'Weekend',
      pageSlug: 'weekend',
      hideFromSearch: false,
      isComingSoon: false,
      privacyGate: 'open',
      error: null,
    });

    expect(metadata.title).toBe('Weekend | Alex & Jordan');
    expect(metadata.description).toBe('A September weekend in Napa.');
    expect(metadata.canonicalUrl).toBe('http://localhost:3000/alex-jordan?page=weekend');
    expect(metadata.imageUrl).toBe('https://example.com/hero.jpg');
    expect(metadata.noIndex).toBe(false);
  });

  it('marks non-public states as noindex and falls back to calm wedding copy', () => {
    window.history.replaceState({}, '', '/taylor-riley?invite_token=secret');

    const metadata = buildPublicSiteMetadata({
      weddingData: {
        ...createEmptyWeddingData(),
        couple: {
          partner1Name: 'Taylor',
          partner2Name: 'Riley',
          displayName: 'Taylor & Riley',
          story: '',
        },
      },
      hideFromSearch: false,
      isComingSoon: true,
      privacyGate: 'invite_only',
      error: null,
    });

    expect(metadata.title).toBe('Taylor & Riley');
    expect(metadata.description).toBe('Celebrate with Taylor & Riley.');
    expect(metadata.canonicalUrl).toBe('http://localhost:3000/taylor-riley');
    expect(metadata.noIndex).toBe(true);
  });
});

describe('normalizeSectionVariants', () => {
  it('falls back unsupported builder variants to guest-safe public variants', () => {
    const normalized = normalizeSectionVariants([
      {
        id: 'hero-1',
        type: 'hero',
        variant: 'video',
        enabled: true,
        locked: false,
        orderIndex: 0,
        settings: {},
        styleOverrides: {},
        bindings: {},
        meta: { createdAtISO: '2026-05-28T00:00:00.000Z', updatedAtISO: '2026-05-28T00:00:00.000Z' },
      },
      {
        id: 'registry-1',
        type: 'registry',
        variant: 'luxury',
        enabled: true,
        locked: false,
        orderIndex: 1,
        settings: {},
        styleOverrides: {},
        bindings: {},
        meta: { createdAtISO: '2026-05-28T00:00:00.000Z', updatedAtISO: '2026-05-28T00:00:00.000Z' },
      },
      {
        id: 'gallery-1',
        type: 'gallery',
        variant: 'fullwidth',
        enabled: true,
        locked: false,
        orderIndex: 2,
        settings: {},
        styleOverrides: {},
        bindings: {},
        meta: { createdAtISO: '2026-05-28T00:00:00.000Z', updatedAtISO: '2026-05-28T00:00:00.000Z' },
      },
      {
        id: 'story-1',
        type: 'story',
        variant: 'editorial',
        enabled: true,
        locked: false,
        orderIndex: 3,
        settings: {},
        styleOverrides: {},
        bindings: {},
        meta: { createdAtISO: '2026-05-28T00:00:00.000Z', updatedAtISO: '2026-05-28T00:00:00.000Z' },
      },
    ]);

    expect(normalized.map((section) => section.variant)).toEqual([
      'default',
      'featured',
      'default',
      'default',
    ]);
  });
});

describe('SiteView public-safe copy', () => {
  it('keeps public gate and load errors guest-safe and calm', () => {
    expect(SITE_PASSWORD_MISMATCH_ERROR).toBe('That password did not match. Please try again.');
    expect(SITE_PASSWORD_RETRY_ERROR).toBe('We could not check that password right now. Please try again.');
    expect(SITE_INVALID_URL_ERROR).toBe('This wedding page link is not valid.');
    expect(SITE_NOT_FOUND_ERROR).toBe('This wedding page could not be found.');
    expect(SITE_SETUP_PENDING_ERROR).toBe('This wedding page is still being set up. Please check back soon.');
    expect(SITE_LOAD_RETRY_ERROR).toBe('We could not load this wedding page right now. Please try again.');
    expect(SITE_LOAD_ERROR_TITLE).toBe('We couldn’t open this wedding page right now.');
    expect(SITE_INVITE_ONLY_HELP).toBe('If you received an invitation, check your email for the wedding access link from the couple.');
  });
});
