import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Camera, Heart, Share2, Sparkles } from 'lucide-react';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';
import { copyTextOrDownload } from '../lib/copyText';
import { customerSafeErrorMessage } from '../lib/customerSafeError';
import { readStoredGuestLanguage, resolveGuestLanguagePreference, writeStoredGuestLanguage } from '../lib/guestLanguagePreference';
import {
  buildPublicAccessArtifacts,
  capturePublicInviteTokenFromSearch,
} from '../lib/publicAccessArtifacts';
import {
  fetchGuestRecapConfig,
  hasGuestHubPublicRuntime,
  submitGuestHubProspect,
  trackGuestHubEvent,
} from './guestHubPublicService';
import { EventRecapLiveContent } from './EventRecapLiveContent';

export const buildEventRecapGuestHubAccessPayload = (slug: string) => {
  const searchParams = new URLSearchParams(window.location.search);
  return buildPublicAccessArtifacts(slug, searchParams);
};

export const buildEventRecapAccessHeaders = (slug: string) => {
  const access = buildEventRecapGuestHubAccessPayload(slug);
  return {
    ...(access.inviteToken ? { 'x-dayof-invite-token': access.inviteToken } : {}),
    ...(access.passwordSession ? { 'x-dayof-password-session': access.passwordSession } : {}),
  };
};

type RecapCard = {
  id: string;
  filename: string;
  imageUrl: string | null;
  guestName: string | null;
  note: string | null;
  mimeType: string | null;
  uploadedAt: string;
  takenAt: string | null;
  bucketName: string;
  caption: string | null;
  moment: string | null;
  tags: string[];
  featured?: boolean;
  story?: boolean;
};

type RecapData = {
  site: { slug: string; coupleName1: string | null; coupleName2: string | null; weddingDate: string | null; recapStatus?: string; recapPublishedAt?: string | null };
  summary: { uploadCount: number; highlightCount: number; chapterCount: number; curatedCount?: number; storyCount?: number };
  highlights: RecapCard[];
  chapters: Array<{ date: string; count: number; highlights: RecapCard[] }>;
};

const normalizeSiteRef = (value?: string) => (value ?? '').trim().toLowerCase();

const formatRecapChapterDate = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'unknown' || normalized === 'undated' || normalized === 'null') {
    return 'Undated moments';
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return 'Undated moments';
  }

  return parsed.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

export const friendlyEventRecapError = (err: unknown, fallback: string) => {
  return customerSafeErrorMessage(err, fallback, {
    allow: [/^Add an email or phone so we can send the recap\.$/i],
  });
};

export const safeEventRecapFunctionError = (value: unknown, fallback: string) => {
  return friendlyEventRecapError(typeof value === 'string' ? value : '', fallback);
};

export const formatEventRecapAlbumLabel = (value: string | null | undefined) => {
  const cleaned = (value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\bbucket\b/gi, 'album')
    .replace(/\bmetadata\b/gi, 'details')
    .trim();

  if (!cleaned) return 'Wedding moment';

  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

export const EventRecap: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { siteRef } = useParams();
  const slug = normalizeSiteRef(siteRef);
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [data, setData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [wantsOwnEventInfo, setWantsOwnEventInfo] = useState(false);
  const [optInStatus, setOptInStatus] = useState<string | null>(null);
  const [savingOptIn, setSavingOptIn] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [generatingStory, setGeneratingStory] = useState(false);
  const recap = data;

  useEffect(() => {
    if (slug) capturePublicInviteTokenFromSearch(slug, searchParams);
    const languagePreference = resolveGuestLanguagePreference({
      search: searchParams,
      storedLanguage: readStoredGuestLanguage(),
    });
    if (languagePreference.language !== i18n.language?.split('-')[0]?.toLowerCase()) {
      void i18n.changeLanguage(languagePreference.language);
    }
    if (languagePreference.source === 'guest-link') {
      writeStoredGuestLanguage(languagePreference.language);
    }
  }, [i18n, searchParams, slug]);

  useEffect(() => {
    if (!slug || !hasGuestHubPublicRuntime()) return;
    let cancelled = false;
    setLoading(true);
    fetchGuestRecapConfig<RecapData>(slug, buildEventRecapAccessHeaders(slug), 'Couldn’t load the recap.')
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError('Couldn’t load the recap right now. Please refresh and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    trackGuestHubEvent(slug, 'view', '/event/recap', buildEventRecapGuestHubAccessPayload(slug)).catch(() => {});
  }, [slug]);

  const coupleLabel = useMemo(() => {
    const names = [data?.site.coupleName1, data?.site.coupleName2].filter(Boolean);
    return names.length ? names.join(' & ') : slug.replace(/-/g, ' ');
  }, [data?.site.coupleName1, data?.site.coupleName2, slug]);
  const storyCaption = `${coupleLabel}'s wedding recap is live on dayof: ${typeof window !== 'undefined' ? window.location.origin : 'https://dayof.love'}/event/${encodeURIComponent(slug)}/recap`;

  const submitOptIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasGuestHubPublicRuntime()) return;
    if (!email.trim() && !phone.trim()) {
      setOptInStatus('Add an email or phone so we can send the recap.');
      return;
    }
    setSavingOptIn(true);
    setOptInStatus(null);
    try {
      await submitGuestHubProspect(
        {
          siteSlug: slug,
          guestName,
          email,
          phone,
          wantsPhotoUpdates: true,
          wantsOwnEventInfo,
          source: 'guest_recap',
          ...buildEventRecapGuestHubAccessPayload(slug),
        },
        'Couldn’t save.',
      );
      setOptInStatus(wantsOwnEventInfo ? 'Saved. We will send the recap and a dayof link for your own event.' : 'Saved. We will send the recap when it is ready.');
      setEmail('');
      setPhone('');
    } catch (err) {
      setOptInStatus(friendlyEventRecapError(err, 'Couldn’t save right now. Please try again in a moment.'));
    } finally {
      setSavingOptIn(false);
    }
  };

  const shareRecap = async (card?: RecapCard) => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/event/${encodeURIComponent(slug)}/recap`
      : `https://dayof.love/event/${encodeURIComponent(slug)}/recap`;
    const title = card ? `${coupleLabel} wedding moment` : `${coupleLabel} wedding recap`;
    const text = card?.caption || card?.note || `Relive ${coupleLabel}'s wedding moments on dayof.`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setShareStatus(t('event_recap.share_status'));
        return;
      }
      const result = await copyTextOrDownload(url, `${slug || 'dayof'}-recap-link.txt`);
      setShareStatus(result === 'copied'
        ? t('event_recap.link_copied')
        : t('event_recap.link_downloaded'));
    } catch {
      setShareStatus('Copy this recap link from your browser bar.');
    }
  };

  const copyStoryCaption = async () => {
    try {
      const result = await copyTextOrDownload(storyCaption, `${slug || 'dayof'}-story-caption.txt`);
      setShareStatus(result === 'copied' ? t('event_recap.link_copied') : t('event_recap.link_downloaded'));
    } catch {
      setShareStatus('Copy the recap link from your browser bar.');
    }
  };

  const loadCanvasImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  const drawCoverImage = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const sw = width / scale;
    const sh = height / scale;
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  };

  const downloadStoryAsset = async () => {
    if (!data) return;
    setGeneratingStory(true);
    setShareStatus(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Couldn’t create the story image.');

      const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
      gradient.addColorStop(0, '#fff7ed');
      gradient.addColorStop(0.45, '#fbf7f1');
      gradient.addColorStop(1, '#1a1715');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1920);

      const imageCards = data.highlights
        .filter((card) => card.imageUrl && card.mimeType?.startsWith('image/'))
        .sort((a, b) => Number(b.story === true) - Number(a.story === true) || Number(b.featured === true) - Number(a.featured === true))
        .slice(0, 3);
      const loadedImages = await Promise.all(imageCards.map((card) => loadCanvasImage(card.imageUrl!)));
      const images = loadedImages.filter((img): img is HTMLImageElement => Boolean(img));

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 18;
      const slots = [
        { x: 96, y: 250, width: 560, height: 700, rotate: -0.05 },
        { x: 430, y: 470, width: 520, height: 640, rotate: 0.055 },
        { x: 160, y: 900, width: 640, height: 520, rotate: -0.025 },
      ];
      images.forEach((img, index) => {
        const slot = slots[index];
        ctx.save();
        ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
        ctx.rotate(slot.rotate);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-slot.width / 2 - 18, -slot.height / 2 - 18, slot.width + 36, slot.height + 36);
        drawCoverImage(ctx, img, -slot.width / 2, -slot.height / 2, slot.width, slot.height);
        ctx.restore();
      });
      ctx.restore();

      if (images.length === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(96, 280, 888, 820);
        ctx.fillStyle = '#1f1d1b';
        ctx.font = '700 58px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        wrapText(ctx, 'Wedding moments, guest photos, and a full recap', 720).slice(0, 4).forEach((line, index) => {
          ctx.fillText(line, 150, 420 + index * 74);
        });
      }

      ctx.fillStyle = 'rgba(26,23,21,0.88)';
      ctx.fillRect(0, 1320, 1080, 600);
      ctx.fillStyle = '#c8a97e';
      ctx.font = '700 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Wedding recap', 96, 1435);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 82px Georgia, serif';
      wrapText(ctx, coupleLabel, 870).slice(0, 3).forEach((line, index) => {
        ctx.fillText(line, 96, 1545 + index * 94);
      });
      ctx.font = '400 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      const recapText = `${data.summary.uploadCount} shared uploads · ${data.summary.highlightCount} top moments`;
      ctx.fillText(recapText, 96, 1790);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 32px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('dayof.love', 96, 1858);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Couldn’t export the story image.');
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${slug || 'dayof'}-story-recap.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      setShareStatus('Story image downloaded. Share it from your phone and paste the caption.');
    } catch (err) {
      setShareStatus(customerSafeErrorMessage(err, 'Couldn’t generate the story image.', {
        allow: [/^Couldn’t export the story image\.$/i],
      }));
    } finally {
      setGeneratingStory(false);
    }
  };

  const recapLoadingView = (
    <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 text-neutral-600">{t('event_recap.loading')}</div>
  );

  const recapErrorView = (
    <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-neutral-700">
      {error || 'Couldn’t load the recap right now. Please refresh and try again.'}
    </div>
  );

  const recapContentView = (
    <>
      {recap && recap.highlights.length > 0 && (
        <section className="mt-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-neutral-700" />
          <h2 className="text-2xl font-semibold">{t('event_recap.top_moments')}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recap.highlights.slice(0, 12).map((card) => (
            <article key={card.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {card.imageUrl && card.mimeType?.startsWith('image/') ? (
                <img src={card.imageUrl} alt={card.caption || card.filename} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-neutral-100 text-neutral-500">
                  <Camera className="h-8 w-8" />
                </div>
              )}
              <div className="p-4">
                <p className="text-xs font-semibold text-neutral-600">{formatEventRecapAlbumLabel(card.bucketName)}</p>
                {(card.featured || card.story) && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {card.featured && <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">Featured</span>}
                    {card.story && <span className="rounded bg-neutral-950 px-2 py-0.5 text-[11px] font-medium text-white">Story pick</span>}
                  </div>
                )}
                <p className="mt-2 text-sm leading-6 text-neutral-800">{card.caption || card.note || t('event_recap.default_moment')}</p>
                {card.guestName && <p className="mt-3 text-xs text-neutral-500">{t('event_recap.shared_by', { name: card.guestName })}</p>}
                <button
                  type="button"
                  onClick={() => void shareRecap(card)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {t('event_recap.share_moment')}
                </button>
              </div>
            </article>
          ))}
        </div>
        </section>
      )}

      {recap && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-neutral-700" />
            <h2 className="text-xl font-semibold">{t('event_recap.memory_chapters')}</h2>
          </div>
          <div className="mt-4 space-y-3">
            {recap.chapters.slice(0, 6).map((chapter) => (
              <div key={chapter.date} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-900">{formatRecapChapterDate(chapter.date)}</p>
                <p className="mt-1 text-sm text-neutral-600">{chapter.count} shared moment{chapter.count === 1 ? '' : 's'}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-neutral-900">{t('event_recap.post_socials')}</p>
            <p className="mt-1 text-sm leading-6 text-neutral-600">
              {t('event_recap.post_socials_detail')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void downloadStoryAsset()}
                disabled={generatingStory}
                className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {generatingStory ? t('event_recap.creating') : t('event_recap.download_story')}
              </button>
              <button
                type="button"
                onClick={() => void shareRecap()}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-white"
              >
                <Share2 className="h-4 w-4" />
                {t('event_recap.share_recap')}
              </button>
              <button
                type="button"
                onClick={() => void copyStoryCaption()}
                className="inline-flex rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-white"
              >
                {t('event_recap.copy_caption')}
              </button>
            </div>
          </div>
        </div>
        <form onSubmit={submitOptIn} className="rounded-lg border border-neutral-200 bg-white p-5" aria-busy={savingOptIn}>
          <p className="text-xs font-semibold text-neutral-600">{t('event_recap.get_album')}</p>
          <h2 className="mt-3 text-2xl font-semibold">{t('event_recap.send_me')}</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {t('event_recap.send_me_detail')}
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="event-recap-guest-name" className="mb-1 block text-sm font-medium text-neutral-800">Your name (optional)</label>
              <input id="event-recap-guest-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm" />
            </div>
            <div>
              <label htmlFor="event-recap-email" className="mb-1 block text-sm font-medium text-neutral-800">Email (optional)</label>
              <input id="event-recap-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm" />
            </div>
            <div>
              <label htmlFor="event-recap-phone" className="mb-1 block text-sm font-medium text-neutral-800">{t('event_recap.phone_optional')}</label>
              <input id="event-recap-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('event_recap.phone_optional')} className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm" />
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
              <input type="checkbox" checked={wantsOwnEventInfo} onChange={(e) => setWantsOwnEventInfo(e.target.checked)} className="mt-1" />
              <span>{t('event_recap.own_event')}</span>
            </label>
          </div>
          {optInStatus && <p role={optInStatus.startsWith('Saved.') ? 'status' : 'alert'} className="mt-3 text-sm text-neutral-700">{optInStatus}</p>}
          <button disabled={savingOptIn} className="mt-4 w-full rounded-lg bg-neutral-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {savingOptIn ? t('guest_hub.saving') : t('event_recap.get_recap')}
          </button>
          <Link to="/signup" className="mt-3 block text-center text-sm font-medium text-neutral-700 hover:underline">
            {t('event_recap.create_own')}
          </Link>
        </form>
        </section>
      )}
    </>
  );

  return (
    <>
      <OwnerPreviewBanner />
      <EventRecapLiveContent
        t={t}
        slug={slug}
        coupleLabel={coupleLabel}
        shareStatus={shareStatus}
        data={data}
        loading={loading}
        recapLoadingView={recapLoadingView}
        recapErrorView={recapErrorView}
        recapContentView={recapContentView}
        onShareRecap={() => shareRecap()}
      />
    </>
  );
};

export default EventRecap;
