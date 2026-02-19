import React, { useState } from 'react';
import { z } from 'zod';
import { Play, Film, PlayCircle } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const VideoItemSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  description: z.string().default(''),
  videoUrl: z.string().default(''),
  thumbnailUrl: z.string().default(''),
  videoType: z.enum(['youtube', 'vimeo', 'direct']).default('youtube'),
});

export const videoCardSchema = z.object({
  eyebrow: z.string().default('Moments on Film'),
  headline: z.string().default('Our Videos'),
  background: z.enum(['white', 'soft']).default('white'),
  videos: z.array(VideoItemSchema).default([]),
});

export type VideoCardData = z.infer<typeof videoCardSchema>;

export const defaultVideoCardData: VideoCardData = {
  eyebrow: 'Moments on Film',
  headline: 'Our Videos',
  background: 'white',
  videos: [
    {
      id: '1',
      title: 'Save the Date',
      description: 'A little sneak peek before the big day.',
      videoUrl: '',
      thumbnailUrl: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
      videoType: 'youtube',
    },
    {
      id: '2',
      title: 'Our Engagement Film',
      description: 'How we got here — the story of our proposal.',
      videoUrl: '',
      thumbnailUrl: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800',
      videoType: 'youtube',
    },
  ],
};

function getEmbedUrl(url: string, type: VideoItemSchema['shape']['videoType']['_type']): string | null {
  if (!url) return null;
  if (type === 'youtube') {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
  }
  if (type === 'vimeo') {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
  }
  if (type === 'direct') return url;
  return null;
}

const VideoCard: React.FC<SectionComponentProps<VideoCardData>> = ({ data }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const bg = data.background === 'soft' ? 'bg-stone-50' : 'bg-white';

  return (
    <section className={`py-24 md:py-32 ${bg}`} id="video">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">{data.eyebrow}</p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900">{data.headline}</h2>
        </div>

        {data.videos.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <Film size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No videos added yet.</p>
          </div>
        )}

        <div className={`grid grid-cols-1 ${data.videos.length > 1 ? 'md:grid-cols-2' : ''} gap-8`}>
          {data.videos.map(video => {
            const embedUrl = getEmbedUrl(video.videoUrl, video.videoType);
            const isPlaying = playingId === video.id;

            return (
              <div key={video.id} className="group rounded-2xl overflow-hidden border border-stone-100 bg-white shadow-sm hover:shadow-lg transition-shadow">
                <div className="relative aspect-video bg-stone-900 cursor-pointer" onClick={() => embedUrl && !isPlaying && setPlayingId(video.id)}>
                  {isPlaying && embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : video.thumbnailUrl ? (
                    <>
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                      {embedUrl ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                            <Play size={22} fill="white" className="text-white ml-0.5" />
                          </div>
                        </div>
                      ) : (
                        <div className="absolute bottom-3 right-3">
                          <PlayCircle size={20} className="text-white/50" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Film size={24} className="text-stone-600" />
                      <p className="text-stone-500 text-xs">No video yet</p>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {video.title && <h3 className="font-medium text-stone-900">{video.title}</h3>}
                  {video.description && <p className="text-stone-500 text-sm mt-1 leading-relaxed">{video.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const videoCardDefinition: SectionDefinition<VideoCardData> = {
  type: 'video',
  variant: 'card',
  schema: videoCardSchema,
  defaultData: defaultVideoCardData,
  Component: VideoCard,
};
