import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SectionRenderer } from '../builder/components/SectionRenderer';
import { BuilderSectionType, createDefaultSectionInstance } from '../types/builder/section';
import { createEmptyWeddingData } from '../types/weddingData';

type PreviewPhoto = {
  url: string;
  bucket: 'engagement' | 'engagement_event' | 'root' | string;
  orientation: 'portrait' | 'landscape' | 'square' | string;
};

const VALID_TYPES: BuilderSectionType[] = [
  'hero','story','venue','schedule','travel','registry','faq','rsvp','gallery','countdown','wedding-party','dress-code','accommodations','contact','footer-cta','custom','quotes','menu','music','directions','video'
];

const GLOBAL_HEADER_PHOTO = '/preview-photos/header-anchor.jpg';

const ORIENTATION_BY_SECTION: Partial<Record<BuilderSectionType, Array<'portrait' | 'landscape' | 'square'>>> = {
  hero: ['landscape'],
  story: ['landscape', 'portrait'],
  venue: ['landscape'],
  schedule: ['landscape'],
  travel: ['landscape'],
  registry: ['portrait', 'landscape'],
  faq: ['landscape'],
  rsvp: ['portrait', 'landscape'],
  gallery: ['landscape', 'portrait', 'square'],
  countdown: ['landscape'],
  'wedding-party': ['portrait', 'landscape'],
  'dress-code': ['portrait', 'landscape'],
  accommodations: ['landscape'],
  contact: ['portrait', 'landscape'],
  'footer-cta': ['landscape'],
  custom: ['landscape'],
  quotes: ['portrait', 'landscape'],
  menu: ['landscape'],
  music: ['landscape'],
  directions: ['landscape'],
  video: ['landscape'],
};

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickPhotos(pool: PreviewPhoto[], sectionType: BuilderSectionType, variant: string): { hero?: string; gallery: string[] } {
  const preferred = ORIENTATION_BY_SECTION[sectionType] ?? ['landscape', 'portrait'];
  const priorityBuckets = sectionType === 'hero'
    ? ['engagement', 'engagement_event', 'root']
    : ['engagement', 'engagement_event', 'root'];

  let candidatePool = pool;
  if (sectionType === 'hero') {
    const heroOnly = pool.filter((p) => p.bucket === 'engagement');
    if (heroOnly.length > 0) candidatePool = heroOnly;
  }

  const ranked = candidatePool
    .filter((p) => preferred.includes(p.orientation as any))
    .sort((a, b) => {
      const ba = priorityBuckets.indexOf(a.bucket);
      const bb = priorityBuckets.indexOf(b.bucket);
      return (ba === -1 ? 99 : ba) - (bb === -1 ? 99 : bb);
    });

  const fallback = ranked.length ? ranked : pool;
  if (!fallback.length) return { gallery: [] };

  const seed = hash(`${sectionType}:${variant}`);
  const hero = fallback[seed % fallback.length]?.url;
  const gallery: string[] = [];
  for (let i = 0; i < Math.min(8, fallback.length); i++) {
    gallery.push(fallback[(seed + i) % fallback.length].url);
  }

  return { hero, gallery };
}

export default function VariantPreviewCapture() {
  const [search] = useSearchParams();
  const sectionType = (search.get('sectionType') || 'hero') as BuilderSectionType;
  const variant = search.get('variant') || 'default';
  const safeType = VALID_TYPES.includes(sectionType) ? sectionType : 'hero';

  const [photos, setPhotos] = React.useState<PreviewPhoto[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/preview-photos/manifest.json', { cache: 'no-store' });
        const json = await res.json();
        const items = (json?.items ?? []) as Array<{ url?: string; bucket?: string; orientation?: string }>;
        const normalized: PreviewPhoto[] = items
          .map((i) => ({
            url: i.url ?? '',
            bucket: i.bucket ?? 'root',
            orientation: i.orientation ?? 'landscape',
          }))
          .filter((i) => Boolean(i.url));
        if (mounted) setPhotos(normalized);
      } catch {
        if (mounted) setPhotos([]);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const section = React.useMemo(() => {
    const s = createDefaultSectionInstance(safeType, variant, 0);
    const picks = pickPhotos(photos, safeType, variant);

    const headerPhoto = GLOBAL_HEADER_PHOTO;
    (s.settings as Record<string, unknown>).backgroundImage = headerPhoto;
    (s.settings as Record<string, unknown>).imageUrl = headerPhoto;
    (s.settings as Record<string, unknown>).heroImage = headerPhoto;
    (s.settings as Record<string, unknown>).photo = headerPhoto;
    (s.settings as Record<string, unknown>).overlayOpacity = 28;

    return { ...s, id: 'preview-section' };
  }, [safeType, variant, photos]);

  const weddingData = React.useMemo(() => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Kara';
    data.couple.partner2Name = 'Eric';
    data.couple.displayName = 'Kara & Eric';
    data.couple.story = 'We are getting married. We are really happy you are here.';
    data.venues = [{ id: 'v1', name: 'Rosewood Estate', address: 'Napa Valley, CA' }];

    const picks = pickPhotos(photos, safeType, variant);
    data.media.heroImageUrl = GLOBAL_HEADER_PHOTO;
    data.media.gallery = picks.gallery.map((url, i) => ({ id: `g${i + 1}`, url, caption: `Moment ${i + 1}` }));

    data.schedule = [
      { id: 's1', label: 'Welcome Dinner', startTimeISO: '2027-01-16T18:00:00.000Z', venueId: 'v1', notes: 'A relaxed night with everyone' },
      { id: 's2', label: 'Ceremony', startTimeISO: '2027-01-17T17:00:00.000Z', venueId: 'v1', notes: 'Please arrive 20 minutes early' },
      { id: 's3', label: 'Reception', startTimeISO: '2027-01-17T19:00:00.000Z', venueId: 'v1', notes: 'Dinner and dancing right after' },
    ];

    return data;
  }, [photos, safeType, variant]);

  return (
    <div
      id="variant-preview-root"
      data-variant-preview-ready={ready ? 'true' : 'false'}
      style={{ width: 960, height: 540, overflow: 'hidden', background: '#fff' }}
    >
      <SectionRenderer section={section} weddingData={weddingData} isPreview siteSlug="preview" />
    </div>
  );
}
