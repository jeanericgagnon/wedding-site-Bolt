import React, { useState } from 'react';
import { z } from 'zod';
import { Play, Film } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

export const videoFullSchema = z.object({
  eyebrow: z.string().default(''),
  headline: z.string().default('Our Save the Date'),
  subtitle: z.string().default(''),
  videoUrl: z.string().default(''),
  thumbnailUrl: z.string().default(''),
  videoType: z.enum(['youtube', 'vimeo', 'direct']).default('youtube'),
  background: z.enum(['white', 'dark', 'soft']).default('dark'),
  autoplay: z.boolean().default(false),
});

export type VideoFullData = z.infer<typeof videoFullSchema>;

export const defaultVideoFullData: VideoFullData = {
  eyebrow: 'Before the Big Day',
  headline: 'Our Save the Date',
  subtitle: 'We made something special just for you.',
  videoUrl: '',
  thumbnailUrl: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1200',
  videoType: 'youtube',
  background: 'dark',
  autoplay: false,
};

function getEmbedUrl(url: string, type: VideoFullData['videoType'], autoplay: boolean): string | null {
  if (!url) return null;
  const auto = autoplay ? '1' : '0';
  if (type === 'youtube') {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=${auto}&rel=0`;
  }
  if (type === 'vimeo') {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) return `https://player.vimeo.com/video/${match[1]}?autoplay=${auto}`;
  }
  if (type === 'direct') return url;
  return null;
}

const bgMap: Record<string, { section: string; headline: string; sub: string }> = {
  white: { section: 'bg-white', headline: 'text-stone-900', sub: 'text-stone-500' },
  soft: { section: 'bg-stone-50', headline: 'text-stone-900', sub: 'text-stone-500' },
  dark: { section: 'bg-stone-950', headline: 'text-white', sub: 'text-stone-400' },
};

const VideoFull: React.FC<SectionComponentProps<VideoFullData>> = ({ data }) => {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getEmbedUrl(data.videoUrl, data.videoType, data.autoplay || playing);
  const colors = bgMap[data.background] ?? bgMap.dark;

  return (
    <section className={`py-24 md:py-32 ${colors.section}`} id="video">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          {data.eyebrow && (
            <p className={`text-xs uppercase tracking-[0.25em] font-medium mb-4 ${data.background === 'dark' ? 'text-stone-500' : 'text-stone-400'}`}>{data.eyebrow}</p>
          )}
          <h2 className={`text-4xl md:text-5xl font-light mb-4 ${colors.headline}`}>{data.headline}</h2>
          {data.subtitle && (
            <p className={`leading-relaxed ${colors.sub}`}>{data.subtitle}</p>
          )}
        </div>

        <div className="relative aspect-video rounded-2xl overflow-hidden bg-stone-900 shadow-2xl">
          {!playing && !data.autoplay && data.thumbnailUrl ? (
            <div
              className="absolute inset-0 cursor-pointer group"
              onClick={() => embedUrl && setPlaying(true)}
            >
              <img
                src={data.thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
              {embedUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                    <Play size={32} fill="white" className="text-white ml-1" />
                  </div>
                </div>
              )}
              {!embedUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Film size={32} className="text-stone-400" />
                  <p className="text-stone-400 text-sm">Add a video URL to display your video here</p>
                </div>
              )}
            </div>
          ) : embedUrl ? (
            <iframe
              src={playing ? embedUrl : getEmbedUrl(data.videoUrl, data.videoType, true) ?? ''}
              title="Wedding video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : data.videoType === 'direct' && data.videoUrl ? (
            <video
              src={data.videoUrl}
              controls
              autoPlay={data.autoplay}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <Film size={32} className="text-stone-600" />
              <p className="text-stone-500 text-sm">Add a video URL in the settings</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export const videoFullDefinition: SectionDefinition<VideoFullData> = {
  type: 'video',
  variant: 'full',
  schema: videoFullSchema,
  defaultData: defaultVideoFullData,
  Component: VideoFull,
};
