import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTemplatePack } from '../builder/constants/builderTemplatePacks';
import { createDefaultSectionInstance } from '../types/builder/section';
import { createEmptyWeddingData } from '../types/weddingData';
import { SectionRenderer } from '../builder/components/SectionRenderer';
import { applyThemePreset } from '../lib/themePresets';
import { loadPreviewPhotoManifest, type PreviewPhotoManifestEntry } from './previewPhotoManifestService';

type PreviewPhoto = PreviewPhotoManifestEntry;

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickPhotos(pool: PreviewPhoto[], seed: string, limit = 16): string[] {
  if (!pool.length) return [];
  const start = hash(seed) % pool.length;
  const out: string[] = [];
  for (let i = 0; i < Math.min(limit, pool.length); i++) {
    out.push(pool[(start + i) % pool.length].url);
  }
  return out;
}

export default function TemplateScrollCapture() {
  const [search] = useSearchParams();
  const templateId = search.get('templateId') || 'modern-luxe';
  const showPreviewMeta = search.get('showPreviewMeta') === '1';

  const [photos, setPhotos] = React.useState<PreviewPhoto[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const normalized: PreviewPhoto[] = await loadPreviewPhotoManifest();
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

  const template = getTemplatePack(templateId);

  React.useEffect(() => {
    if (!template?.defaultThemeId) return;
    applyThemePreset(template.defaultThemeId);
  }, [template?.id, template?.defaultThemeId]);

  const sections = React.useMemo(() => {
    if (!template) return [];
    return template.sectionComposition
      .filter((s) => s.enabled)
      .map((s, idx) => ({
        ...createDefaultSectionInstance(s.type, s.variant, idx),
        enabled: s.enabled,
        locked: s.locked,
        settings: { ...s.settings },
      }));
  }, [template]);

  const weddingData = React.useMemo(() => {
    const data = createEmptyWeddingData();
    data.couple.partner1Name = 'Kara';
    data.couple.partner2Name = 'Eric';
    data.couple.displayName = 'Kara & Eric';
    data.event.weddingDateISO = new Date('2027-01-17T16:00:00-07:00').toISOString();
    data.venues = [
      {
        id: 'amor',
        name: 'Amor Boutique Hotel',
        address: 'Pescadores S/N, 63734 Sayulita, Nay., Mexico',
      },
    ];

    const engagementEventLandscape = photos
      .filter((p) => p.bucket.toLowerCase() === 'engagement_event' && p.orientation === 'landscape')
      .map((p) => p.url);
    const engagementLandscape = photos
      .filter((p) => p.bucket.toLowerCase().includes('engagement') && p.orientation === 'landscape')
      .map((p) => p.url);
    const anyLandscape = photos.filter((p) => p.orientation === 'landscape').map((p) => p.url);
    const allPicked = pickPhotos(photos, templateId, 48);

    const preferredPool = engagementEventLandscape.length ? engagementEventLandscape : engagementLandscape;

    const engagementPicked = pickPhotos(
      preferredPool.map((url) => ({ url, bucket: 'engagement_event', orientation: 'landscape' })),
      `engagement-event-${templateId}`,
      24
    );

    const selected = Array.from(new Set([...engagementPicked, ...allPicked])).slice(0, 24);

    const hero =
      engagementPicked[0] ||
      preferredPool[(hash(`hero-${templateId}`) % (preferredPool.length || 1))] ||
      anyLandscape[(hash(`hero-fallback-${templateId}`) % (anyLandscape.length || 1))] ||
      selected[0] ||
      '/preview-photos/header-anchor.jpg';

    data.media.heroImageUrl = hero;
    data.media.gallery = selected.map((url, i) => ({ id: `g-${i + 1}`, url, caption: `Moment ${i + 1}` }));

    data.schedule = [
      { id: 's1', label: 'Pickleball', startTimeISO: '2027-01-15T12:00:00-07:00', venueId: 'amor', notes: 'Come play with us. Beginner friendly.' },
      { id: 's2', label: 'Welcome Dinner', startTimeISO: '2027-01-15T18:00:00-07:00', venueId: 'amor', notes: 'Pizza and margaritas at La Rustica.' },
      { id: 's3', label: 'Beach & Pool Day', startTimeISO: '2027-01-16T12:00:00-07:00', venueId: 'amor', notes: 'No agenda today — relax and explore.' },
      { id: 's4', label: 'The Wedding', startTimeISO: '2027-01-17T16:00:00-07:00', venueId: 'amor', notes: 'Ceremony followed by drinks, dinner, and dancing.' },
    ];

    data.registry = {
      enabled: true,
      intro: 'A few sample gifts and funds to show how this section can feel.',
      items: [
        { id: 'r1', title: 'Honeymoon Dinner', description: 'A special dinner in Sayulita', type: 'cash', amount: 120 },
        { id: 'r2', title: 'Snorkel Excursion', description: 'Adventure day for two', type: 'cash', amount: 180 },
        { id: 'r3', title: 'Home Upgrade Fund', description: 'Contribute to our first home upgrades', type: 'cash', amount: 250 },
      ],
    } as any;

    data.rsvp = {
      enabled: true,
      intro: 'Please RSVP as soon as you can so we can plan accordingly.',
      mealOptions: ['Steak', 'Fish', 'Vegetarian'],
    } as any;

    return data;
  }, [photos, templateId]);

  if (!template) {
    return (
      <div id="template-scroll-root" data-template-scroll-ready="true" className="min-h-screen bg-white px-6 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          That design preview is not available right now.
        </div>
      </div>
    );
  }

  return (
    <div id="template-scroll-root" data-template-scroll-ready={ready ? 'true' : 'false'} className="bg-white min-h-screen">
      {showPreviewMeta && (
        <section className="px-6 py-10 md:px-10 md:py-14 border-b border-neutral-200 bg-white">
          <p className="text-sm text-neutral-500">Preview dataset · Template: {template.id}</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold text-neutral-900">Kara & Eric</h1>
          <p className="mt-2 text-neutral-700">Sunday, January 17, 2027 · Sayulita, Mexico</p>
          <p className="mt-1 text-neutral-600">Amor Boutique Hotel · Pescadores S/N, 63734 Sayulita, Nay., Mexico</p>
        </section>
      )}

      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          weddingData={weddingData}
          isPreview
          siteSlug="template-preview"
          strictVariantMatching
        />
      ))}
    </div>
  );
}
