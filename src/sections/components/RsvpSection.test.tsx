import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RsvpInline, RsvpSection } from './RsvpSection';
import { getPublicSiteSlugFromLocation, getPublicSiteSlugFromPath } from './publicSitePath';
import type { SectionInstance } from '../../types/layoutConfig';
import type { WeddingDataV1 } from '../../types/weddingData';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      state: null,
      key: 'test-location',
    }),
  };
});

function createWeddingData(): WeddingDataV1 {
  return {
    version: '1',
    couple: { partner1Name: 'Alex', partner2Name: 'Jordan', displayName: '' },
    event: {},
    venues: [],
    schedule: [],
    travel: {},
    faq: [],
    weddingParty: [],
    registry: [],
    rsvp: { enabled: true },
    theme: {},
    media: { gallery: [] },
    meta: { createdAtISO: '', updatedAtISO: '' },
  };
}

function makeInstance(settings: SectionInstance['settings']): SectionInstance {
  return {
    id: 'rsvp-1',
    type: 'rsvp',
    enabled: true,
    variant: 'default',
    settings,
  };
}

describe('RsvpSection', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    window.history.pushState({}, '', '/site/alex-jordan');
    sessionStorage.clear();
  });

  it('shows default RSVP titles when showTitle is unset in both variants', () => {
    const data = createWeddingData();

    const { rerender } = render(
      <RsvpSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Kindly reply')).toBeInTheDocument();
    expect(screen.getByText('RSVP')).toBeInTheDocument();

    rerender(
      <RsvpInline
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('You’re invited')).toBeInTheDocument();
    expect(screen.getByText('RSVP')).toBeInTheDocument();
    expect(screen.getByText('Join Alex & Jordan in celebrating their wedding')).toBeInTheDocument();
  });

  it('falls back to an accessible RSVP heading when persisted title settings are blank', () => {
    const data = createWeddingData();

    const { rerender } = render(
      <RsvpSection
        data={data}
        instance={makeInstance({ title: { value: '   ', source: 'builder' } })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'RSVP' })).toBeInTheDocument();

    rerender(
      <RsvpInline
        data={data}
        instance={makeInstance({ title: '' })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'RSVP' })).toBeInTheDocument();
  });

  it('keeps inline RSVP couple copy truthful when one persisted partner name is whitespace only', () => {
    const data = createWeddingData();
    data.couple.partner1Name = '   ';
    data.couple.partner2Name = ' Alex ';

    render(
      <RsvpInline
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.getByText('Join Alex in celebrating their wedding')).toBeInTheDocument();
  });

  it('guards invalid persisted RSVP deadlines across both variants', () => {
    const data = createWeddingData();
    data.rsvp.deadlineISO = 'not-a-date';

    const { rerender } = render(
      <RsvpSection
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
    expect(screen.queryByText(/Kindly respond by/)).not.toBeInTheDocument();

    rerender(
      <RsvpInline
        data={data}
        instance={makeInstance({})}
      />,
    );

    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
    expect(screen.queryByText(/Kindly respond by/)).not.toBeInTheDocument();
  });

  it('submits through the gated public-site RSVP function instead of direct table insert', async () => {
    invokeMock
      .mockResolvedValueOnce({ data: { status: 'open', site: { id: 'site-123' } }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    sessionStorage.setItem('dayof_invite_token_alex-jordan', 'invite-123');
    sessionStorage.setItem('dayof_pw_session_alex-jordan', 'pw-session-123');

    const data = createWeddingData();
    render(<RsvpSection data={data} instance={makeInstance({})} />);

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Guest' } });
    fireEvent.change(screen.getByLabelText('Number of guests'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Dietary notes/), { target: { value: 'Vegetarian' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send RSVP' }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('public-site-rsvp-submit', expect.objectContaining({
        body: expect.objectContaining({
          slug: 'alex-jordan',
          inviteToken: 'invite-123',
          passwordSession: 'pw-session-123',
          guestName: 'Taylor Guest',
          rsvpStatus: 'attending',
          guestCount: 2,
          dietaryNotes: 'Vegetarian',
        }),
      }));
    });

    expect(invokeMock).not.toHaveBeenCalledWith('site_rsvps', expect.anything());
    expect(await screen.findByText('Your reply has been saved.')).toBeInTheDocument();
  });

  it('uses the root site slug when submitting from a dedicated RSVP page', async () => {
    invokeMock
      .mockResolvedValueOnce({ data: { status: 'open', site: { id: 'site-123' } }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    window.history.pushState({}, '', '/site/maya-leo/rsvp?invite_token=guest-token');

    const data = createWeddingData();
    render(<RsvpInline data={data} instance={makeInstance({})} />);

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Guest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send RSVP' }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('public-site-access', expect.objectContaining({
        body: expect.objectContaining({
          slug: 'maya-leo',
          inviteToken: 'guest-token',
        }),
      }));
      expect(invokeMock).toHaveBeenCalledWith('public-site-rsvp-submit', expect.objectContaining({
        body: expect.objectContaining({
          slug: 'maya-leo',
          inviteToken: 'guest-token',
        }),
      }));
    });
  });

  it('clears stale submit errors once the guest edits the RSVP form again', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error('resolve failed') });

    const data = createWeddingData();
    render(<RsvpSection data={data} instance={makeInstance({})} />);

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Taylor Guest' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send RSVP' }));

    expect(await screen.findByText('Unable to find this wedding website right now. Please try again.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Dietary notes/), { target: { value: 'Vegetarian' } });

    await waitFor(() => {
      expect(screen.queryByText('Unable to find this wedding website right now. Please try again.')).not.toBeInTheDocument();
    });
  });
});

describe('getPublicSiteSlugFromPath', () => {
  it('extracts the site slug without swallowing a dedicated page slug', () => {
    expect(getPublicSiteSlugFromPath('/site/maya-leo')).toBe('maya-leo');
    expect(getPublicSiteSlugFromPath('/site/maya-leo/rsvp')).toBe('maya-leo');
    expect(getPublicSiteSlugFromPath('/site/maya%20leo/rsvp')).toBe('maya leo');
  });

  it('falls back to the wedding subdomain slug for root-mounted public pages', () => {
    expect(getPublicSiteSlugFromLocation('/rsvp', 'maya-leo.dayof.love')).toBe('maya-leo');
    expect(getPublicSiteSlugFromLocation('/', 'maya-leo.dayof.love')).toBe('maya-leo');
    expect(getPublicSiteSlugFromLocation('/rsvp', 'dayof.love')).toBe('');
  });
});
