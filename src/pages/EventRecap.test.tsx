import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'event_recap.eyebrow': 'Wedding recap',
        'event_recap.subtitle': 'Guest photos, highlights, and memory chapters from the wedding weekend.',
        'event_recap.back_hub': 'Back to guest hub',
        'event_recap.share_recap': 'Share recap',
        'event_recap.shared_uploads': 'Shared uploads',
        'event_recap.top_moments': 'Top moments',
        'event_recap.memory_chapters': 'Memory chapters',
        'event_recap.curated_picks': 'Curated picks',
        'event_recap.loading': 'Loading recap...',
        'event_recap.get_album': 'Get the album',
        'event_recap.send_me': 'Send me the recap',
        'event_recap.send_me_detail': 'Leave an email or phone and we will send the recap when it is ready.',
        'event_recap.phone_optional': 'Phone (optional)',
        'event_recap.own_event': 'I want a dayof link for my own event someday.',
        'event_recap.get_recap': 'Get recap',
        'event_recap.create_own': 'Create your own dayof',
        'guest_hub.saving': 'Saving...',
      };
      if (key === 'event_recap.shared_by') return `Shared by ${params?.name}`;
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('../components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => React.createElement('div', { 'data-testid': 'language-switcher' }),
}));

vi.mock('../lib/copyText', () => ({
  copyTextOrDownload: vi.fn(async () => 'copied'),
}));

import { EventRecap, buildEventRecapAccessHeaders, buildEventRecapGuestHubAccessPayload, formatEventRecapAlbumLabel, friendlyEventRecapError, resolveEventRecapViewTarget, safeEventRecapFunctionError } from './EventRecap';

const recapPayload = {
  site: {
    slug: 'ericandkaras',
    coupleName1: 'Eric',
    coupleName2: 'Kara',
    weddingDate: '2026-06-20',
    recapStatus: 'published',
    recapPublishedAt: '2026-06-21T00:00:00Z',
  },
  summary: {
    uploadCount: 4,
    highlightCount: 0,
    chapterCount: 1,
    curatedCount: 0,
  },
  highlights: [],
  chapters: [
    {
      date: '2026-06-20',
      count: 4,
      highlights: [],
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('guest-recap-config')) {
      return new Response(JSON.stringify(recapPayload), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('buildEventRecapGuestHubAccessPayload', () => {
  it('packages current invite token and password session for recap telemetry', () => {
    window.history.replaceState({}, '', '/event/ericandkaras/recap?token=current-invite');
    sessionStorage.setItem('dayof_invite_token_ericandkaras', 'stored-invite');
    sessionStorage.setItem('dayof_pw_session_ericandkaras', 'password-session');

    expect(buildEventRecapGuestHubAccessPayload('ericandkaras')).toEqual({
      inviteToken: 'current-invite',
      passwordSession: 'password-session',
    });
  });

  it('falls back to stored invite access for shared recap links', () => {
    sessionStorage.setItem('dayof_invite_token_ericandkaras', 'stored-invite');

    expect(buildEventRecapGuestHubAccessPayload('ericandkaras')).toEqual({
      inviteToken: 'stored-invite',
      passwordSession: null,
    });
  });
});

describe('buildEventRecapAccessHeaders', () => {
  it('adds only present access artifacts for the gated recap request', () => {
    window.history.replaceState({}, '', '/event/ericandkaras/recap?token=current-invite');
    sessionStorage.setItem('dayof_pw_session_ericandkaras', 'password-session');

    expect(buildEventRecapAccessHeaders('ericandkaras')).toEqual({
      'x-dayof-invite-token': 'current-invite',
      'x-dayof-password-session': 'password-session',
    });
  });

  it('omits empty access headers for normal public recap requests', () => {
    expect(buildEventRecapAccessHeaders('ericandkaras')).toEqual({});
  });
});

describe('resolveEventRecapViewTarget', () => {
  it('counts gated recap entry as an invite-open route', () => {
    expect(resolveEventRecapViewTarget({
      inviteToken: 'current-invite',
      passwordSession: null,
    })).toBe('/event/recap/invite');
  });

  it('keeps ungated recap entry on the plain recap route', () => {
    expect(resolveEventRecapViewTarget({
      inviteToken: null,
      passwordSession: null,
    })).toBe('/event/recap');
  });
});

describe('formatEventRecapAlbumLabel', () => {
  it('turns saved bucket names into guest-facing album labels', () => {
    expect(formatEventRecapAlbumLabel('dance_floor_bucket')).toBe('Dance Floor Album');
    expect(formatEventRecapAlbumLabel('cocktail-hour')).toBe('Cocktail Hour');
  });

  it('uses a soft fallback for empty values', () => {
    expect(formatEventRecapAlbumLabel('')).toBe('Wedding moment');
  });
});

describe('friendlyEventRecapError', () => {
  it('hides server and storage details from guest recap opt-in failures', () => {
    expect(friendlyEventRecapError(new Error('storage bucket policy denied token'), 'Please try again.')).toBe('Please try again.');
    expect(safeEventRecapFunctionError('storage bucket policy denied token', 'Please try again.')).toBe('Please try again.');
  });

  it('keeps plain guest-safe copy', () => {
    expect(friendlyEventRecapError(new Error('Add an email or phone so we can send the recap.'), 'Please try again.')).toBe('Add an email or phone so we can send the recap.');
    expect(safeEventRecapFunctionError('Add an email or phone so we can send the recap.', 'Please try again.')).toBe('Add an email or phone so we can send the recap.');
  });
});

describe('EventRecap opt-in form', () => {
  it('labels guest opt-in fields and announces missing contact guidance', async () => {
    render(
      <MemoryRouter initialEntries={['/event/ericandkaras/recap']}>
        <Routes>
          <Route path="/event/:siteRef/recap" element={<EventRecap />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /eric & kara/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Your name (optional)')).toHaveAttribute('id', 'event-recap-guest-name');
    expect(screen.getByLabelText('Email (optional)')).toHaveAttribute('id', 'event-recap-email');
    expect(screen.getByLabelText('Phone (optional)')).toHaveAttribute('id', 'event-recap-phone');

    fireEvent.click(screen.getByRole('button', { name: 'Get recap' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Add an email or phone so we can send the recap.');
  });

  it('announces saved opt-in status after a successful submit', async () => {
    render(
      <MemoryRouter initialEntries={['/event/ericandkaras/recap']}>
        <Routes>
          <Route path="/event/:siteRef/recap" element={<EventRecap />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /eric & kara/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email (optional)'), { target: { value: 'guest@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Get recap' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Saved. We will send the recap when it is ready.');
    });
  });
});

describe('event recap page boundary', () => {
  it('routes the recap live shell and state split through dedicated components', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/EventRecap.tsx'), 'utf8');
    const liveContent = readFileSync(join(process.cwd(), 'src/pages/EventRecapLiveContent.tsx'), 'utf8');
    const routeView = readFileSync(join(process.cwd(), 'src/pages/EventRecapRouteView.tsx'), 'utf8');

    expect(page).toContain("from './EventRecapLiveContent'");
    expect(page).toContain('<EventRecapLiveContent');
    expect(page).toContain('captureGuestInviteTokenFromSearch(slug, searchParams);');
    expect(page).not.toContain("{loading && <div className=\"mt-6 rounded-lg border border-neutral-200 bg-white p-6 text-neutral-600\">");
    expect(page).not.toContain("{error && <div className=\"mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-neutral-700\">");
    expect(liveContent).toContain("from './EventRecapRouteView'");
    expect(liveContent).toContain('<EventRecapRouteView');
    expect(liveContent).toContain('{t(\'event_recap.back_hub\')}');
    expect(routeView).toContain('if (loadingState) return <>{loading}</>;');
    expect(routeView).toContain('if (!hasData) return <>{error}</>;');
  });

  it('tracks invite-scoped recap entry through aggregate invite analytics without leaking the token', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/EventRecap.tsx'), 'utf8');

    expect(page).toContain("trackGuestHubEvent(slug, 'view', resolveEventRecapViewTarget(access), access)");
    expect(page).not.toContain("/event/recap?token=");
  });
});
