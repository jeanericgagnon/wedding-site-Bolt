import React, { useState } from 'react';
import { z } from 'zod';
import { Play, Film } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

export const videoInlineSchema = z.object({
  eyebrow: z.string().default('Watch'),
  headline: z.string().default('Our Story in Motion'),
  bodyText: z.string().default(''),
  videoUrl: z.string().default(''),
  thumbnailUrl: z.string().default(''),
  videoType: z.enum(['youtube', 'vimeo', 'direct']).default('youtube'),
  contentPosition: z.enum(['left', 'right']).default('left'),
});

export type VideoInlineData = z.infer<typeof videoInlineSchema>;

export const defaultVideoInlineData: VideoInlineData = {
  eyebrow: 'Watch',
  headline: 'Our Story in Motion',
  bodyText: 'Before the big day, we wanted to share a little glimpse into our journey together. From the first hello to this moment, every step has led us here.',
  videoUrl: '',
  thumbnailUrl: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
  videoType: 'youtube',
  contentPosition: 'left',
};

function getEmbedUrl(url: string, type: VideoInlineData['videoType'], autoplay: boolean): string | null {
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

const VideoInline: React.FC<SectionComponentProps<VideoInlineData>> = ({ data }) => {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getEmbedUrl(data.videoUrl, data.videoType, playing);
  const isLeft = data.contentPosition === 'left';

  const content = (
    <div className="flex flex-col justify-center">
      {data.eyebrow && (
        <p className="text-xs uppercase tracking-[0.25em] text-rose-400 font-medium mb-4">{data.eyebrow}</p>
      )}
      <h2 className="text-3xl md:text-4xl font-light text-stone-900 mb-6">{data.headline}</h2>
      {data.bodyText && (
        <p className="text-stone-600 leading-relaxed">{data.bodyText}</p>
      )}
    </div>
  );

  const videoPlayer = (
    <div className="relative aspect-video rounded-xl overflow-hidden bg-stone-900 shadow-lg">
      {!playing && data.thumbnailUrl ? (
        <div
          className="absolute inset-0 cursor-pointer group"
          onClick={() => embedUrl && setPlaying(true)}
        >
          <img
            src={data.thumbnailUrl}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
          {embedUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xl">
                <Play size={24} fill="white" className="text-white ml-1" />
              </div>
            </div>
          )}
        </div>
      ) : embedUrl ? (
        <iframe
          src={embedUrl}
          title="Wedding video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      ) : data.videoType === 'direct' && data.videoUrl ? (
        <video
          src={data.videoUrl}
          controls
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <Film size={24} className="text-stone-600" />
          <p className="text-stone-500 text-xs">Add a video URL</p>
        </div>
      )}
    </div>
  );

  return (
    <section className="py-24 md:py-32 bg-white" id="video">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {isLeft ? (
            <>
              {content}
              {videoPlayer}
            </>
          ) : (
            <>
              {videoPlayer}
              {content}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export const videoInlineDefinition: SectionDefinition<VideoInlineData> = {
  type: 'video',
  variant: 'inline',
  schema: videoInlineSchema,
  defaultData: defaultVideoInlineData,
  Component: VideoInline,
};
