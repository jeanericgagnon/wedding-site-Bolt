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
    return templateCatalog.filter((t) => {
      const styleOk = style === 'all' || t.styleTags.includes(style);
      const seasonOk = season === 'all' || t.seasonTags.includes(season);
      const colorOk = colorway === 'all' || t.colorwayId === colorway;
      return styleOk && seasonOk && colorOk;
    });
  }, [style, season, colorway]);

  const useTemplate = (templateId: string) => {
    localStorage.setItem(SELECTED_TEMPLATE_KEY, templateId);
    navigate('/setup/names');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Choose a template</h1>
            <p className="mt-2 text-sm text-neutral-600">Filter by style, season, and colorway to find your starting point.</p>
            <p className="mt-1 text-xs text-neutral-500">Template selection is carried into setup and builder defaults.</p>
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

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
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
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl) => (
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
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link to={`/templates/${tpl.id}`} className="rounded border border-neutral-300 px-3 py-2 text-center text-sm text-neutral-700 hover:bg-neutral-100">
                    Preview
                  </Link>
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
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-6 text-sm text-neutral-600">No templates match your current filters.</p>
        )}
      </div>
    </div>
  );
};

export default Templates;
