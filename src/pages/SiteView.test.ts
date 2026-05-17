import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockRouteParams: { slug?: string } = {};
let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();
const fetchPublicSiteAccessMock = vi.fn();
const fetchPublicItineraryRowsMock = vi.fn();
const hasLiveRegistryItemsMock = vi.fn();
const trackGuestHubEventMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockRouteParams,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
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

vi.mock('../config/env', () => ({
  DEMO_MODE: true,
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

vi.mock('../lib/publicSiteAccess', () => ({
  fetchPublicSiteAccess: (...args: unknown[]) => fetchPublicSiteAccessMock(...args),
  requestPublicSitePasswordUnlock: vi.fn(),
}));

vi.mock('../lib/publicSiteProject', () => ({
  getIsPublishedFromSiteRow: vi.fn(() => false),
  getPublicBuilderProject: vi.fn(() => null),
  getPublicWeddingData: vi.fn(() => null),
}));

vi.mock('./siteViewService', () => ({
  fetchPublicItineraryRows: (...args: unknown[]) => fetchPublicItineraryRowsMock(...args),
  hasLiveRegistryItems: (...args: unknown[]) => hasLiveRegistryItemsMock(...args),
}));

vi.mock('./SiteViewRouteView', () => ({
  SiteViewRouteView: () => React.createElement('div', null, 'site view ready'),
}));

vi.mock('./guestHubPublicService', () => ({
  trackGuestHubEvent: (...args: unknown[]) => trackGuestHubEventMock(...args),
}));

import { combineDateAndTime, createAlexJordanDemoWeddingData, toIsoDateOrUndefined } from './siteViewHelpers';
import { getUrlWithoutPublicAccessToken } from '../lib/publicAccessArtifacts';
import { resolveSiteViewAnalyticsTarget, SiteView } from './SiteView';

beforeEach(() => {
  mockRouteParams.slug = undefined;
  mockSearchParams = new URLSearchParams();
  mockSetSearchParams.mockReset();
  fetchPublicSiteAccessMock.mockReset();
  fetchPublicItineraryRowsMock.mockReset();
  hasLiveRegistryItemsMock.mockReset();
  trackGuestHubEventMock.mockReset();
  fetchPublicItineraryRowsMock.mockResolvedValue([]);
  hasLiveRegistryItemsMock.mockResolvedValue(false);
  trackGuestHubEventMock.mockResolvedValue(undefined);
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

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

  it('also strips invite_token guest-hub handoff links from the visible URL once stored', () => {
    expect(getUrlWithoutPublicAccessToken('/site/maya-leo?invite_token=secret&lang=es#travel', 'https://dayof.love'))
      .toBe('/site/maya-leo?lang=es#travel');
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

describe('SiteView invite handoff continuity', () => {
  it('loads a guest-hub travel handoff link through invite_token, stores access, and strips it from the visible site URL', async () => {
    mockRouteParams.slug = 'maya-and-leo';
    mockSearchParams = new URLSearchParams('invite_token=guest-link&guestLang=fr');
    window.history.replaceState({}, '', '/site/maya-and-leo?invite_token=guest-link&guestLang=fr#travel');

    fetchPublicSiteAccessMock.mockResolvedValue({
      status: 'open',
      site: {
        id: 'site-1',
        site_slug: 'maya-and-leo',
        site_url: 'https://dayof.love/site/maya-and-leo',
        is_published: true,
        couple_name_1: 'Maya',
        couple_name_2: 'Leo',
        wedding_date: null,
        venue_name: null,
        wedding_location: null,
        template_id: 'modern-luxe',
        default_language: 'en',
        allow_search_indexing: true,
        render_model: {
          wedding: null,
          pages: [
            {
              id: 'home',
              title: 'Home',
              slug: 'home',
              orderIndex: 0,
              meta: { isHome: true },
              sections: [],
            },
          ],
          theme: {
            preset: null,
            tokens: null,
          },
        },
      },
    });

    render(React.createElement(SiteView));

    await waitFor(() => {
      expect(fetchPublicSiteAccessMock).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'maya-and-leo',
        inviteToken: 'guest-link',
        language: 'en',
      }));
    });

    await screen.findByText('site view ready');

    expect(sessionStorage.getItem('dayof_invite_token_maya-and-leo')).toBe('guest-link');
    expect(window.location.pathname).toBe('/site/maya-and-leo');
    expect(window.location.search).toBe('?guestLang=fr');
    expect(window.location.hash).toBe('#travel');
  });
});

describe('SiteView demo continuity', () => {
  it('falls back to the alex-jordan demo surface when public access returns coming soon in demo mode', async () => {
    mockRouteParams.slug = 'alex-jordan-demo';

    fetchPublicSiteAccessMock.mockResolvedValue({
      status: 'coming_soon',
      site: null,
    });

    render(React.createElement(SiteView));

    await screen.findByText('site view ready');
  });
});
