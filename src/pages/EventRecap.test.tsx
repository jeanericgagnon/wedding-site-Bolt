import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const copyTextOrDownloadMock = vi.fn(async (_value?: unknown, _filename?: unknown) => 'copied');

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
        'event_recap.share_moment': 'Share moment',
        'event_recap.copy_caption': 'Copy caption',
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
        'event_recap.link_copied': 'Recap link copied.',
        'event_recap.link_downloaded': 'Recap link downloaded.',
        'event_recap.caption_copied': 'Caption copied.',
        'event_recap.caption_downloaded': 'Caption downloaded.',
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

vi.mock('../components/site/OwnerPreviewBanner', () => ({
  OwnerPreviewBanner: () => null,
}));

vi.mock('../lib/copyText', () => ({
  copyTextOrDownload: (value: unknown, filename?: unknown) => copyTextOrDownloadMock(value, filename),
}));

import { EventRecap, buildDemoEventRecapData, buildEventRecapAccessHeaders, buildEventRecapGuestHubAccessPayload, buildEventRecapMomentAnchor, formatEventRecapAlbumLabel, formatRecapChapterDate, friendlyEventRecapError, resolveEventRecapViewTarget, safeEventRecapFunctionError } from './EventRecap';

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

const EventRecapRouteHarness = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate('/event/nextcouple/recap')}>
        Switch recap
      </button>
      <Routes>
        <Route path="/event/:siteRef/recap" element={<EventRecap />} />
      </Routes>
    </>
  );
};

beforeEach(() => {
  copyTextOrDownloadMock.mockReset();
  copyTextOrDownloadMock.mockResolvedValue('copied');
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

describe('formatRecapChapterDate', () => {
  it('formats saved chapter dates as local calendar days', () => {
    expect(formatRecapChapterDate('2026-09-12')).toBe(
      new Date(2026, 8, 12).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    );
  });

  it('does not roll impossible chapter dates into fake calendar days', () => {
    expect(formatRecapChapterDate('2026-02-30')).toBe('Undated moments');
    expect(formatRecapChapterDate('unknown')).toBe('Undated moments');
  });
});

describe('buildDemoEventRecapData', () => {
  it('builds a guest-facing recap payload from the saved demo photo state when QA proof is enabled', () => {
    const data = buildDemoEventRecapData('alex-jordan-demo', new URLSearchParams('photoMemoryFlowQa=1'));

    expect(data).toMatchObject({
      site: {
        slug: 'alex-jordan-demo',
        coupleName1: 'Alex Thompson',
        coupleName2: 'Jordan Rivera',
      },
      summary: {
        uploadCount: 5,
        chapterCount: 1,
        storyCount: 3,
      },
    });
    expect(data?.highlights.length).toBeGreaterThan(0);
    expect(data?.highlights.some((card) => card.story === true)).toBe(true);
  });

  it('stays off unless the QA recap proof flag is present', () => {
    expect(buildDemoEventRecapData('alex-jordan-demo', new URLSearchParams())).toBeNull();
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

  it('renders the QA recap with featured, story, and video-backed guest moments', async () => {
    window.history.replaceState({}, '', '/event/alex-jordan-demo/recap?photoMemoryFlowQa=1&invite_token=token-c-2');

    render(
      <MemoryRouter initialEntries={['/event/alex-jordan-demo/recap?photoMemoryFlowQa=1&invite_token=token-c-2']}>
        <Routes>
          <Route path="/event/:siteRef/recap" element={<EventRecap />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /alex thompson & jordan rivera/i })).toBeInTheDocument();
    expect(screen.getAllByText('Story pick').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Featured').length).toBeGreaterThan(0);
    expect(screen.getByText('Short motion clip from the first big reception toast.')).toBeInTheDocument();
    expect(screen.getByText('Shared by Emma Waters')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('token-c-2');
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

  it('clears stale recap opt-in status once the guest edits the form again', async () => {
    render(
      <MemoryRouter initialEntries={['/event/ericandkaras/recap']}>
        <Routes>
          <Route path="/event/:siteRef/recap" element={<EventRecap />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /eric & kara/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Get recap' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add an email or phone so we can send the recap.');

    fireEvent.change(screen.getByLabelText('Email (optional)'), { target: { value: 'guest@example.com' } });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a story-caption-specific failure message when caption copy fails', async () => {
    copyTextOrDownloadMock.mockRejectedValueOnce(new Error('copy failed'));

    render(
      <MemoryRouter initialEntries={['/event/ericandkaras/recap']}>
        <Routes>
          <Route path="/event/:siteRef/recap" element={<EventRecap />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /eric & kara/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy caption' }));

    await waitFor(() => {
      expect(screen.getByText('Couldn’t copy the story caption right now.')).toBeInTheDocument();
    });
  });

  it('reports story-caption-specific success copy after copying the caption', async () => {
    copyTextOrDownloadMock.mockResolvedValueOnce('copied');

    render(
      <MemoryRouter initialEntries={['/event/ericandkaras/recap']}>
        <Routes>
          <Route path="/event/:siteRef/recap" element={<EventRecap />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /eric & kara/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy caption' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Caption copied.');
    });
  });

  it('keeps recap-link success copy specific to the recap link action', async () => {
    copyTextOrDownloadMock.mockResolvedValueOnce('downloaded');

    render(
      <MemoryRouter initialEntries={['/event/ericandkaras/recap']}>
        <Routes>
          <Route path="/event/:siteRef/recap" element={<EventRecap />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /eric & kara/i })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Share recap' }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Recap link downloaded.');
    });
  });

  it('ignores stale recap copy completions after the recap route changes', async () => {
    let finishCopy: ((value: 'copied') => void) | undefined;
    copyTextOrDownloadMock.mockReturnValueOnce(new Promise<'copied'>((resolve) => {
      finishCopy = resolve;
    }));

    render(
      <MemoryRouter initialEntries={['/event/ericandkaras/recap']}>
        <EventRecapRouteHarness />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /eric & kara/i })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Share recap' }).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: 'Switch recap' }));
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Share recap' }).at(-1)).toBeEnabled();
    });

    await act(async () => {
      finishCopy?.('copied');
    });

    expect(screen.getAllByRole('button', { name: 'Share recap' }).at(-1)).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Copied recap link' })).not.toBeInTheDocument();
    expect(screen.queryByText('Recap link copied.')).not.toBeInTheDocument();
  });

  it('shares top moments with a stable moment anchor instead of the generic recap URL', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      ...recapPayload,
      summary: {
        ...recapPayload.summary,
        highlightCount: 1,
      },
      highlights: [
        {
          id: 'moment one/with spaces',
          filename: 'dance-floor.jpg',
          imageUrl: 'https://example.com/dance-floor.jpg',
          guestName: 'Maya',
          note: 'Everyone on the dance floor',
          mimeType: 'image/jpeg',
          uploadedAt: '2026-06-20T21:00:00Z',
          takenAt: '2026-06-20T21:00:00Z',
          bucketName: 'Reception',
          caption: 'The whole room dancing together.',
          moment: 'Reception',
          tags: [],
          featured: true,
          story: false,
        },
      ],
    }), { status: 200 }));

    render(
      <MemoryRouter initialEntries={['/event/ericandkaras/recap']}>
        <Routes>
          <Route path="/event/:siteRef/recap" element={<EventRecap />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('The whole room dancing together.')).toBeInTheDocument();
    const anchor = buildEventRecapMomentAnchor('moment one/with spaces');
    expect(document.getElementById(anchor)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Share moment' }));

    await waitFor(() => {
      expect(copyTextOrDownloadMock).toHaveBeenCalledWith(
        `${window.location.origin}/event/ericandkaras/recap#${anchor}`,
        'ericandkaras-recap-link.txt',
      );
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
    expect(page).not.toContain('{loading && <div');
    expect(page).not.toContain('{error && <div');
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
