import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TEMPLATE_READINESS_LABELS, templateCatalog, templateCatalogSummary, templateColorwayFacets, templateSeasonFacets, templateStyleFacets, templateUseCaseFacets } from '../builder/constants/templateCatalog';
import { getTemplateSupportManifest } from '../builder/constants/templateSupportManifest';
import { TEMPLATE_USE_CASE_PACKS } from '../builder/constants/templateUseCasePacks';
import { useInternalToolingRouteAccess } from '../lib/internalToolingRoutes';
import { readSetupDraft, selectSetupDraftTemplate } from '../lib/setupDraft';
import { getRecommendedTemplateMatches } from '../lib/setupDraftRecommendations';
import { useAuth } from '../hooks/useAuth';

type Facet = 'all' | string;

export const Templates: React.FC = () => {
  const navigate = useNavigate();
  const { internalToolingCaptureRoutesEnabled } = useInternalToolingRouteAccess();
  const { user } = useAuth();
  const setupDraftStorageScope = user?.id ?? null;

  const [style, setStyle] = useState<Facet>('all');
  const [season, setSeason] = useState<Facet>('all');
  const [colorway, setColorway] = useState<Facet>('all');
  const [useCase, setUseCase] = useState<Facet>('all');
  const [readiness, setReadiness] = useState<Facet>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'name' | 'style' | 'readiness'>('recommended');
  const [groupByStyle, setGroupByStyle] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const selectedTemplateId = readSetupDraft(setupDraftStorageScope).selectedTemplateId;

  const recommendedTemplateMatches = useMemo(() => {
    const draft = readSetupDraft(setupDraftStorageScope);
    return getRecommendedTemplateMatches(draft, templateCatalog);
  }, [setupDraftStorageScope]);
  const recommendedTemplateIds = useMemo(() => recommendedTemplateMatches.map((entry) => entry.template.id), [recommendedTemplateMatches]);
  const recommendedTemplateReasonById = useMemo(() => new Map(
    recommendedTemplateMatches.map((entry) => [entry.template.id, entry.reasons.slice(0, 2)])
  ), [recommendedTemplateMatches]);

  const filtered = useMemo(() => {
    const rows = templateCatalog.filter((t) => {
      const styleOk = style === 'all' || t.styleTags.includes(style);
      const seasonOk = season === 'all' || t.seasonTags.includes(season);
      const colorOk = colorway === 'all' || t.colorwayId === colorway;
      const useCaseOk = useCase === 'all' || t.useCaseIds.includes(useCase as typeof t.useCaseIds[number]);
      const readinessOk = readiness === 'all' || t.readinessLabel === readiness;
      return styleOk && seasonOk && colorOk && useCaseOk && readinessOk;
    });

    const sorted = [...rows];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'style') {
      sorted.sort((a, b) => (a.styleTags[0] ?? '').localeCompare(b.styleTags[0] ?? ''));
    } else if (sortBy === 'readiness') {
      sorted.sort((a, b) => b.readinessScore - a.readinessScore || a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => {
        const aRec = recommendedTemplateIds.includes(a.id) ? 1 : 0;
        const bRec = recommendedTemplateIds.includes(b.id) ? 1 : 0;
        if (aRec !== bRec) return bRec - aRec;
        return a.name.localeCompare(b.name);
      });
    }

    return sorted;
  }, [style, season, colorway, useCase, readiness, sortBy, recommendedTemplateIds]);

  const comparedTemplates = useMemo(() => templateCatalog.filter((t) => compareIds.includes(t.id)).slice(0, 2), [compareIds]);
  const sectionDiff = useMemo(() => {
    if (comparedTemplates.length !== 2) return null;
    const [a, b] = comparedTemplates;
    const aSet = new Set(a.defaultSectionOrder);
    const bSet = new Set(b.defaultSectionOrder);
    const aRouteSet = new Set(a.guestRoutes);
    const bRouteSet = new Set(b.guestRoutes);
    const shared = a.defaultSectionOrder.filter((s) => bSet.has(s));
    const onlyA = a.defaultSectionOrder.filter((s) => !bSet.has(s));
    const onlyB = b.defaultSectionOrder.filter((s) => !aSet.has(s));
    const sharedRoutes = a.guestRoutes.filter((route) => bRouteSet.has(route));
    const onlyARoutes = a.guestRoutes.filter((route) => !bRouteSet.has(route));
    const onlyBRoutes = b.guestRoutes.filter((route) => !aRouteSet.has(route));
    return { a, b, shared, onlyA, onlyB, sharedRoutes, onlyARoutes, onlyBRoutes };
  }, [comparedTemplates]);

  const groupedTemplates = useMemo(() => {
    if (!groupByStyle) return null;
    const map = new Map<string, typeof filtered>();
    filtered.forEach((tpl) => {
      const key = tpl.styleTags[0] ?? 'Other';
      const arr = map.get(key) ?? [];
      arr.push(tpl);
      map.set(key, arr);
    });
    const facetOrder = new Map<string, number>((templateStyleFacets as readonly string[]).map((facet, idx) => [facet, idx]));
    return Array.from(map.entries()).sort((a, b) => {
      const ai = facetOrder.get(a[0]) ?? 999;
      const bi = facetOrder.get(b[0]) ?? 999;
      if (ai !== bi) return ai - bi;
      return a[0].localeCompare(b[0]);
    });
  }, [groupByStyle, filtered]);

  const handleUseTemplate = (templateId: string) => {
    selectSetupDraftTemplate(templateId, setupDraftStorageScope);
    navigate('/setup/names');
  };

  const renderTemplateCard = (tpl: typeof templateCatalog[number]) => {
    const manifest = getTemplateSupportManifest(tpl.id);
    return (
    <div key={tpl.id} className={`rounded-xl border bg-white overflow-hidden shadow-sm ${recommendedTemplateIds.includes(tpl.id) ? 'border-primary/35 ring-1 ring-primary/10' : 'border-neutral-200'}`}>
      <img
        src={tpl.previewImage}
        alt={tpl.name}
        className="h-40 w-full object-cover"
        onError={(event) => {
          const img = event.currentTarget;
          if (img.dataset.previewFallbackApplied === '1') return;
          img.dataset.previewFallbackApplied = '1';
          img.src = tpl.previewFallbackImage;
        }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">{tpl.name}</h2>
          <div className="flex flex-col items-end gap-1">
            {recommendedTemplateIds.includes(tpl.id) && (
              <span className="rounded border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-semibold text-primary">Recommended</span>
            )}
            {selectedTemplateId === tpl.id && (
              <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">Selected</span>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-600">{tpl.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {tpl.styleTags.map((tag) => <span key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{tag}</span>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {tpl.seasonTags.map((tag) => <span key={tag} className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-700">{tag}</span>)}
          <span className="rounded bg-brand/5 border border-brand/20 px-2 py-0.5 text-xs text-brand">Best for {tpl.bestFor[0] ?? (tpl.styleTags[0] ?? 'all styles')}</span>
        </div>
        {tpl.useCaseIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tpl.useCaseIds.slice(0, 3).map((id) => {
              const pack = TEMPLATE_USE_CASE_PACKS.find((candidate) => candidate.id === id);
              return (
                <span key={id} className="rounded border border-primary/15 bg-primary/5 px-2 py-0.5 text-xs text-primary">
                  {pack?.label ?? id}
                </span>
              );
            })}
          </div>
        )}
        {recommendedTemplateIds.includes(tpl.id) && (
          <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
            <p className="text-[11px] font-semibold text-primary">Why this fits</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(recommendedTemplateReasonById.get(tpl.id) ?? ['Good all-purpose starting point']).map((reason) => (
                <span key={reason} className="rounded border border-primary/15 bg-white px-1.5 py-0.5 text-[11px] text-primary">
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 rounded-xl border border-neutral-200 bg-white px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-600">
            <span className="font-semibold text-neutral-800">{tpl.pageCount} page{tpl.pageCount === 1 ? '' : 's'}</span>
            <span>{tpl.includedModules.length} modules</span>
            <span>{tpl.defaultSectionOrder.length} starter sections</span>
            <span className="rounded border border-primary/15 bg-primary/5 px-1.5 py-0.5 font-medium text-primary">{tpl.readinessLabel} · {tpl.readinessScore}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {tpl.guestRoutes.slice(0, 6).map((route) => (
              <span key={route} className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600">
                {route}
              </span>
            ))}
          </div>
          <div className="mt-2 space-y-1">
            {tpl.pageBlueprints.slice(0, 3).map((page) => (
              <p key={page.route} className="truncate text-[11px] text-neutral-600">
                <span className="font-medium text-neutral-800">{page.title}</span>: {page.sections.slice(0, 3).join(', ')}
              </p>
            ))}
          </div>
        </div>
        {manifest && (
          <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`rounded-xl border px-2 py-0.5 font-medium ${manifest.previewStatus === 'verified' ? 'border-primary/20 bg-primary/5 text-primary' : 'border-neutral-200 bg-white text-neutral-700'}`}>{manifest.previewLabel}</span>
              <span className="rounded-xl border border-neutral-200 bg-white px-2 py-0.5 font-medium text-neutral-700">{manifest.pageFlowLabel}</span>
              <span className="text-neutral-600">{manifest.sectionsIncluded} starter sections</span>
              <span className="text-neutral-600">{manifest.modulesIncluded} features</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-600">{manifest.previewDetail}</p>
            {!manifest.templateExistsInBuilder && (
              <p className="mt-1 text-[11px] text-neutral-600">This design uses a lighter preview for now.</p>
            )}
            {manifest.highlightedSections.length > 0 && (
              <p className="mt-1 text-[11px] text-neutral-600">Starts with {manifest.highlightedSections.join(', ')}</p>
            )}
            {manifest.readinessGaps.length > 0 && (
              <p className="mt-1 text-[11px] text-neutral-600">Review next: {manifest.readinessGaps.join(', ')}</p>
            )}
            {tpl.styleTags.some((tag) => ['Destination'].includes(tag)) && (
              <p className="mt-2 text-[11px] text-brand">Pairs well with: {TEMPLATE_USE_CASE_PACKS.find((pack) => pack.id === 'destination')?.label}</p>
            )}
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link to={`/templates/${tpl.id}`} className="rounded border border-neutral-300 px-3 py-2 text-center text-sm text-neutral-700 hover:bg-neutral-100">
See details
          </Link>
          <button
            type="button"
            onClick={() => {
              setCompareIds((prev) => {
                if (prev.includes(tpl.id)) return prev.filter((id) => id !== tpl.id);
                return [...prev, tpl.id].slice(-2);
              });
            }}
            className={`rounded border px-3 py-2 text-sm font-medium transition-colors ${compareIds.includes(tpl.id) ? 'border-brand/40 bg-brand/5 text-brand hover:bg-brand/10' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}
          >
            {compareIds.includes(tpl.id) ? 'Comparing' : 'Compare'}
          </button>
          <button
            type="button"
            onClick={() => handleUseTemplate(tpl.id)}
            className="rounded bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
Start with this
          </button>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Choose your starting design</h1>
            <p className="mt-2 text-sm text-neutral-600">Pick a strong starting point for your wedding website, then personalize it inside the editor.</p>
            <p className="mt-1 text-xs text-neutral-500">Your choice carries into setup and your first site defaults.</p>
            <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-sm font-semibold text-neutral-600">Ways to shape the design</p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <p className="text-lg font-semibold text-neutral-900">{templateCatalogSummary.totalTemplates}</p>
                  <p className="text-[11px] text-neutral-600">Launch designs</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <p className="text-lg font-semibold text-neutral-900">{templateCatalogSummary.guestReadyTemplates}</p>
                  <p className="text-[11px] text-neutral-600">Guest-ready</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <p className="text-lg font-semibold text-neutral-900">{templateCatalogSummary.multiPageTemplates}</p>
                  <p className="text-[11px] text-neutral-600">Multi-page</p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <p className="text-lg font-semibold text-neutral-900">{templateCatalogSummary.averageReadinessScore}</p>
                  <p className="text-[11px] text-neutral-600">Avg readiness</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {TEMPLATE_USE_CASE_PACKS.map((pack) => (
                  <div key={pack.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <p className="text-sm font-medium text-neutral-900">{pack.label}</p>
                    <p className="mt-1 text-xs text-neutral-600">{pack.description}</p>
                    <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                      {pack.defaultChanges.map((change) => <li key={change}>• {change}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => { setStyle('all'); setSeason('all'); setColorway('all'); setUseCase('all'); setReadiness('all'); }} className="rounded-xl border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">All templates</button>
              <button onClick={() => { setStyle('Modern'); setSeason('all'); }} className="rounded-xl border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Modern</button>
              <button onClick={() => { setStyle('Floral'); setSeason('Spring'); }} className="rounded-xl border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Spring Floral</button>
              <button onClick={() => { setStyle('Destination'); setSeason('Summer'); setUseCase('destination'); }} className="rounded-xl border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Destination</button>
              <button onClick={() => { setStyle('Classic'); setSeason('all'); setUseCase('black-tie'); }} className="rounded-xl border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Classic Formal</button>
              <button onClick={() => { setStyle('all'); setSeason('all'); setUseCase('weekend'); }} className="rounded-xl border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Full Weekend</button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">Destination, bilingual, and interfaith are the first three focused packs we are deepening here. Destination is currently the most behaviorally mature of the three.</p>
          </div>
          {selectedTemplateId && (
            <button
              onClick={() => navigate('/setup/names')}
              className="rounded bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-hover"
            >
              Continue setup
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="rounded border border-neutral-300 px-3 py-2 text-sm">
            <option value="all">All styles</option>
            {templateStyleFacets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={season} onChange={(e) => setSeason(e.target.value)} className="rounded border border-neutral-300 px-3 py-2 text-sm">
            <option value="all">All seasons</option>
            {templateSeasonFacets.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={colorway} onChange={(e) => setColorway(e.target.value)} className="rounded border border-neutral-300 px-3 py-2 text-sm">
            <option value="all">All colorways</option>
            {templateColorwayFacets.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={useCase} onChange={(e) => setUseCase(e.target.value)} className="rounded border border-neutral-300 px-3 py-2 text-sm">
            <option value="all">All use cases</option>
            {templateUseCaseFacets.map((id) => {
              const pack = TEMPLATE_USE_CASE_PACKS.find((candidate) => candidate.id === id);
              return <option key={id} value={id}>{pack?.label ?? id}</option>;
            })}
          </select>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <select value={readiness} onChange={(e) => setReadiness(e.target.value)} className="rounded border border-neutral-300 px-3 py-2 text-sm">
            <option value="all">All readiness</option>
            {TEMPLATE_READINESS_LABELS.map((label) => <option key={label} value={label}>{label}</option>)}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'recommended' | 'name' | 'style' | 'readiness')} className="rounded border border-neutral-300 px-3 py-2 text-sm">
            <option value="recommended">Sort: Best match</option>
            <option value="readiness">Sort: Readiness</option>
            <option value="name">Sort: Name</option>
            <option value="style">Sort: Style</option>
          </select>
        </div>

        <div className="mt-2 flex justify-start sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setStyle('all');
              setSeason('all');
              setColorway('all');
              setUseCase('all');
              setReadiness('all');
              setSortBy('recommended');
              setGroupByStyle(false);
              setCompareIds([]);
            }}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
          >
            Reset filters
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <span>{filtered.length} starting design{filtered.length === 1 ? '' : 's'} shown</span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline font-medium">Tip: open a design before choosing if you want a closer look.</span>
            <button
              type="button"
              onClick={() => setGroupByStyle((v) => !v)}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              {groupByStyle ? 'Show all together' : 'Group by style'}
            </button>
          </div>
        </div>

        {comparedTemplates.length > 0 && (
          <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-primary">Quick compare</p>
              <button onClick={() => setCompareIds([])} className="text-[11px] font-medium text-primary hover:underline">Clear</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {comparedTemplates.map((tpl) => (
                <div key={`cmp-${tpl.id}`} className="rounded-xl border border-primary/15 bg-white p-2">
                  <p className="text-sm font-semibold text-neutral-900">{tpl.name}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{tpl.designFamily}</p>
                  <p className="text-[11px] text-neutral-700 mt-1">Features: {tpl.includedModules.length} • Sections: {tpl.defaultSectionOrder.length}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tpl.styleTags.slice(0, 3).map((tag) => <span key={`${tpl.id}-${tag}`} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">{tag}</span>)}
                  </div>
                  <div className={`mt-2 grid gap-1.5 ${internalToolingCaptureRoutesEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {internalToolingCaptureRoutesEnabled && (
                      <Link to={`/template-scroll-capture?templateId=${tpl.id}`} className="rounded border border-neutral-300 px-2 py-1 text-center text-[11px] font-medium text-neutral-700 hover:bg-neutral-100">Open preview</Link>
                    )}
                    <button type="button" onClick={() => handleUseTemplate(tpl.id)} className="rounded bg-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary-hover">Start here</button>
                  </div>
                </div>
              ))}
            </div>
            {!sectionDiff && comparedTemplates.length === 1 && (
              <div className="mt-2 rounded-xl border border-primary/15 bg-white px-2.5 py-2 text-[11px] text-primary">
                Select one more design to compare the section flow side by side.
              </div>
            )}

            {sectionDiff && (
              <div className="mt-3 rounded-xl border border-primary/15 bg-white p-2.5">
                <p className="text-[11px] font-semibold text-primary mb-1">Section flow comparison</p>
                <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded border border-primary/15 bg-primary/5 px-1.5 py-0.5 text-primary">Shared</span>
                  <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-neutral-700">Only in A</span>
                  <span className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-neutral-700">Only in B</span>
                  <span className="rounded bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 text-neutral-600">Number = section order</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Shared</p>
                    <div className="flex flex-wrap gap-1">
                      {(sectionDiff.shared.length ? sectionDiff.shared : ['None']).map((s) => (
                        <span key={`shared-${s}`} className="rounded border border-primary/15 bg-primary/5 px-1.5 py-0.5 text-[10px] text-primary">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Only in A</p>
                    <div className="flex flex-wrap gap-1">
                      {(sectionDiff.onlyA.length ? sectionDiff.onlyA : ['None']).map((s) => (
                        <span key={`a-${s}`} className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] text-neutral-700">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500 mb-1">Only in B</p>
                    <div className="flex flex-wrap gap-1">
                      {(sectionDiff.onlyB.length ? sectionDiff.onlyB : ['None']).map((s) => (
                        <span key={`b-${s}`} className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] text-neutral-700">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="rounded border border-neutral-200 p-2">
                    <p className="text-[10px] font-semibold text-neutral-600 mb-1 truncate">A order: {sectionDiff.a.name}</p>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {sectionDiff.a.guestRoutes.map((route) => (
                        <span key={`ar-${route}`} className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-neutral-600">{route}</span>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {sectionDiff.a.defaultSectionOrder.map((s, idx) => (
                        <div key={`ao-${s}`} className="text-[10px] text-neutral-700 rounded bg-neutral-50 px-1.5 py-0.5">
                          {idx + 1}. {s}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded border border-neutral-200 p-2">
                    <p className="text-[10px] font-semibold text-neutral-600 mb-1 truncate">B order: {sectionDiff.b.name}</p>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {sectionDiff.b.guestRoutes.map((route) => (
                        <span key={`br-${route}`} className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-neutral-600">{route}</span>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {sectionDiff.b.defaultSectionOrder.map((s, idx) => (
                        <div key={`bo-${s}`} className="text-[10px] text-neutral-700 rounded bg-neutral-50 px-1.5 py-0.5">
                          {idx + 1}. {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2 rounded border border-neutral-200 p-2">
                  <p className="text-[10px] font-semibold text-neutral-600 mb-1">Guest route comparison</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <p className="mb-1 text-[10px] text-neutral-500">Shared routes</p>
                      <div className="flex flex-wrap gap-1">
                        {(sectionDiff.sharedRoutes.length ? sectionDiff.sharedRoutes : ['None']).map((route) => (
                          <span key={`sr-${route}`} className="rounded border border-primary/15 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] text-primary">{route}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-neutral-500">Only A</p>
                      <div className="flex flex-wrap gap-1">
                        {(sectionDiff.onlyARoutes.length ? sectionDiff.onlyARoutes : ['None']).map((route) => (
                          <span key={`ora-${route}`} className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-700">{route}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-neutral-500">Only B</p>
                      <div className="flex flex-wrap gap-1">
                        {(sectionDiff.onlyBRoutes.length ? sectionDiff.onlyBRoutes : ['None']).map((route) => (
                          <span key={`orb-${route}`} className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-neutral-700">{route}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {recommendedTemplateIds.length > 0 && (
          <div className="mt-4 rounded-xl border border-primary/15 bg-white p-3">
            <p className="text-sm font-semibold text-primary mb-2">Recommended for you</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recommendedTemplateMatches
                .slice(0, 3)
                .map(({ template: tpl, reasons }) => (
                  <button
                    key={`rec-${tpl.id}`}
                    type="button"
                    onClick={() => handleUseTemplate(tpl.id)}
                    className="text-left rounded-xl border border-neutral-200 bg-white p-2 hover:border-primary/35"
                  >
                    <img src={tpl.previewImage} alt={tpl.name} className="h-20 w-full object-cover rounded" />
                    <p className="mt-1 text-xs font-medium text-neutral-900">{tpl.name}</p>
                    <p className="text-[11px] text-neutral-500">{reasons[0] ?? 'Use design'}</p>
                  </button>
                ))}
            </div>
          </div>
        )}

        {groupByStyle && groupedTemplates ? (
          <div className="mt-3 space-y-5">
            {groupedTemplates.map(([styleGroup, templates]) => (
              <div key={styleGroup}>
                <h3 className="text-sm font-semibold text-neutral-800 mb-2">{styleGroup}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((tpl) => renderTemplateCard(tpl))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tpl) => renderTemplateCard(tpl))}
          </div>
        )}

        {filtered.length === 0 && (
          <p className="mt-6 text-sm text-neutral-600">No designs match those filters right now.</p>
        )}
      </div>
    </div>
  );
};

export default Templates;
