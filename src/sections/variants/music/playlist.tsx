import React, { useState } from 'react';
import { z } from 'zod';
import { Music, Play, ExternalLink, Plus } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const TrackSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  artist: z.string().default(''),
  moment: z.string().default(''),
});

const PlaylistSectionSchema = z.object({
  id: z.string(),
  label: z.string().default(''),
  spotifyUrl: z.string().default(''),
  appleMusicUrl: z.string().default(''),
  tracks: z.array(TrackSchema).default([]),
});

export const musicPlaylistSchema = z.object({
  eyebrow: z.string().default('The Soundtrack'),
  headline: z.string().default('Music for Our Day'),
  subtitle: z.string().default(''),
  requestNote: z.string().default('Have a song request? Let us know on your RSVP!'),
  showRequestNote: z.boolean().default(true),
  playlists: z.array(PlaylistSectionSchema).default([]),
});

export type MusicPlaylistData = z.infer<typeof musicPlaylistSchema>;

export const defaultMusicPlaylistData: MusicPlaylistData = {
  eyebrow: 'The Soundtrack',
  headline: 'Music for Our Day',
  subtitle: 'Every moment of our celebration will be accompanied by songs that mean the world to us.',
  requestNote: 'Have a song request? Let us know when you RSVP!',
  showRequestNote: true,
  playlists: [
    {
      id: '1',
      label: 'Ceremony',
      spotifyUrl: '',
      appleMusicUrl: '',
      tracks: [
        { id: '1a', title: 'A Thousand Years', artist: 'Christina Perri', moment: 'Processional' },
        { id: '1b', title: 'Can\'t Help Falling in Love', artist: 'Elvis Presley', moment: 'First kiss' },
        { id: '1c', title: 'Bloom', artist: 'The Paper Kites', moment: 'Signing' },
        { id: '1d', title: 'All of Me', artist: 'John Legend', moment: 'Recessional' },
      ],
    },
    {
      id: '2',
      label: 'Cocktail Hour',
      spotifyUrl: '',
      appleMusicUrl: '',
      tracks: [
        { id: '2a', title: 'At Last', artist: 'Etta James', moment: '' },
        { id: '2b', title: 'La Vie en Rose', artist: 'Édith Piaf', moment: '' },
        { id: '2c', title: 'The Way You Look Tonight', artist: 'Frank Sinatra', moment: '' },
        { id: '2d', title: 'Better Together', artist: 'Jack Johnson', moment: '' },
      ],
    },
    {
      id: '3',
      label: 'Reception',
      spotifyUrl: '',
      appleMusicUrl: '',
      tracks: [
        { id: '3a', title: 'Marry You', artist: 'Bruno Mars', moment: 'First dance' },
        { id: '3b', title: 'My Girl', artist: 'The Temptations', moment: 'Father-daughter' },
        { id: '3c', title: 'Isn\'t She Lovely', artist: 'Stevie Wonder', moment: '' },
        { id: '3d', title: 'September', artist: 'Earth, Wind & Fire', moment: '' },
      ],
    },
  ],
};

const MusicPlaylist: React.FC<SectionComponentProps<MusicPlaylistData>> = ({ data }) => {
  const [activeTab, setActiveTab] = useState(0);
  const active = data.playlists[activeTab];

  return (
    <section className="py-24 md:py-32 bg-stone-900" id="music">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-stone-700" />
            <Music size={16} className="text-stone-500" />
            <div className="w-8 h-px bg-stone-700" />
          </div>
          <h2 className="text-4xl md:text-5xl font-light text-white">{data.headline}</h2>
          {data.subtitle && (
            <p className="text-stone-400 mt-4 leading-relaxed">{data.subtitle}</p>
          )}
        </div>

        {data.playlists.length > 0 && (
          <>
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {data.playlists.map((pl, i) => (
                <button
                  key={pl.id}
                  onClick={() => setActiveTab(i)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    i === activeTab
                      ? 'bg-white text-stone-900'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white'
                  }`}
                >
                  {pl.label}
                </button>
              ))}
            </div>

            {active && (
              <div className="bg-stone-800 rounded-2xl overflow-hidden">
                {(active.spotifyUrl || active.appleMusicUrl) && (
                  <div className="flex flex-wrap gap-3 px-6 py-4 border-b border-stone-700">
                    {active.spotifyUrl && (
                      <a
                        href={active.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-medium text-stone-300 hover:text-white transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Play size={8} fill="white" className="text-white" />
                        </div>
                        Open on Spotify
                        <ExternalLink size={10} />
                      </a>
                    )}
                    {active.appleMusicUrl && (
                      <a
                        href={active.appleMusicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-medium text-stone-300 hover:text-white transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                          <Music size={8} className="text-white" />
                        </div>
                        Apple Music
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
                <div className="divide-y divide-stone-700/60">
                  {active.tracks.map((track, i) => (
                    <div key={track.id} className="flex items-center gap-4 px-6 py-4 group hover:bg-stone-700/40 transition-colors">
                      <span className="text-stone-600 text-xs font-mono w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <div className="w-8 h-8 rounded-full bg-stone-700 group-hover:bg-stone-600 flex items-center justify-center shrink-0 transition-colors">
                        <Music size={12} className="text-stone-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{track.title}</p>
                        <p className="text-stone-400 text-xs truncate">{track.artist}</p>
                      </div>
                      {track.moment && (
                        <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-stone-700 text-stone-400 shrink-0">
                          {track.moment}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {data.showRequestNote && data.requestNote && (
          <div className="mt-8 text-center">
            <p className="text-stone-500 text-sm italic">{data.requestNote}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export const musicPlaylistDefinition: SectionDefinition<MusicPlaylistData> = {
  type: 'music',
  variant: 'playlist',
  schema: musicPlaylistSchema,
  defaultData: defaultMusicPlaylistData,
  Component: MusicPlaylist,
};
