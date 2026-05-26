import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToastProvider } from '../../../components/ui/Toast';
import { SongRequestsTab } from './SongRequestsTab';
import * as planningService from './planningService';

const { copyTextOrDownload, downloadTextFile } = vi.hoisted(() => ({
  copyTextOrDownload: vi.fn(),
  downloadTextFile: vi.fn(),
}));

vi.mock('../../../lib/copyText', () => ({
  copyTextOrDownload: (...args: unknown[]) => copyTextOrDownload(...args),
  downloadTextFile: (...args: unknown[]) => downloadTextFile(...args),
}));

async function click(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

async function changeValue(element: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(element, { target: { value } });
  });
}

describe('SongRequestsTab', () => {
  beforeEach(() => {
    copyTextOrDownload.mockReset();
    downloadTextFile.mockReset();
  });

  it('restores the playlist save button after a failed save', async () => {
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
    await changeValue(input, 'https://open.spotify.com/playlist/updated');

    await click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByRole('button', { name: /^save$/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t save the playlist link right now\./i)).toBeInTheDocument();
  });

  it('does not show stale playlist save completion after edit access is removed', async () => {
    let resolveSave: () => void = () => {};

    vi.spyOn(planningService, 'loadSongRequestData').mockResolvedValue({
      playlistUrl: 'https://open.spotify.com/playlist/existing',
      hasQuestion: false,
      requests: [],
    });
    const savePlanningPlaylistUrl = vi.spyOn(planningService, 'savePlanningPlaylistUrl')
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveSave = resolve;
      }));

    const { rerender } = render(
      <ToastProvider>
        <SongRequestsTab siteId="site-1" />
      </ToastProvider>,
    );

    const input = await screen.findByDisplayValue('https://open.spotify.com/playlist/existing');
    await changeValue(input, 'https://open.spotify.com/playlist/updated');
    await click(screen.getByRole('button', { name: /^save$/i }));

    rerender(
      <ToastProvider>
        <SongRequestsTab siteId="site-1" canEdit={false} />
      </ToastProvider>,
    );

    await act(async () => {
      resolveSave();
    });

    expect(savePlanningPlaylistUrl).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    expect(screen.queryByText(/playlist link saved\./i)).not.toBeInTheDocument();
  });

  it('restores the DJ copy action after a failed copy', async () => {
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

    await click(await screen.findByRole('button', { name: /copy list/i }));

    expect(copyTextOrDownload).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /copy list/i })).toBeEnabled();
    expect(screen.getByText(/couldn’t copy the dj list right now\./i)).toBeInTheDocument();
  });

  it('shows a downloaded fallback label after the DJ list falls back from clipboard copy', async () => {
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

    await click(await screen.findByRole('button', { name: /copy list/i }));

    expect(await screen.findByRole('button', { name: /downloaded dj list/i })).toBeInTheDocument();
  });

  it('exports song requests through the attached download helper', async () => {
    vi.spyOn(planningService, 'loadSongRequestData').mockResolvedValue({
      playlistUrl: 'https://open.spotify.com/playlist/existing',
      hasQuestion: false,
      requests: [
        { guestName: 'Sarah Mitchell', answer: 'Dancing Queen - ABBA', respondedAt: '2026-05-01T12:00:00.000Z' },
      ],
    });

    render(
      <ToastProvider>
        <SongRequestsTab siteId="site-1" />
      </ToastProvider>,
    );

    await click(await screen.findByRole('button', { name: /^export$/i }));

    expect(downloadTextFile).toHaveBeenCalledWith(
      expect.stringMatching(/^dayof-song-requests-\d{4}-\d{2}-\d{2}\.csv$/),
      expect.stringContaining('Dancing Queen'),
      'text/csv;charset=utf-8',
    );
    expect(downloadTextFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Sarah Mitchell'),
      expect.any(String),
    );
  });

  it('ignores stale DJ list copy completion after song request data changes', async () => {
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

    await click(await screen.findByRole('button', { name: /copy list/i }));
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
