import React from 'react';
import { z } from 'zod';
import { Music2, Mic2, Heart, Headphones } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const SpecialSongSchema = z.object({
  id: z.string(),
  moment: z.string().default(''),
  title: z.string().default(''),
  artist: z.string().default(''),
  note: z.string().default(''),
  icon: z.enum(['music', 'mic', 'heart', 'headphones']).default('music'),
});

export const musicSetlistSchema = z.object({
  eyebrow: z.string().default('Our Songs'),
  headline: z.string().default('Special Moments & Music'),
  subtitle: z.string().default(''),
  djBandName: z.string().default(''),
  djBandLabel: z.string().default('Entertainment by'),
  requestNote: z.string().default(''),
  showRequestNote: z.boolean().default(true),
  background: z.enum(['white', 'dark', 'gradient']).default('gradient'),
  songs: z.array(SpecialSongSchema).default([]),
});

export type MusicSetlistData = z.infer<typeof musicSetlistSchema>;

export const defaultMusicSetlistData: MusicSetlistData = {
  eyebrow: 'Our Songs',
  headline: 'Special Moments & Music',
  subtitle: 'The songs that define our love story.',
  djBandName: 'DJ Marcus & The Sound Co.',
  djBandLabel: 'Entertainment by',
  requestNote: 'Song requests welcome — add yours when you RSVP!',
  showRequestNote: true,
  background: 'gradient',
  songs: [
    { id: '1', moment: 'First Dance', title: 'Marry You', artist: 'Bruno Mars', note: 'The song that started it all', icon: 'heart' },
    { id: '2', moment: 'Processional', title: 'A Thousand Years', artist: 'Christina Perri', note: '', icon: 'music' },
    { id: '3', moment: 'Father & Daughter', title: 'My Girl', artist: 'The Temptations', note: 'A tradition in our family', icon: 'heart' },
    { id: '4', moment: 'Mother & Son', title: 'What a Wonderful World', artist: 'Louis Armstrong', note: '', icon: 'heart' },
    { id: '5', moment: 'Last Dance', title: 'Don\'t Stop Believin\'', artist: 'Journey', note: 'End the night right', icon: 'headphones' },
  ],
};

const iconMap = { music: Music2, mic: Mic2, heart: Heart, headphones: Headphones };

const bgClasses: Record<string, string> = {
  white: 'bg-white',
  dark: 'bg-stone-900',
  gradient: 'bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900',
};
const textClasses: Record<string, { headline: string; body: string; sub: string; card: string; border: string }> = {
  white: { headline: 'text-stone-900', body: 'text-stone-600', sub: 'text-stone-400', card: 'bg-stone-50 border-stone-100', border: 'border-stone-100' },
  dark: { headline: 'text-white', body: 'text-stone-300', sub: 'text-stone-500', card: 'bg-stone-800 border-stone-700', border: 'border-stone-700' },
  gradient: { headline: 'text-white', body: 'text-stone-300', sub: 'text-stone-500', card: 'bg-white/5 border-white/10', border: 'border-white/10' },
};

const MusicSetlist: React.FC<SectionComponentProps<MusicSetlistData>> = ({ data }) => {
  const bg = bgClasses[data.background] ?? bgClasses.gradient;
  const tc = textClasses[data.background] ?? textClasses.gradient;

  return (
    <section className={`py-28 md:py-36 ${bg}`} id="music">
      <div className="max-w-2xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className={`text-xs uppercase tracking-[0.25em] font-medium mb-4 ${tc.sub}`}>{data.eyebrow}</p>
          )}
          <h2 className={`text-4xl md:text-5xl font-light mb-4 ${tc.headline}`}>{data.headline}</h2>
          {data.subtitle && (
            <p className={`leading-relaxed ${tc.body}`}>{data.subtitle}</p>
          )}
        </div>

        <div className="space-y-4">
          {data.songs.map((song) => {
            const Icon = iconMap[song.icon] ?? Music2;
            return (
              <div key={song.id} className={`flex items-start gap-4 p-6 rounded-3xl border ${tc.card} transition-colors shadow-sm`}>
                <div className={`w-10 h-10 rounded-full border ${tc.border} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon size={16} className={tc.sub} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${tc.sub}`}>{song.moment}</p>
                  <p className={`font-medium ${tc.headline}`}>{song.title}</p>
                  <p className={`text-sm ${tc.body}`}>{song.artist}</p>
                  {song.note && <p className={`text-xs mt-1.5 italic ${tc.sub}`}>{song.note}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {data.djBandName && (
          <div className={`mt-10 text-center ${tc.sub}`}>
            <p className="text-xs uppercase tracking-widest mb-1">{data.djBandLabel}</p>
            <p className={`font-medium text-sm ${tc.body}`}>{data.djBandName}</p>
          </div>
        )}

        {data.showRequestNote && data.requestNote && (
          <div className={`mt-6 text-center border-t ${tc.border} pt-6`}>
            <p className={`text-sm italic ${tc.sub}`}>{data.requestNote}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export const musicSetlistDefinition: SectionDefinition<MusicSetlistData> = {
  type: 'music',
  variant: 'setlist',
  schema: musicSetlistSchema,
  defaultData: defaultMusicSetlistData,
  Component: MusicSetlist,
};
