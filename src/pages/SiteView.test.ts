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
  getPublicWeddingData: vi.fn(() => null),
}));

import { combineDateAndTime, createAlexJordanDemoWeddingData, toIsoDateOrUndefined } from './siteViewHelpers';
import { getUrlWithoutPublicAccessToken } from '../lib/publicAccessArtifacts';
import { resolveSiteViewAnalyticsTarget } from './SiteView';

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

describe('getUrlWithoutPublicAccessToken', () => {
  it('strips only the public invite access token from a site URL', () => {
    expect(getUrlWithoutPublicAccessToken('/site/maya-leo?token=secret&lang=es#schedule', 'https://dayof.love'))
      .toBe('/site/maya-leo?lang=es#schedule');
  });

  it('preserves token-free URLs unchanged', () => {
    expect(getUrlWithoutPublicAccessToken('/site/maya-leo?lang=es#schedule', 'https://dayof.love'))
      .toBe('/site/maya-leo?lang=es#schedule');
  });
});

describe('resolveSiteViewAnalyticsTarget', () => {
  it('classifies QR and invite entry separately from ordinary public site visits', () => {
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('entry=qr'))).toBe('/site/qr');
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('token=private-invite'))).toBe('/site/invite');
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('invite_token=guest-invite'))).toBe('/site/invite');
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('passwordSession=session-1'))).toBe('/site/invite');
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('lang=es'))).toBe('/site');
  });
});
