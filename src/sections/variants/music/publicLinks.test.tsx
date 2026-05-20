import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultMusicPlaylistData, musicPlaylistDefinition } from './playlist';
import { defaultMusicRequestFormData, musicRequestFormDefinition } from './requestForm';

const Playlist = musicPlaylistDefinition.Component;
const RequestForm = musicRequestFormDefinition.Component;
const submitInteractiveSuggestionMock = vi.fn();

vi.mock('../../interactiveSectionService', () => ({
  submitInteractiveSuggestion: (...args: unknown[]) => submitInteractiveSuggestionMock(...args),
}));

describe('music public links', () => {
  beforeEach(() => {
    submitInteractiveSuggestionMock.mockReset();
  });

  it('hides unsafe platform links in playlist variants', () => {
    render(
      <Playlist
        data={{
          ...defaultMusicPlaylistData,
          playlists: [{
            id: 'one',
            label: 'Reception',
            spotifyUrl: 'javascript:alert(1)',
            appleMusicUrl: 'https://music.apple.com/us/playlist/wedding',
            tracks: [],
          }],
        }}
      />,
    );

    expect(screen.queryByRole('link', { name: /open on spotify/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /apple music/i })).toHaveAttribute(
      'href',
      'https://music.apple.com/us/playlist/wedding',
    );
  });

  it('hides unsafe request-form playlist links', () => {
    const { rerender } = render(
      <RequestForm
        data={{ ...defaultMusicRequestFormData, playlistUrl: 'javascript:alert(1)', showPlaylistLink: true }}
        siteSlug="preview"
      />,
    );

    expect(screen.queryByRole('link', { name: /open playlist/i })).not.toBeInTheDocument();

    rerender(
      <RequestForm
        data={{ ...defaultMusicRequestFormData, playlistUrl: 'https://open.spotify.com/playlist/dayof', showPlaylistLink: true }}
        siteSlug="preview"
      />,
    );

    expect(screen.getByRole('link', { name: /open playlist/i })).toHaveAttribute(
      'href',
      'https://open.spotify.com/playlist/dayof',
    );
  });

  it('keeps the song suggestion visible and retryable when submit fails', async () => {
    submitInteractiveSuggestionMock.mockRejectedValueOnce(new Error('submit failed'));

    render(
      <RequestForm
        data={defaultMusicRequestFormData}
        siteSlug="preview"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Song title and artist'), { target: { value: 'Dancing Queen - ABBA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send song' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t send that song right now. Please try again.');
    });
    expect(screen.getByDisplayValue('Dancing Queen - ABBA')).toBeInTheDocument();
    expect(screen.queryByText('Got it. Thank you for the song idea.')).not.toBeInTheDocument();
  });
});
