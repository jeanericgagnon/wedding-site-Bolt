import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { templateCatalog, templateColorwayFacets, templateSeasonFacets, templateStyleFacets } from '../builder/constants/templateCatalog';

type Facet = 'all' | string;

export const Templates: React.FC = () => {
  const navigate = useNavigate();

  const [style, setStyle] = useState<Facet>('all');
  const [season, setSeason] = useState<Facet>('all');
  const [colorway, setColorway] = useState<Facet>('all');

  const filtered = useMemo(() => {
    return templateCatalog.filter((t) => {
      const styleOk = style === 'all' || t.styleTags.includes(style);
      const seasonOk = season === 'all' || t.seasonTags.includes(season);
      const colorOk = colorway === 'all' || t.colorwayId === colorway;
      return styleOk && seasonOk && colorOk;
    });
  }, [style, season, colorway]);

  const useTemplate = (templateId: string) => {
    localStorage.setItem('dayof.builderV2.selectedTemplate', templateId);
    navigate('/setup/names');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-neutral-900">Choose a template</h1>
        <p className="mt-2 text-sm text-neutral-600">Filter by style, season, and colorway to find your starting point.</p>

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
            <div key={tpl.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
              <img src={tpl.previewImage} alt={tpl.name} className="h-40 w-full object-cover" />
              <div className="p-4">
                <h2 className="text-lg font-semibold text-neutral-900">{tpl.name}</h2>
                <p className="mt-1 text-sm text-neutral-600">{tpl.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tpl.styleTags.map((tag) => <span key={tag} className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{tag}</span>)}
                </div>
                <button
                  type="button"
                  onClick={() => useTemplate(tpl.id)}
                  className="mt-4 w-full rounded bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                  Use this template
                </button>
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
