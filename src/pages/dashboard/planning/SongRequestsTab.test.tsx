import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../../components/ui/Toast';
import { SongRequestsTab } from './SongRequestsTab';
import * as planningService from './planningService';

const { copyTextOrDownload } = vi.hoisted(() => ({
  copyTextOrDownload: vi.fn(),
}));

vi.mock('../../../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownload(...args),
}));

describe('SongRequestsTab', () => {
  beforeEach(() => {
    copyTextOrDownload.mockReset();
  });

  it('restores the playlist save button after a failed save', async () => {
    const user = userEvent.setup();

    vi.spyOn(planningService, 'loadSongRequestData').mockResolvedValue({
      playlistUrl: 'https://open.spotify.com/playlist/existing',
      hasQuestion: false,
      requests: [],
    });
    vi.spyOn(planningService, 'savePlanningPlaylistUrl').mockRejectedValueOnce(new Error('save failed'));

    render(
      <ToastProvider>
        <SongRequestsTab siteId="site-1" />
      </ToastProvider>,
    );

    const input = await screen.findByDisplayValue('https://open.spotify.com/playlist/existing');
    await user.clear(input);
    await user.type(input, 'https://open.spotify.com/playlist/updated');

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByRole('button', { name: /^save$/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t save the playlist link right now\./i)).toBeInTheDocument();
  });

  it('restores the DJ copy action after a failed copy', async () => {
    const user = userEvent.setup();

    vi.spyOn(planningService, 'loadSongRequestData').mockResolvedValue({
      playlistUrl: 'https://open.spotify.com/playlist/existing',
      hasQuestion: false,
      requests: [
        { guestName: 'Sarah Mitchell', answer: 'Dancing Queen - ABBA', respondedAt: new Date().toISOString() },
      ],
    });
    copyTextOrDownload.mockRejectedValueOnce(new Error('copy failed'));

    render(
      <ToastProvider>
        <SongRequestsTab siteId="site-1" />
      </ToastProvider>,
    );

    await user.click(await screen.findByRole('button', { name: /copy list/i }));

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /copy list/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t copy the dj list right now\./i)).toBeInTheDocument();
  });

  it('shows a downloaded fallback label after the DJ list falls back from clipboard copy', async () => {
    const user = userEvent.setup();

    vi.spyOn(planningService, 'loadSongRequestData').mockResolvedValue({
      playlistUrl: 'https://open.spotify.com/playlist/existing',
      hasQuestion: false,
      requests: [
        { guestName: 'Sarah Mitchell', answer: 'Dancing Queen - ABBA', respondedAt: new Date().toISOString() },
      ],
    });
    copyTextOrDownload.mockResolvedValueOnce('downloaded');

    render(
      <ToastProvider>
        <SongRequestsTab siteId="site-1" />
      </ToastProvider>,
    );

    await user.click(await screen.findByRole('button', { name: /copy list/i }));

    expect(await screen.findByRole('button', { name: /downloaded dj list/i })).toBeInTheDocument();
  });

  it('ignores stale DJ list copy completion after song request data changes', async () => {
    const user = userEvent.setup();
    let resolveCopy: (value: 'copied') => void = () => {};

    const loadSongRequestData = vi.spyOn(planningService, 'loadSongRequestData');
    loadSongRequestData
      .mockResolvedValueOnce({
        playlistUrl: 'https://open.spotify.com/playlist/existing',
        hasQuestion: false,
        requests: [
          { guestName: 'Sarah Mitchell', answer: 'Dancing Queen - ABBA', respondedAt: '2026-05-01T12:00:00.000Z' },
        ],
      })
      .mockResolvedValueOnce({
        playlistUrl: 'https://open.spotify.com/playlist/new',
        hasQuestion: false,
        requests: [
          { guestName: 'Michael Chen', answer: 'September - Earth, Wind & Fire', respondedAt: '2026-05-02T12:00:00.000Z' },
        ],
      });
    copyTextOrDownload.mockReturnValueOnce(new Promise((resolve) => {
      resolveCopy = resolve;
    }));

    const { rerender } = render(
      <ToastProvider>
        <SongRequestsTab siteId="site-1" />
      </ToastProvider>,
    );

    await user.click(await screen.findByRole('button', { name: /copy list/i }));
    expect(screen.getByRole('button', { name: /copying/i })).toBeDisabled();

    rerender(
      <ToastProvider>
        <SongRequestsTab siteId="site-2" />
      </ToastProvider>,
    );

    await waitFor(() => expect(screen.getByText(/September/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: /copy list/i })).toBeEnabled());

    await act(async () => {
      resolveCopy('copied');
    });

    expect(screen.getByRole('button', { name: /copy list/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /copied dj list/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/dj-ready song list copied\./i)).not.toBeInTheDocument();
  });
});
