import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { templateCatalog } from '../builder/constants/templateCatalog';
import { getTemplateSupportManifest } from '../builder/constants/templateSupportManifest';

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

  const supportManifest = tpl ? getTemplateSupportManifest(tpl.id) : null;

  const relatedTemplates = templateCatalog
    .filter((t) => t.id !== tpl.id)
    .filter((t) => t.styleTags.some((tag) => tpl.styleTags.includes(tag)))
    .slice(0, 3);

  const useTemplate = (id = tpl.id) => {
    localStorage.setItem('dayof.builderV2.selectedTemplate', id);
    navigate('/setup/names');
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <img src={tpl.previewImage} alt={tpl.name} className="h-56 md:h-72 w-full object-cover" />
        <div className="p-6">
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">Website + RSVP + Registry + Day-of ready</span>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700">No coding required</span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700">Publish when you’re ready</span>
          </div>
          <p className="text-xs uppercase updates-wide text-neutral-500">Design family: {tpl.designFamily}</p>
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

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase updates-wide text-neutral-500">Populated website preview</p>
                <Link
                  to={`/template-scroll-capture?templateId=${tpl.id}`}
                  className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-100"
                >
                  Open full website preview
                </Link>
              </div>
              <div className="rounded border border-neutral-200 bg-white overflow-hidden">
                <iframe
                  title={`${tpl.name} live preview`}
                  src={`/template-scroll-capture?templateId=${tpl.id}`}
                  className="h-[360px] w-full"
                />
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">Uses sample wedding details so you can see how the design feels with real content in place.</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:col-span-1">
              <p className="text-xs font-semibold uppercase updates-wide text-neutral-500 mb-2">Default section flow</p>
              <div className="flex flex-wrap gap-1.5">
                {tpl.defaultSectionOrder.map((section) => (
                  <span key={section} className="rounded bg-white border border-neutral-200 px-2 py-1 text-xs text-neutral-700">{section}</span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase updates-wide text-neutral-500 mb-2">Best for</p>
              <ul className="space-y-1">
                {tpl.bestFor.map((fit) => <li key={fit} className="text-xs text-neutral-700">• {fit}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:col-span-2">
              <p className="text-xs font-semibold uppercase updates-wide text-neutral-500 mb-2">Included modules</p>
              <div className="flex flex-wrap gap-1.5">
                {tpl.includedModules.map((mod) => (
                  <span key={mod} className="rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-xs text-emerald-700">{mod}</span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:col-span-1">
              <p className="text-xs font-semibold uppercase updates-wide text-neutral-500 mb-2">Fast start</p>
              <ol className="space-y-1 text-xs text-neutral-700 list-decimal list-inside">
                <li>Use this template</li>
                <li>Add your names + date</li>
                <li>Publish when ready</li>
              </ol>
            </div>

            {supportManifest && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 md:col-span-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase updates-wide text-neutral-500">Support manifest</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${supportManifest.previewStatus === 'verified' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>{supportManifest.previewLabel}</span>
                  <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-700">{supportManifest.sectionsIncluded} starter sections</span>
                  <span className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-700">{supportManifest.modulesIncluded} modules</span>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase updates-wide text-neutral-500 mb-2">Starts with</p>
                    <div className="flex flex-wrap gap-1.5">
                      {supportManifest.highlightedSections.map((section) => (
                        <span key={section} className="rounded bg-white border border-neutral-200 px-2 py-1 text-xs text-neutral-700">{section}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase updates-wide text-neutral-500 mb-2">What is verified</p>
                    <ul className="space-y-1 text-xs text-neutral-700">
                      {supportManifest.supportNotes.map((note) => <li key={note}>• {note}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs text-neutral-700">You can switch templates later in setup — your core wedding details stay intact.</p>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button onClick={() => useTemplate()} className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Use this template</button>
            <Link to="/templates" className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back to gallery</Link>
          </div>

          {relatedTemplates.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase updates-wide text-neutral-500 mb-2">Similar templates</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {relatedTemplates.map((rel) => {
                  const moduleDelta = rel.includedModules.length - tpl.includedModules.length;
                  return (
                    <div key={rel.id} className="rounded-lg border border-neutral-200 bg-white p-2 hover:border-rose-300">
                      <Link to={`/templates/${rel.id}`}>
                        <img src={rel.previewImage} alt={rel.name} className="h-20 w-full rounded object-cover" />
                        <p className="mt-1 text-xs font-medium text-neutral-800">{rel.name}</p>
                      </Link>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {rel.includedModules.length} modules {moduleDelta === 0 ? '(same depth)' : moduleDelta > 0 ? `(+${moduleDelta} vs current)` : `(${moduleDelta} vs current)`}
                      </p>
                      <button
                        type="button"
                        onClick={() => useTemplate(rel.id)}
                        className="mt-1.5 w-full rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        Use this
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="fixed bottom-3 left-3 right-3 md:hidden z-20">
        <button onClick={() => useTemplate()} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-rose-700">Use this template</button>
      </div>
    </div>
  );
};

export default TemplateDetail;
