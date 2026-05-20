import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { ExternalLink, Music2, Send, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { submitInteractiveSuggestion } from '../../interactiveSectionService';
import { getSafePublicWebUrl } from '../../publicLinks';

export const musicRequestFormSchema = z.object({
  eyebrow: z.string().default('Dance floor'),
  headline: z.string().default('Help us build the playlist'),
  subtitle: z.string().default('Send a song you hope to hear. We will pass the favorites to the DJ.'),
  playlistUrl: z.string().default(''),
  promptLabel: z.string().default('What song gets you on the dance floor?'),
  placeholder: z.string().default('Song title and artist'),
  buttonLabel: z.string().default('Send song'),
  showRecentRequests: z.boolean().default(true),
  showPlaylistLink: z.boolean().default(true),
  background: z.enum(['cream', 'dark', 'green']).default('dark'),
});

export type MusicRequestFormData = z.infer<typeof musicRequestFormSchema>;

export const defaultMusicRequestFormData: MusicRequestFormData = {
  eyebrow: 'Dance floor',
  headline: 'Help us build the playlist',
  subtitle: 'Send a song you hope to hear. We will pass the favorites to the DJ.',
  playlistUrl: '',
  promptLabel: 'What song gets you on the dance floor?',
  placeholder: 'Song title and artist',
  buttonLabel: 'Send song',
  showRecentRequests: true,
  showPlaylistLink: true,
  background: 'dark',
};

const shellClasses: Record<MusicRequestFormData['background'], string> = {
  cream: 'bg-[#fbf6ee] text-stone-950',
  dark: 'bg-stone-950 text-white',
  green: 'bg-[#10241e] text-white',
};

const MusicRequestForm: React.FC<SectionComponentProps<MusicRequestFormData>> = ({ data, siteSlug }) => {
  const [searchParams] = useSearchParams();
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const isDark = data.background !== 'cream';
  const safePlaylistUrl = getSafePublicWebUrl(data.playlistUrl);

  const promptKey = useMemo(() => `song_request:${data.promptLabel}`, [data.promptLabel]);

  useEffect(() => {
    setValue('');
    setSent(false);
    setSaving(false);
    setError('');
    setRecent([]);
  }, [promptKey, siteSlug]);

  async function submit() {
    const song = value.trim().slice(0, 160);
    if (!song || saving) return;
    setError('');
    try {
      setSaving(true);
      if (siteSlug) {
        await submitInteractiveSuggestion({
          siteSlug,
          promptKey,
          suggestionText: song,
          searchParams,
        });
      }
      setRecent((prev) => [song, ...prev.filter((item) => item.toLowerCase() !== song.toLowerCase())].slice(0, 6));
      setValue('');
      setSent(true);
    } catch {
      setSent(false);
      setError('Couldn’t send that song right now. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`py-24 md:py-36 ${shellClasses[data.background]}`} id="music">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-16 items-center">
          <div>
            <div className={`mb-7 inline-flex h-14 w-14 items-center justify-center rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-stone-950 text-white'}`}>
              <Music2 size={22} />
            </div>
            {data.eyebrow && <p className={`text-sm font-light mb-5 ${isDark ? 'text-white/45' : 'text-stone-400'}`}>{data.eyebrow}</p>}
            <h2 className="text-5xl md:text-7xl font-light leading-none text-balance">{data.headline}</h2>
            {data.subtitle && <p className={`mt-6 max-w-xl text-lg leading-relaxed ${isDark ? 'text-white/62' : 'text-stone-600'}`}>{data.subtitle}</p>}
            {data.showPlaylistLink && safePlaylistUrl && (
              <a href={safePlaylistUrl} target="_blank" rel="noopener noreferrer" className={`mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium ${isDark ? 'bg-white text-stone-950' : 'bg-stone-950 text-white'}`}>
                Open playlist <ExternalLink size={14} />
              </a>
            )}
          </div>

          <div className={`rounded-[2rem] border p-5 md:p-7 ${isDark ? 'border-white/10 bg-white/[0.06]' : 'border-stone-200 bg-white'} shadow-[0_30px_90px_-60px_rgba(0,0,0,0.55)]`}>
            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-white/80' : 'text-stone-700'}`}>{data.promptLabel}</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={data.placeholder}
                className={`min-h-[52px] flex-1 rounded-2xl border px-4 text-base outline-none ${isDark ? 'border-white/15 bg-black/20 text-white placeholder:text-white/35 focus:border-white/45' : 'border-stone-200 bg-stone-50 text-stone-950 placeholder:text-stone-400 focus:border-stone-400'}`}
              />
              <button
                onClick={() => { void submit(); }}
                disabled={saving}
                className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold disabled:opacity-60 ${isDark ? 'bg-white text-stone-950 hover:bg-white/85' : 'bg-stone-950 text-white hover:bg-stone-800'}`}
              >
                <Send size={15} /> {saving ? 'Sending...' : data.buttonLabel}
              </button>
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-rose-400">{error}</p>}
            {sent && <p className="mt-3 text-sm text-emerald-500">Got it. Thank you for the song idea.</p>}
            {data.showRecentRequests && recent.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className={`flex items-center gap-2 text-xs ${isDark ? 'text-white/40' : 'text-stone-400'}`}><Sparkles size={12} /> Recently sent</p>
                {recent.map((song) => (
                  <div key={song} className={`rounded-xl px-3 py-2 text-sm ${isDark ? 'bg-white/8 text-white/70' : 'bg-stone-50 text-stone-600'}`}>{song}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export const musicRequestFormDefinition: SectionDefinition<MusicRequestFormData> = {
  type: 'music',
  variant: 'requestForm',
  schema: musicRequestFormSchema,
  defaultData: defaultMusicRequestFormData,
  Component: MusicRequestForm,
};
