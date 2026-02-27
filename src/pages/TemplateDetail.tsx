import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { templateCatalog } from '../builder/constants/templateCatalog';

export const TemplateDetail: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();

  const tpl = templateCatalog.find((t) => t.id === templateId);

  if (!tpl) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-lg border border-neutral-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-neutral-900">Template not found</h1>
          <p className="mt-2 text-sm text-neutral-600">This template does not exist or was removed.</p>
          <Link to="/templates" className="mt-4 inline-block rounded bg-rose-600 px-4 py-2 text-sm text-white">Back to templates</Link>
        </div>
      </div>
    );
  }

  const useTemplate = () => {
    localStorage.setItem('dayof.builderV2.selectedTemplate', tpl.id);
    navigate('/setup/names');
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <img src={tpl.previewImage} alt={tpl.name} className="h-72 w-full object-cover" />
        <div className="p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Design family: {tpl.designFamily}</p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-900">{tpl.name}</h1>
          <p className="mt-3 text-sm text-neutral-600 max-w-3xl">{tpl.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tpl.styleTags.map((tag) => (
              <span key={tag} className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700">{tag}</span>
            ))}
            {tpl.seasonTags.map((tag) => (
              <span key={tag} className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{tag}</span>
            ))}
            <span className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{tpl.colorwayId}</span>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button onClick={useTemplate} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Use this template</button>
            <Link to="/templates" className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back to gallery</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetail;
