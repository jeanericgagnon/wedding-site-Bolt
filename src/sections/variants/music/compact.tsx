import React from 'react';
import { z } from 'zod';
import { Music, Play } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const SongSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  artist: z.string().default(''),
  moment: z.string().default(''),
});

export const musicCompactSchema = z.object({
  eyebrow: z.string().default('Soundtrack'),
  headline: z.string().default('The Songs We Love'),
  subtitle: z.string().default(''),
  showMoments: z.boolean().default(true),
  songs: z.array(SongSchema).default([]),
  note: z.string().default(''),
});

export type MusicCompactData = z.infer<typeof musicCompactSchema>;

export const defaultMusicCompactData: MusicCompactData = {
  eyebrow: 'Soundtrack',
  headline: 'The Songs We Love',
  subtitle: 'A playlist of songs that tell our story.',
  showMoments: true,
  note: 'Have a song request? Let us know!',
  songs: [
    { id: '1', title: 'A Thousand Years', artist: 'Christina Perri', moment: 'Processional' },
    { id: '2', title: 'Marry You', artist: 'Bruno Mars', moment: 'First Dance' },
    { id: '3', title: 'My Girl', artist: 'The Temptations', moment: 'Father-Daughter' },
    { id: '4', title: 'What a Wonderful World', artist: 'Louis Armstrong', moment: 'Mother-Son' },
    { id: '5', title: 'All of Me', artist: 'John Legend', moment: 'Ceremony' },
    { id: '6', title: 'September', artist: 'Earth, Wind & Fire', moment: 'Reception' },
    { id: '7', title: 'Can\'t Help Falling in Love', artist: 'Elvis Presley', moment: '' },
    { id: '8', title: 'At Last', artist: 'Etta James', moment: '' },
  ],
};

const MusicCompact: React.FC<SectionComponentProps<MusicCompactData>> = ({ data }) => {
  return (
    <section className="py-28 md:py-36 bg-white" id="music">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-3">{data.headline}</h2>
          {data.subtitle && (
            <p className="text-stone-500 leading-relaxed">{data.subtitle}</p>
          )}
        </div>

        <div className="bg-gradient-to-b from-stone-50 to-white rounded-[2rem] border border-stone-100 divide-y divide-stone-100 overflow-hidden shadow-md">
          {data.songs.map((song, idx) => (
            <div key={song.id} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center shrink-0 transition-colors">
                <Music size={12} className="text-stone-400 group-hover:text-stone-600 transition-colors" />
              </div>
              <span className="text-stone-400 text-xs font-mono w-6 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
              <div className="flex-1 min-w-0">
                <p className="text-stone-900 font-medium text-sm truncate">{song.title}</p>
                <p className="text-stone-500 text-xs truncate">{song.artist}</p>
              </div>
              {data.showMoments && song.moment && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-rose-50 text-rose-600 font-medium shrink-0">
                  {song.moment}
                </span>
              )}
            </div>
          ))}
        </div>

        {data.note && (
          <div className="mt-6 text-center">
            <p className="text-stone-400 text-sm italic">{data.note}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export const musicCompactDefinition: SectionDefinition<MusicCompactData> = {
  type: 'music',
  variant: 'compact',
  schema: musicCompactSchema,
  defaultData: defaultMusicCompactData,
  Component: MusicCompact,
};
