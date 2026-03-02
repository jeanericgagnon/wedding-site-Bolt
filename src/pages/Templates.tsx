import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { templateCatalog, templateColorwayFacets, templateSeasonFacets, templateStyleFacets } from '../builder/constants/templateCatalog';
import { readSetupDraft, SELECTED_TEMPLATE_KEY } from '../lib/setupDraft';

type Facet = 'all' | string;

export const Templates: React.FC = () => {
  const navigate = useNavigate();

  const [style, setStyle] = useState<Facet>('all');
  const [season, setSeason] = useState<Facet>('all');
  const [colorway, setColorway] = useState<Facet>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'name' | 'style'>('recommended');
  const [groupByStyle, setGroupByStyle] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const selectedTemplateId = localStorage.getItem(SELECTED_TEMPLATE_KEY) || '';

  const recommendedTemplateIds = useMemo(() => {
    const d = readSetupDraft();
    const prefs = new Set((d.stylePreferences ?? []).filter(Boolean));
    if (prefs.size === 0) return [] as string[];
    return [...templateCatalog]
      .map((t) => ({ id: t.id, score: t.styleTags.filter((tag) => prefs.has(tag)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.id);
  }, []);

  const filtered = useMemo(() => {
    const rows = templateCatalog.filter((t) => {
      const styleOk = style === 'all' || t.styleTags.includes(style);
      const seasonOk = season === 'all' || t.seasonTags.includes(season);
      const colorOk = colorway === 'all' || t.colorwayId === colorway;
      return styleOk && seasonOk && colorOk;
    });

    const sorted = [...rows];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'style') {
      sorted.sort((a, b) => (a.styleTags[0] ?? '').localeCompare(b.styleTags[0] ?? ''));
    } else {
      sorted.sort((a, b) => {
        const aRec = recommendedTemplateIds.includes(a.id) ? 1 : 0;
        const bRec = recommendedTemplateIds.includes(b.id) ? 1 : 0;
        if (aRec !== bRec) return bRec - aRec;
        return a.name.localeCompare(b.name);
      });
    }

    return sorted;
  }, [style, season, colorway, sortBy, recommendedTemplateIds]);

  const comparedTemplates = useMemo(() => templateCatalog.filter((t) => compareIds.includes(t.id)).slice(0, 2), [compareIds]);
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

  const useTemplate = (templateId: string) => {
    localStorage.setItem(SELECTED_TEMPLATE_KEY, templateId);
    navigate('/setup/names');
  };

  const renderTemplateCard = (tpl: typeof templateCatalog[number]) => (
    <div key={tpl.id} className={`rounded-xl border bg-white overflow-hidden shadow-sm ${recommendedTemplateIds.includes(tpl.id) ? 'border-rose-300 ring-1 ring-rose-100' : 'border-neutral-200'}`}>
      <img src={tpl.previewImage} alt={tpl.name} className="h-40 w-full object-cover" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">{tpl.name}</h2>
          <div className="flex flex-col items-end gap-1">
            {recommendedTemplateIds.includes(tpl.id) && (
              <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase updates-wide text-rose-700">Recommended</span>
            )}
            {selectedTemplateId === tpl.id && (
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase updates-wide text-emerald-700">Selected</span>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-600">{tpl.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {tpl.styleTags.map((tag) => <span key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{tag}</span>)}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {tpl.seasonTags.map((tag) => <span key={tag} className="rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">{tag}</span>)}
          <span className="rounded bg-sky-50 border border-sky-200 px-2 py-0.5 text-xs text-sky-700">Best for {tpl.bestFor[0] ?? (tpl.styleTags[0] ?? 'all styles')}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link to={`/templates/${tpl.id}`} className="rounded border border-neutral-300 px-3 py-2 text-center text-sm text-neutral-700 hover:bg-neutral-100">
            Preview
          </Link>
          <button
            type="button"
            onClick={() => {
              setCompareIds((prev) => {
                if (prev.includes(tpl.id)) return prev.filter((id) => id !== tpl.id);
                return [...prev, tpl.id].slice(-2);
              });
            }}
            className={`rounded border px-3 py-2 text-sm ${compareIds.includes(tpl.id) ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}
          >
            {compareIds.includes(tpl.id) ? 'Comparing' : 'Compare'}
          </button>
          <button
            type="button"
            onClick={() => useTemplate(tpl.id)}
            className="rounded bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Use template
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Choose a template</h1>
            <p className="mt-2 text-sm text-neutral-600">Filter by style, season, and colorway to find your starting point.</p>
            <p className="mt-1 text-xs text-neutral-500">Template selection is carried into setup and builder defaults.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => { setStyle('all'); setSeason('all'); setColorway('all'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">All templates</button>
              <button onClick={() => { setStyle('Modern'); setSeason('all'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Modern</button>
              <button onClick={() => { setStyle('Floral'); setSeason('Spring'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Spring Floral</button>
              <button onClick={() => { setStyle('Destination'); setSeason('Summer'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Destination</button>
              <button onClick={() => { setStyle('Classic'); setSeason('all'); }} className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Classic Formal</button>
            </div>
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

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
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
            <option value="recommended">Sort: Recommended</option>
            <option value="name">Sort: Name</option>
            <option value="style">Sort: Style</option>
          </select>
        </div>

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setStyle('all');
              setSeason('all');
              setColorway('all');
              setSortBy('recommended');
              setGroupByStyle(false);
              setCompareIds([]);
            }}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100"
          >
            Reset filters
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500 gap-3">
          <span>{filtered.length} template{filtered.length === 1 ? '' : 's'} shown</span>
          <div className="flex items-center gap-2">
            <span>Tip: preview before selecting for better section fit.</span>
            <button
              type="button"
              onClick={() => setGroupByStyle((v) => !v)}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-100"
            >
              {groupByStyle ? 'Flat view' : 'Group by style'}
            </button>
          </div>
        </div>

        {comparedTemplates.length > 0 && (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase updates-wide text-sky-700">Quick compare</p>
              <button onClick={() => setCompareIds([])} className="text-[11px] text-sky-700 hover:underline">Clear</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {comparedTemplates.map((tpl) => (
                <div key={`cmp-${tpl.id}`} className="rounded-lg border border-sky-200 bg-white p-2">
                  <p className="text-sm font-semibold text-neutral-900">{tpl.name}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{tpl.designFamily}</p>
                  <p className="text-[11px] text-neutral-700 mt-1">Modules: {tpl.includedModules.length} • Sections: {tpl.defaultSectionOrder.length}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tpl.styleTags.slice(0, 3).map((tag) => <span key={`${tpl.id}-${tag}`} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">{tag}</span>)}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <Link to={`/templates/${tpl.id}`} className="rounded border border-neutral-300 px-2 py-1 text-center text-[11px] text-neutral-700 hover:bg-neutral-100">Preview</Link>
                    <button type="button" onClick={() => useTemplate(tpl.id)} className="rounded bg-rose-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-700">Use this</button>
                  </div>
                </div>
              ))}
            </div>
            {sectionDiff && (
              <div className="mt-3 rounded-lg border border-sky-200 bg-white p-2.5">
                <p className="text-[11px] font-semibold text-sky-800 mb-1">Section order diff</p>
                <p className="text-[11px] text-neutral-700">Shared: {sectionDiff.shared.join(', ') || 'None'}</p>
                <p className="text-[11px] text-neutral-700 mt-0.5">Only in {sectionDiff.a.name}: {sectionDiff.onlyA.join(', ') || 'None'}</p>
                <p className="text-[11px] text-neutral-700 mt-0.5">Only in {sectionDiff.b.name}: {sectionDiff.onlyB.join(', ') || 'None'}</p>
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
                    onClick={() => useTemplate(tpl.id)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((tpl) => renderTemplateCard(tpl))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((tpl) => renderTemplateCard(tpl))}
          </div>
        )}

        {filtered.length === 0 && (
          <p className="mt-6 text-sm text-neutral-600">No templates match your current filters.</p>
        )}
      </div>
    </div>
  );
};

export default Templates;
