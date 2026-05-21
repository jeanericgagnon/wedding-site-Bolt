import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, ImageOff, LayoutGrid, Search } from 'lucide-react';
import { getAllSectionManifests } from '../../builder/registry/sectionManifests';
import { getVariantQualityLabel, getVariantQualityScore, type VariantQualityFlag } from '../../builder/utils/variantQuality';
import { useInternalToolingRouteAccess } from '../../lib/internalToolingRoutes';

type VariantFilter = 'all' | 'needs-work' | 'review' | 'shared-preview' | 'missing-preview' | 'mobile-risk' | 'missing-guidance';

export const BuilderVariantGallery: React.FC = () => {
  const { internalToolingCaptureRoutesEnabled } = useInternalToolingRouteAccess();
  const manifests = React.useMemo(() => getAllSectionManifests(), []);
  const [query, setQuery] = React.useState('');
  const [sectionFilter, setSectionFilter] = React.useState('all');
  const [variantFilter, setVariantFilter] = React.useState<VariantFilter>('all');
  const [missingPreviews, setMissingPreviews] = React.useState<Record<string, boolean>>({});
  const totalVariants = manifests.reduce((sum, manifest) => sum + manifest.variantMeta.length, 0);
  const allVariantRows = React.useMemo(() => manifests.flatMap((manifest) => (
    manifest.variantMeta.map((variant) => ({
      manifest,
      variant,
      quality: getVariantQualityScore(manifest.type, variant, manifest.variantMeta.length),
      key: `${manifest.type}::${variant.id}`,
    }))
  )), [manifests]);
  const qualityCounts = React.useMemo(() => allVariantRows.reduce((acc, row) => {
    acc[row.quality.status] += 1;
    if (row.quality.flags.includes('shared-preview')) acc.sharedPreview += 1;
    if (row.quality.flags.includes('mobile-risk')) acc.mobileRisk += 1;
    if (row.quality.flags.includes('missing-guidance')) acc.missingGuidance += 1;
    return acc;
  }, { strong: 0, review: 0, 'needs-work': 0, sharedPreview: 0, mobileRisk: 0, missingGuidance: 0 }), [allVariantRows]);
  const missingPreviewCount = Object.values(missingPreviews).filter(Boolean).length;
  const normalizedQuery = query.trim().toLowerCase();

  const filteredManifests = React.useMemo(() => manifests.map((manifest) => {
    const rows = allVariantRows.filter((row) => row.manifest.type === manifest.type);
    const variants = rows.filter((row) => {
      if (sectionFilter !== 'all' && row.manifest.type !== sectionFilter) return false;
      if (normalizedQuery && !`${row.manifest.label} ${row.manifest.type} ${row.variant.id} ${row.variant.label} ${row.variant.description} ${row.variant.bestFor ?? ''} ${row.variant.effort ?? ''}`.toLowerCase().includes(normalizedQuery)) return false;
      if (variantFilter === 'needs-work' && row.quality.status !== 'needs-work') return false;
      if (variantFilter === 'review' && row.quality.status !== 'review') return false;
      if (variantFilter === 'shared-preview' && !row.quality.flags.includes('shared-preview')) return false;
      if (variantFilter === 'mobile-risk' && !row.quality.flags.includes('mobile-risk')) return false;
      if (variantFilter === 'missing-guidance' && !row.quality.flags.includes('missing-guidance')) return false;
      if (variantFilter === 'missing-preview' && !missingPreviews[row.key]) return false;
      return true;
    });
    return { manifest, variants };
  }).filter((group) => group.variants.length > 0), [allVariantRows, manifests, missingPreviews, normalizedQuery, sectionFilter, variantFilter]);

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <div className="max-w-none px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/dashboard/builder"
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={16} />
              Back to site editor
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
                <LayoutGrid size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Site layout gallery</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Browse the section designs available in the site editor and check which ones still need a polish pass.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:min-w-64">
            <div className="rounded-xl border border-border-subtle bg-white px-4 py-3">
              <p className="text-xs font-medium text-text-tertiary">Sections</p>
              <p className="mt-1 text-2xl font-semibold">{manifests.length}</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white px-4 py-3">
              <p className="text-xs font-medium text-text-tertiary">Layouts</p>
              <p className="mt-1 text-2xl font-semibold">{totalVariants}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search section, layout, style, or note"
                  className="h-11 w-full rounded-lg border border-border-subtle bg-surface pl-9 pr-3 text-sm outline-none ring-primary/10 focus:ring-4"
            />
          </label>
          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
            className="h-11 rounded-lg border border-border-subtle bg-surface px-3 text-sm text-text-secondary outline-none ring-primary/10 focus:ring-4"
          >
            <option value="all">All sections</option>
            {manifests.map((manifest) => (
              <option key={manifest.type} value={manifest.type}>{manifest.label}</option>
            ))}
          </select>
          <select
            value={variantFilter}
            onChange={(event) => setVariantFilter(event.target.value as VariantFilter)}
            className="h-11 rounded-lg border border-border-subtle bg-surface px-3 text-sm text-text-secondary outline-none ring-primary/10 focus:ring-4"
          >
            <option value="all">All layout notes</option>
            <option value="needs-work">Needs polish</option>
            <option value="review">Worth checking</option>
            <option value="shared-preview">Shared previews</option>
            <option value="missing-preview">Missing previews</option>
            <option value="mobile-risk">Mobile check</option>
            <option value="missing-guidance">Needs guidance</option>
          </select>
        </div>

        <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          <QaMetric label="Strong" value={qualityCounts.strong} tone="strong" />
          <QaMetric label="Worth checking" value={qualityCounts.review} tone="review" />
          <QaMetric label="Needs polish" value={qualityCounts['needs-work']} tone="needs-work" />
          <QaMetric label="Shared preview" value={qualityCounts.sharedPreview} tone="review" />
          <QaMetric label="Mobile check" value={qualityCounts.mobileRisk} tone="review" />
          <QaMetric label="Needs guidance" value={qualityCounts.missingGuidance} tone={qualityCounts.missingGuidance ? 'needs-work' : 'strong'} />
          <QaMetric label="Missing preview" value={missingPreviewCount} tone={missingPreviewCount ? 'needs-work' : 'strong'} />
        </div>

        <div className="space-y-8">
          {filteredManifests.map(({ manifest, variants }) => (
            <section key={manifest.type} className="rounded-[20px] border border-border-subtle bg-surface p-4 shadow-none">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{manifest.label}</h2>
                  <p className="text-sm text-text-secondary">
                    {variants.length} shown of {manifest.variantMeta.length} layout{manifest.variantMeta.length === 1 ? '' : 's'}.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-light px-3 py-1 text-xs font-medium text-primary">
                  <CheckCircle2 size={13} />
                  Available
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {variants.map(({ variant, quality, key }) => {
                  const captureUrl = `/variant-preview-capture?sectionType=${encodeURIComponent(manifest.type)}&variant=${encodeURIComponent(variant.id)}`;
                  const previewUrl = `/variant-previews/${manifest.type}__${quality.previewSource}.webp`;
                  const previewMissing = Boolean(missingPreviews[key]);
                  return (
                    <article key={variant.id} className="overflow-hidden rounded-[20px] border border-border-subtle bg-surface">
                      <div className="relative aspect-[16/10] bg-surface-subtle">
                        <img
                          src={previewUrl}
                          alt={`${manifest.label} ${variant.label} preview`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = '/template-previews/_fallback.svg';
                            setMissingPreviews((current) => ({ ...current, [key]: true }));
                          }}
                        />
                        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                          <QualityBadge status={quality.status} score={quality.score} />
                          {previewMissing ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-primary">
                              <ImageOff size={11} />
                              Missing preview
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="space-y-3 p-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{variant.label}</p>
                          <p className="mt-1 min-h-10 text-xs leading-relaxed text-text-secondary">{variant.description}</p>
                        </div>
                        <div className="rounded-xl bg-surface-subtle/50 px-2.5 py-2">
                          <p className="text-[10px] font-semibold text-text-tertiary">Best for</p>
                          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{variant.bestFor || 'A flexible choice for a polished wedding page.'}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {variant.effort ? <span className="rounded-full border border-border-subtle bg-surface px-2 py-0.5 text-[10px] font-medium text-text-secondary">{variant.effort} setup</span> : null}
                            {variant.recommended ? <span className="rounded-full border border-accent/30 bg-accent-light px-2 py-0.5 text-[10px] font-medium text-primary">Recommended</span> : null}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <code className="truncate rounded bg-surface-subtle px-2 py-1 text-[11px] text-text-tertiary">
                            {manifest.type}::{variant.id}
                          </code>
                          {internalToolingCaptureRoutesEnabled ? (
                            <Link
                              to={captureUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-xl border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-subtle"
                            >
                              Preview
                              <ExternalLink size={12} />
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-xl border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-tertiary">
                              Internal preview
                            </span>
                          )}
                        </div>
                        {quality.flags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {quality.flags.map((flag) => (
                              <FlagPill key={flag} flag={flag} />
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          {filteredManifests.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-subtle bg-white px-6 py-12 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-text-tertiary" />
              <p className="mt-3 text-sm font-semibold text-text-primary">No layouts match those filters</p>
              <p className="mt-1 text-sm text-text-secondary">Clear search or switch back to all layout notes.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

const QaMetric: React.FC<{ label: string; value: number; tone: 'strong' | 'review' | 'needs-work' }> = ({ label, value, tone }) => {
  const toneClass = tone === 'strong'
    ? 'border-accent/30 bg-accent-light text-primary'
    : tone === 'review'
      ? 'border-border-subtle bg-surface-subtle text-text-primary'
      : 'border-accent/30 bg-white text-primary';
  return (
    <div className={`rounded-xl border px-3 py-2 text-left ${toneClass}`}>
      <p className="text-[10px] font-semibold opacity-75">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
};

const QualityBadge: React.FC<{ status: 'strong' | 'review' | 'needs-work'; score: number }> = ({ status, score }) => {
  const toneClass = status === 'strong'
    ? 'border-accent/30 bg-accent-light text-primary'
    : status === 'review'
      ? 'border-border-subtle bg-surface-subtle text-text-primary'
      : 'border-accent/30 bg-white text-primary';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClass}`}>
      {status === 'strong' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
      {score}
    </span>
  );
};

const FlagPill: React.FC<{ flag: VariantQualityFlag }> = ({ flag }) => (
  <span className="rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-text-secondary">
    {getVariantQualityLabel(flag)}
  </span>
);
