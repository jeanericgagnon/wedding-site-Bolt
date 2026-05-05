import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultMusicPlaylistData, musicPlaylistDefinition } from './playlist';
import { defaultMusicRequestFormData, musicRequestFormDefinition } from './requestForm';

const Playlist = musicPlaylistDefinition.Component;
const RequestForm = musicRequestFormDefinition.Component;

describe('music public links', () => {
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
});
