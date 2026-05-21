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
const mockI18n = vi.hoisted(() => ({
  language: 'en',
  changeLanguage: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockRouteParams,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (value: string) => value, i18n: mockI18n }),
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
import { createDemoFallbackPages, createDemoWeddingDataForSlug } from './siteViewDemoFallback';
import { SiteView } from './SiteView';
import { resolveSiteViewAnalyticsTarget } from './siteViewAnalyticsTarget';

function removeInjectedNoindexMeta() {
  document.getElementById('dayof-noindex')?.remove();
  Array.from(document.head.children)
    .filter((node): node is HTMLMetaElement => node instanceof HTMLMetaElement)
    .filter((node) => node.getAttribute('name') === 'robots' && node.getAttribute('data-dayof-noindex') === '1')
    .forEach((node) => node.remove());
}

beforeEach(() => {
  mockRouteParams.slug = undefined;
  mockSearchParams = new URLSearchParams();
  mockSetSearchParams.mockReset();
  fetchPublicSiteAccessMock.mockReset();
  fetchPublicItineraryRowsMock.mockReset();
  hasLiveRegistryItemsMock.mockReset();
  trackGuestHubEventMock.mockReset();
  mockI18n.language = 'en';
  mockI18n.changeLanguage.mockReset();
  fetchPublicItineraryRowsMock.mockResolvedValue([]);
  hasLiveRegistryItemsMock.mockResolvedValue(false);
  trackGuestHubEventMock.mockResolvedValue(undefined);
  sessionStorage.clear();
  removeInjectedNoindexMeta();
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  sessionStorage.clear();
  removeInjectedNoindexMeta();
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
        privacy_mode: 'public',
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

  it('adds noindex metadata for blocked invite-only public views', async () => {
    mockRouteParams.slug = 'maya-and-leo';
    mockSearchParams = new URLSearchParams('invite_token=blocked-guest');

    fetchPublicSiteAccessMock.mockResolvedValue({
      status: 'invite_required',
      site: null,
    });

    render(React.createElement(SiteView));

    await screen.findByText('site view ready');

    await waitFor(() => {
      const robots = document.getElementById('dayof-noindex');
      expect(robots).toHaveAttribute('content', expect.stringContaining('noindex'));
    });
  });
});

describe('SiteView demo continuity', () => {
  it('builds multi-page local demo previews from the requested public slug', () => {
    const pages = createDemoFallbackPages('modern-luxe');
    const data = createDemoWeddingDataForSlug('maya-and-leo');

    expect(pages.length).toBeGreaterThan(1);
    expect(pages.map((page) => page.slug)).toEqual(expect.arrayContaining(['home', 'schedule', 'travel', 'rsvp', 'registry']));
    expect(data.couple.partner1Name).toBe('Maya');
    expect(data.couple.partner2Name).toBe('Leo');
    expect(data.couple.displayName).toBe('Maya and Leo');
  });

  it('opens local demo previews without waiting on live public access when no guest token is present', async () => {
    mockRouteParams.slug = 'maya-and-leo';

    render(React.createElement(SiteView));

    await screen.findByText('site view ready');

    expect(fetchPublicSiteAccessMock).not.toHaveBeenCalled();
  });

  it('keeps guest-token links on the live public access path even in demo mode', async () => {
    mockRouteParams.slug = 'maya-and-leo';
    mockSearchParams = new URLSearchParams('invite_token=guest-token');

    fetchPublicSiteAccessMock.mockResolvedValue({
      status: 'coming_soon',
      site: null,
    });

    render(React.createElement(SiteView));

    await screen.findByText('site view ready');

    expect(fetchPublicSiteAccessMock).toHaveBeenCalledWith(expect.objectContaining({
      inviteToken: 'guest-token',
      slug: 'maya-and-leo',
    }));
  });
});
