import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { Play, Film } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { getSafePublicImageUrl, getSafePublicVideoEmbedUrl } from '../../publicLinks';

export const videoFullSchema = z.object({
  eyebrow: z.string().default(''),
  headline: z.string().default('Our Save the Date'),
  subtitle: z.string().default(''),
  videoUrl: z.string().default(''),
  thumbnailUrl: z.string().default(''),
  videoType: z.enum(['youtube', 'vimeo', 'direct']).default('youtube'),
  background: z.enum(['white', 'dark', 'soft']).default('dark'),
  autoplay: z.boolean().default(false),
  layoutStyle: z.enum(['full', 'background', 'lightbox', 'reel']).default('full'),
});

export type VideoFullData = z.infer<typeof videoFullSchema>;

export const defaultVideoFullData: VideoFullData = {
  eyebrow: 'Before the Big Day',
  headline: 'Our Save the Date',
  subtitle: 'We made something special just for you.',
  videoUrl: '',
  thumbnailUrl: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1600&q=85',
  videoType: 'youtube',
  background: 'dark',
  autoplay: false,
  layoutStyle: 'full',
};

const bgMap: Record<string, { section: string; headline: string; sub: string }> = {
  white: { section: 'bg-white', headline: 'text-stone-900', sub: 'text-stone-500' },
  soft: { section: 'bg-stone-50', headline: 'text-stone-900', sub: 'text-stone-500' },
  dark: { section: 'bg-stone-950', headline: 'text-white', sub: 'text-stone-400' },
};

const VideoFull: React.FC<SectionComponentProps<VideoFullData>> = ({ data }) => {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getSafePublicVideoEmbedUrl(data.videoUrl, data.videoType, data.autoplay || playing);
  const autoplayEmbedUrl = getSafePublicVideoEmbedUrl(data.videoUrl, data.videoType, true);
  const thumbnailUrl = getSafePublicImageUrl(data.thumbnailUrl);
  const safeDirectVideoUrl = data.videoType === 'direct' ? getSafePublicVideoEmbedUrl(data.videoUrl, 'direct') : '';
  const colors = bgMap[data.background] ?? bgMap.dark;

  useEffect(() => {
    setPlaying(false);
  }, [data.layoutStyle, data.videoType, data.videoUrl, data.thumbnailUrl, data.autoplay]);

  if (data.layoutStyle === 'background') {
    return (
      <section className="relative min-h-[620px] flex items-center overflow-hidden bg-stone-950" id="video">
        {safeDirectVideoUrl ? (
          <video src={safeDirectVideoUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-60" />
        ) : thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-stone-950/25" />
        <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
          {data.eyebrow && <p className="text-sm text-white/55 font-light mb-4">{data.eyebrow}</p>}
          <h2 className="text-4xl md:text-7xl font-light">{data.headline}</h2>
          {data.subtitle && <p className="mt-5 text-white/70 leading-relaxed">{data.subtitle}</p>}
          {embedUrl && (
            <button type="button" onClick={() => setPlaying(true)} className="mt-8 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30">
              <Play size={24} fill="currentColor" className="ml-1" />
            </button>
          )}
          {playing && embedUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setPlaying(false)}>
              <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black" onClick={(event) => event.stopPropagation()}>
                <iframe src={embedUrl} title="Wedding video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full border-0" />
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'reel') {
    return (
      <section className="py-28 md:py-36 bg-stone-50" id="video">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-12 items-center">
            <div>
              {data.eyebrow && <p className="text-sm text-stone-400 font-light mb-4">{data.eyebrow}</p>}
              <h2 className="text-4xl md:text-6xl font-light text-stone-950">{data.headline}</h2>
              {data.subtitle && <p className="mt-5 text-stone-500 leading-relaxed">{data.subtitle}</p>}
            </div>
            <div className="mx-auto w-full max-w-[360px] rounded-[2.5rem] border-[10px] border-stone-950 bg-stone-950 p-2 shadow-2xl shadow-stone-900/20">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[1.8rem] bg-stone-900">
                {safeDirectVideoUrl ? (
                  <video src={safeDirectVideoUrl} controls className="h-full w-full object-cover" />
                ) : thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Video thumbnail" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-stone-500">
                    <Film size={28} />
                    <p className="text-xs">Add a 9:16 reel</p>
                  </div>
                )}
                {embedUrl && (
                  <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur"><Play size={24} fill="currentColor" className="ml-1" /></span>
                  </button>
                )}
              </div>
            </div>
          </div>
          {playing && embedUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setPlaying(false)}>
              <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black" onClick={(event) => event.stopPropagation()}>
                <iframe src={embedUrl} title="Wedding reel" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full border-0" />
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (data.layoutStyle === 'lightbox') {
    return (
      <section className={`py-28 md:py-36 ${colors.section}`} id="video">
        <div className="max-w-4xl mx-auto px-6 text-center">
          {data.eyebrow && <p className={`text-sm font-light mb-4 ${data.background === 'dark' ? 'text-stone-500' : 'text-stone-400'}`}>{data.eyebrow}</p>}
          <h2 className={`text-4xl md:text-6xl font-light ${colors.headline}`}>{data.headline}</h2>
          {data.subtitle && <p className={`mt-4 ${colors.sub}`}>{data.subtitle}</p>}
          <button type="button" onClick={() => embedUrl && setPlaying(true)} className="group relative mt-10 aspect-[16/9] w-full overflow-hidden rounded-[2rem] bg-stone-900 shadow-2xl">
            {thumbnailUrl && <img src={thumbnailUrl} alt="Video thumbnail" className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur"><Play size={30} fill="currentColor" className="ml-1" /></span>
            </span>
          </button>
          {playing && embedUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setPlaying(false)}>
              <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black" onClick={(event) => event.stopPropagation()}>
                <iframe src={embedUrl} title="Wedding video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full border-0" />
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={`relative overflow-hidden py-28 md:py-36 ${colors.section}`} id="video">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.12),transparent_55%)]" />
      <div className="relative max-w-5xl mx-auto px-6 md:px-12">
        <div className="text-center mb-12">
          {data.eyebrow && (
            <p className={`text-sm font-light mb-4 ${data.background === 'dark' ? 'text-stone-500' : 'text-stone-400'}`}>{data.eyebrow}</p>
          )}
          <h2 className={`text-4xl md:text-5xl font-light mb-4 ${colors.headline}`}>{data.headline}</h2>
          {data.subtitle && (
            <p className={`leading-relaxed ${colors.sub}`}>{data.subtitle}</p>
          )}
        </div>

        <div className="relative aspect-video rounded-[2rem] overflow-hidden bg-stone-900 shadow-2xl ring-1 ring-white/10">
          {!playing && !data.autoplay && thumbnailUrl ? (
            <div
              className="absolute inset-0 cursor-pointer group"
              onClick={() => embedUrl && setPlaying(true)}
            >
              <img
                src={thumbnailUrl}
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
              src={playing ? embedUrl : autoplayEmbedUrl}
              title="Wedding video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : safeDirectVideoUrl ? (
            <video
              src={safeDirectVideoUrl}
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

function videoFullVariant(variant: string, layoutStyle: VideoFullData['layoutStyle'], overrides: Partial<VideoFullData> = {}): SectionDefinition<VideoFullData> {
  return {
    type: 'video',
    variant,
    schema: videoFullSchema,
    defaultData: { ...defaultVideoFullData, layoutStyle, ...overrides },
    Component: VideoFull,
  };
}

export const videoBackgroundDefinition = videoFullVariant('background', 'background', { autoplay: true });
export const videoLightboxDefinition = videoFullVariant('lightbox', 'lightbox', { autoplay: false });
export const videoReelDefinition = videoFullVariant('reel', 'reel', { background: 'soft' });
