import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { templateCatalog, templateColorwayFacets, templateSeasonFacets, templateStyleFacets } from '../builder/constants/templateCatalog';
import { getTemplateSupportManifest } from '../builder/constants/templateSupportManifest';
import { TEMPLATE_USE_CASE_PACKS } from '../builder/constants/templateUseCasePacks';
import { readSetupDraft, selectSetupDraftTemplate } from '../lib/setupDraft';
import { getRecommendedTemplates } from '../lib/setupDraftRecommendations';
import { buildTemplateExperienceBrief } from '../pages/templateExperience';
import { getFlowStatusLabel } from '../lib/flowLabels';
import {
  buildTemplateCompareBrief,
  buildTemplateFilterSummary,
  filterAndSortTemplates,
} from './templateDecisionModel';

type Facet = 'all' | string;

export const Templates: React.FC = () => {
  const navigate = useNavigate();

  const [style, setStyle] = useState<Facet>('all');
  const [season, setSeason] = useState<Facet>('all');
  const [colorway, setColorway] = useState<Facet>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recommended' | 'name' | 'style'>('recommended');
  const [groupByStyle, setGroupByStyle] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const selectedTemplateId = readSetupDraft().selectedTemplateId;

  const recommendedTemplateIds = useMemo(() => {
    const draft = readSetupDraft();
    return getRecommendedTemplates(draft, templateCatalog).map((template) => template.id);
  }, []);

  const filtered = useMemo(() => filterAndSortTemplates({
    templates: templateCatalog,
    style,
    season,
    colorway,
    searchQuery,
    sortBy,
    recommendedTemplateIds,
  }), [style, season, colorway, searchQuery, sortBy, recommendedTemplateIds]);

  const comparedTemplates = useMemo(() => templateCatalog.filter((t) => compareIds.includes(t.id)).slice(0, 2), [compareIds]);
  const selectedTemplate = useMemo(
    () => templateCatalog.find((template) => template.id === selectedTemplateId) ?? filtered[0] ?? null,
    [filtered, selectedTemplateId],
  );
  const selectedTemplateManifest = selectedTemplate ? getTemplateSupportManifest(selectedTemplate.id) : null;
  const templateExperienceBrief = selectedTemplate
    ? buildTemplateExperienceBrief({
        name: selectedTemplate.name,
        recommended: recommendedTemplateIds.includes(selectedTemplate.id),
        selected: selectedTemplateId === selectedTemplate.id,
        supportManifest: selectedTemplateManifest,
        compareCount: compareIds.length,
      })
    : null;
  const manifestsByTemplateId = useMemo(
    () => Object.fromEntries(templateCatalog.map((template) => [template.id, getTemplateSupportManifest(template.id)])),
    [],
  );
  const filterSummary = useMemo(() => buildTemplateFilterSummary({
    filtered,
    style,
    season,
    colorway,
    searchQuery,
    selectedTemplateId: selectedTemplateId ?? null,
    recommendedTemplateIds,
  }), [filtered, style, season, colorway, searchQuery, selectedTemplateId, recommendedTemplateIds]);
  const compareBrief = useMemo(() => buildTemplateCompareBrief({
    comparedTemplates,
    manifestsByTemplateId,
    recommendedTemplateIds,
    selectedTemplateId: selectedTemplateId ?? null,
  }), [comparedTemplates, manifestsByTemplateId, recommendedTemplateIds, selectedTemplateId]);
  const sectionDiff = useMemo(() => {
    if (comparedTemplates.length !== 2) return null;
    const [a, b] = comparedTemplates;
    const aSet = new Set(a.defaultSectionOrder);
    const bSet = new Set(b.defaultSectionOrder);
    const shared = a.defaultSectionOrder.filter((s) => bSet.has(s));
    const onlyA = a.defaultSectionOrder.filter((s) => !bSet.has(s));
    const onlyB = b.defaultSectionOrder.filter((s) => !aSet.has(s));
    return { a, b, shared, onlyA, onlyB };
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

  const startWithTemplate = (templateId: string) => {
    selectSetupDraftTemplate(templateId);
    navigate('/setup/names');
  };

  const renderTemplateCard = (tpl: typeof templateCatalog[number]) => {
    const manifest = getTemplateSupportManifest(tpl.id);
    return (
    <div key={tpl.id} className={`rounded-xl border bg-white overflow-hidden shadow-sm ${recommendedTemplateIds.includes(tpl.id) ? 'border-rose-300 ring-1 ring-rose-100' : 'border-neutral-200'}`}>
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
              <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase updates-wide text-rose-700">Recommended</span>
            )}
            {selectedTemplateId === tpl.id && (
              <span className="rounded bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase updates-wide text-brand">Selected</span>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-600">{tpl.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {tpl.styleTags.map((tag) => <span key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{tag}</span>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {tpl.seasonTags.map((tag) => <span key={tag} className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">{tag}</span>)}
          <span className="rounded bg-brand/5 border border-brand/20 px-2 py-0.5 text-xs text-brand">Best for {tpl.bestFor[0] ?? (tpl.styleTags[0] ?? 'all styles')}</span>
        </div>
        {manifest && (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`rounded-full px-2 py-0.5 font-medium ${manifest.previewStatus === 'verified' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>{manifest.previewLabel}</span>
              <span className="text-neutral-600">{manifest.sectionsIncluded} starter sections</span>
              <span className="text-neutral-600">{manifest.modulesIncluded} modules</span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-600">{manifest.previewDetail}</p>
            {!manifest.templateExistsInBuilder && (
              <p className="mt-1 text-[11px] text-amber-700">Builder pack mapping still needs stronger support coverage.</p>
            )}
            {manifest.highlightedSections.length > 0 && (
              <p className="mt-1 text-[11px] text-neutral-600">Starts with {manifest.highlightedSections.join(' · ')}</p>
            )}
            {tpl.styleTags.some((tag) => ['Destination'].includes(tag)) && (
              <p className="mt-2 text-[11px] text-brand">First use-case pack: {TEMPLATE_USE_CASE_PACKS.find((pack) => pack.id === 'destination')?.label}</p>
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
            onClick={() => startWithTemplate(tpl.id)}
            className="rounded bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
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
              <p className="text-xs font-semibold uppercase updates-wide text-neutral-500">First use-case packs in depth</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {TEMPLATE_USE_CASE_PACKS.map((pack) => (
                  <div key={pack.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
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
              <button onClick={() => { setStyle('all'); setSeason('all'); setColorway('all'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">All templates</button>
              <button onClick={() => { setStyle('Modern'); setSeason('all'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Modern</button>
              <button onClick={() => { setStyle('Floral'); setSeason('Spring'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Spring Floral</button>
              <button onClick={() => { setStyle('Destination'); setSeason('Summer'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Destination</button>
              <button onClick={() => { setStyle('Classic'); setSeason('all'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Classic Formal</button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">Destination, bilingual, and interfaith are the first three focused packs we are deepening here. Destination is currently the most behaviorally mature of the three.</p>
            {templateExperienceBrief && (
              <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Template confidence</p>
                    <h2 className="mt-1 text-lg font-semibold text-neutral-900">{templateExperienceBrief.title}</h2>
                    <p className="mt-1.5 max-w-3xl text-sm leading-6 text-neutral-600">{templateExperienceBrief.detail}</p>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">{templateExperienceBrief.confidenceDetail}</p>
                  </div>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                    {templateExperienceBrief.confidenceLabel}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {templateExperienceBrief.launchSequence.map((step) => (
                    <div key={step.id} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-neutral-900">{step.title}</p>
                        <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                          {getFlowStatusLabel(step.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-neutral-600">{step.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Main focus</p>
                    <p className="mt-1.5 text-sm font-medium text-neutral-800">{templateExperienceBrief.focusTitle}</p>
                    <p className="mt-1.5 text-xs leading-5 text-neutral-600">{templateExperienceBrief.focusDetail}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Best next move</p>
                    <p className="mt-1.5 text-sm text-neutral-700">{templateExperienceBrief.bestNextStep}</p>
                    <div className="mt-3 border-t border-neutral-200 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Decision rule</p>
                      <p className="mt-1.5 text-sm text-neutral-700">{templateExperienceBrief.decisionRule}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Best launch use</p>
                    <p className="mt-1.5 text-sm text-neutral-700">{templateExperienceBrief.launchUse}</p>
                  </div>
                </div>
                <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Best for</p>
                  <p className="mt-1.5 text-sm text-neutral-700">{templateExperienceBrief.bestFor}</p>
                </div>
                {(templateExperienceBrief.callouts.length > 0 || templateExperienceBrief.watchouts.length > 0) && (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {templateExperienceBrief.callouts.length > 0 && (
                      <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Confidence signals</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {templateExperienceBrief.callouts.map((callout) => (
                            <span key={callout} className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] text-neutral-700">
                              {callout}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {templateExperienceBrief.watchouts.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Watchouts</p>
                        <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
                          {templateExperienceBrief.watchouts.map((watchout) => (
                            <li key={watchout}>{watchout}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedTemplateId && (
            <button
              onClick={() => navigate('/setup/names')}
              className="rounded bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700"
            >
              Continue setup
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by style, mood, module, or section"
            className="rounded border border-neutral-300 px-3 py-2 text-sm"
          />

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

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'recommended' | 'name' | 'style')} className="rounded border border-neutral-300 px-3 py-2 text-sm">
            <option value="recommended">Sort: Best match</option>
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
              setSearchQuery('');
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

        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Catalog read</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">{filterSummary.headline}</h2>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-neutral-600">{filterSummary.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700">
                {filterSummary.visibleCount} visible
              </span>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                {filterSummary.recommendedVisibleCount} recommended visible
              </span>
              {filterSummary.selectedVisible && (
                <span className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
                  Selected template still visible
                </span>
              )}
            </div>
          </div>
          {filterSummary.activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filterSummary.activeFilters.map((filter) => (
                <span key={filter} className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] text-neutral-700">
                  {filter}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Best next move</p>
              <p className="mt-1.5 text-sm text-neutral-700">{filterSummary.bestNextMove}</p>
              <div className="mt-3 border-t border-neutral-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Decision rule</p>
                <p className="mt-1.5 text-sm text-neutral-700">{filterSummary.decisionRule}</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Watchout</p>
              <p className="mt-1.5 text-sm text-amber-900">{filterSummary.watchout}</p>
            </div>
          </div>
        </div>

        {comparedTemplates.length > 0 && (
          <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Quick compare</p>
              <button onClick={() => setCompareIds([])} className="text-[11px] font-medium text-brand hover:underline">Clear</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {comparedTemplates.map((tpl) => (
                <div key={`cmp-${tpl.id}`} className="rounded-lg border border-brand/20 bg-white p-2">
                  <p className="text-sm font-semibold text-neutral-900">{tpl.name}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{tpl.designFamily}</p>
                  <p className="text-[11px] text-neutral-700 mt-1">Modules: {tpl.includedModules.length} • Sections: {tpl.defaultSectionOrder.length}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tpl.styleTags.slice(0, 3).map((tag) => <span key={`${tpl.id}-${tag}`} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">{tag}</span>)}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <Link to={`/template-scroll-capture?templateId=${tpl.id}`} className="rounded border border-neutral-300 px-2 py-1 text-center text-[11px] font-medium text-neutral-700 hover:bg-neutral-100">Open preview</Link>
                    <button type="button" onClick={() => startWithTemplate(tpl.id)} className="rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-700">Start here</button>
                  </div>
                </div>
              ))}
            </div>
            {!sectionDiff && comparedTemplates.length === 1 && (
              <div className="mt-2 rounded-lg border border-brand/20 bg-white px-2.5 py-2 text-[11px] text-brand">
                Select one more design to compare the section flow side by side.
              </div>
            )}
            {compareBrief && (
              <div className="mt-3 rounded-lg border border-brand/20 bg-white p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Compare read</p>
                    <h3 className="mt-1 text-sm font-semibold text-neutral-900">{compareBrief.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-neutral-600">{compareBrief.detail}</p>
                  </div>
                  {compareBrief.recommendedWinnerId && (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-700">
                      Steadier pick: {templateCatalog.find((template) => template.id === compareBrief.recommendedWinnerId)?.name}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Best next move</p>
                    <p className="mt-1.5 text-sm text-neutral-700">{compareBrief.bestNextMove}</p>
                    <div className="mt-3 border-t border-neutral-200 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Decision rule</p>
                      <p className="mt-1.5 text-sm text-neutral-700">{compareBrief.decisionRule}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Watchout</p>
                    <p className="mt-1.5 text-sm text-amber-900">{compareBrief.watchout}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Current</p>
                    <p className="mt-1.5 text-sm text-neutral-700">{compareBrief.current}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Next</p>
                    <p className="mt-1.5 text-sm text-neutral-700">{compareBrief.next}</p>
                  </div>
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Then</p>
                    <p className="mt-1.5 text-sm text-neutral-700">{compareBrief.then}</p>
                  </div>
                </div>
              </div>
            )}

            {sectionDiff && (
              <div className="mt-3 rounded-lg border border-brand/20 bg-white p-2.5">
                <p className="text-[11px] font-semibold text-brand mb-1">Section flow comparison</p>
                <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded bg-brand/5 border border-brand/20 px-1.5 py-0.5 text-brand">Shared</span>
                  <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-amber-700">Only in A</span>
                  <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-rose-700">Only in B</span>
                  <span className="rounded bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 text-neutral-600">Number = section order</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Shared</p>
                    <div className="flex flex-wrap gap-1">
                      {(sectionDiff.shared.length ? sectionDiff.shared : ['None']).map((s) => (
                        <span key={`shared-${s}`} className="rounded bg-brand/5 border border-brand/20 px-1.5 py-0.5 text-[10px] text-brand">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Only in A</p>
                    <div className="flex flex-wrap gap-1">
                      {(sectionDiff.onlyA.length ? sectionDiff.onlyA : ['None']).map((s) => (
                        <span key={`a-${s}`} className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] text-amber-700">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Only in B</p>
                    <div className="flex flex-wrap gap-1">
                      {(sectionDiff.onlyB.length ? sectionDiff.onlyB : ['None']).map((s) => (
                        <span key={`b-${s}`} className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] text-rose-700">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="rounded border border-neutral-200 p-2">
                    <p className="text-[10px] font-semibold text-neutral-600 mb-1 truncate">A order: {sectionDiff.a.name}</p>
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
                    <div className="space-y-1">
                      {sectionDiff.b.defaultSectionOrder.map((s, idx) => (
                        <div key={`bo-${s}`} className="text-[10px] text-neutral-700 rounded bg-neutral-50 px-1.5 py-0.5">
                          {idx + 1}. {s}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {recommendedTemplateIds.length > 0 && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
            <p className="text-xs font-semibold uppercase updates-wide text-rose-700 mb-2">Recommended for you</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {templateCatalog
                .filter((tpl) => recommendedTemplateIds.includes(tpl.id))
                .slice(0, 3)
                .map((tpl) => (
                  <button
                    key={`rec-${tpl.id}`}
                    type="button"
                    onClick={() => startWithTemplate(tpl.id)}
                    className="text-left rounded-lg border border-rose-200 bg-white p-2 hover:border-rose-300"
                  >
                    <img src={tpl.previewImage} alt={tpl.name} className="h-20 w-full object-cover rounded" />
                    <p className="mt-1 text-xs font-medium text-neutral-900">{tpl.name}</p>
                    <p className="text-[11px] text-neutral-500">Use template</p>
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
