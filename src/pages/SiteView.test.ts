import { describe, expect, it, vi } from 'vitest';

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
  combineDateAndTime,
  createAlexJordanDemoWeddingData,
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
});

describe('combineDateAndTime', () => {
  it('drops impossible persisted itinerary dates instead of rolling them forward', () => {
    expect(combineDateAndTime('2027-02-30', '16:30')).toBeUndefined();
  });

  it('drops malformed persisted itinerary times instead of producing broken schedule timestamps', () => {
    expect(combineDateAndTime('2027-02-17', '4:30 PM')).toBeUndefined();
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
    expect(SITE_INVITE_ONLY_HELP).toBe('If you received an invitation, check your email for the wedding access link from the couple.');
  });
});
