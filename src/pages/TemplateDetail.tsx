import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { templateCatalog } from '../builder/constants/templateCatalog';
import { getTemplateSupportManifest } from '../builder/constants/templateSupportManifest';
import { TEMPLATE_USE_CASE_PACKS } from '../builder/constants/templateUseCasePacks';
import { useInternalToolingRouteAccess } from '../lib/internalToolingRoutes';
import { selectSetupDraftTemplate } from '../lib/setupDraft';
import { useAuth } from '../hooks/useAuth';

export const TemplateDetail: React.FC = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { internalToolingCaptureRoutesEnabled } = useInternalToolingRouteAccess();
  const { user } = useAuth();
  const setupDraftStorageScope = user?.id ?? null;

  const tpl = templateCatalog.find((t) => t.id === templateId);

  if (!tpl) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-neutral-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-neutral-900">That design is not available right now</h1>
          <p className="mt-2 text-sm text-neutral-600">It may have moved, but the design gallery is ready when you are.</p>
          <Link to="/templates" className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover">Back to designs</Link>
        </div>
      </div>
    );
  }

  const supportManifest = tpl ? getTemplateSupportManifest(tpl.id) : null;

  const relatedTemplates = templateCatalog
    .filter((t) => t.id !== tpl.id)
    .filter((t) => t.styleTags.some((tag) => tpl.styleTags.includes(tag)))
    .slice(0, 3);

  const handleUseTemplate = (id = tpl.id) => {
    selectSetupDraftTemplate(id, setupDraftStorageScope);
    navigate('/setup/names');
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <img src={tpl.previewImage} alt={tpl.name} className="h-56 md:h-72 w-full object-cover" />
        <div className="p-6">
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-1 text-primary">Core wedding pages included</span>
            <span className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-neutral-700">Easy to personalize</span>
            <span className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-neutral-700">Share when you are ready</span>
          </div>
          <p className="text-xs font-medium text-neutral-500">Design family: {tpl.designFamily}</p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-900">{tpl.name}</h1>
          <p className="mt-3 text-sm text-neutral-600 max-w-3xl">{tpl.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tpl.styleTags.map((tag) => (
              <span key={tag} className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700">{tag}</span>
            ))}
            {tpl.seasonTags.map((tag) => (
              <span key={tag} className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700">{tag}</span>
            ))}
            <span className="rounded border border-primary/15 bg-primary/5 px-2 py-1 text-xs text-primary">{tpl.colorwayId}</span>
            <span className="rounded border border-primary/15 bg-primary/5 px-2 py-1 text-xs font-semibold text-primary">{tpl.readinessLabel} · {tpl.readinessScore}</span>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 md:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-neutral-500">Populated website preview</p>
                {internalToolingCaptureRoutesEnabled ? (
                  <Link
                    to={`/template-scroll-capture?templateId=${tpl.id}`}
                    className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-100"
                  >
                    Open full website preview
                  </Link>
                ) : null}
              </div>
              <div className="rounded border border-neutral-200 bg-white overflow-hidden">
                {internalToolingCaptureRoutesEnabled ? (
                  <iframe
                    title={`${tpl.name} live preview`}
                    src={`/template-scroll-capture?templateId=${tpl.id}`}
                    className="h-[360px] w-full"
                  />
                ) : (
                  <img src={tpl.previewImage} alt={`${tpl.name} preview`} className="h-[360px] w-full object-cover" />
                )}
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">Uses sample wedding details so you can see how the design feels with real content in place.</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 md:col-span-1">
              <p className="text-xs font-semibold text-neutral-500 mb-2">Page flow</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {tpl.pageTitles.map((title, index) => (
                  <span key={`${title}-${index}`} className="rounded border border-primary/15 bg-primary/5 px-2 py-1 text-xs text-primary">
                    {title}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tpl.defaultSectionOrder.map((section) => (
                  <span key={section} className="rounded bg-white border border-neutral-200 px-2 py-1 text-xs text-neutral-700">{section}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-500 mb-2">Guest URLs</p>
              <div className="flex flex-wrap gap-1.5">
                {tpl.guestRoutes.map((route) => (
                  <span key={route} className="rounded border border-neutral-200 bg-white px-2 py-1 font-mono text-xs text-neutral-700">{route}</span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">
                {tpl.pageCount > 1 ? 'This starts as a multi-page site.' : 'This starts as one page with section links.'}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 md:col-span-3">
              <p className="text-xs font-semibold text-neutral-500 mb-2">Page blueprint</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {tpl.pageBlueprints.map((page) => (
                  <div key={page.route} className="rounded border border-neutral-200 bg-white p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-neutral-900">{page.title}</p>
                      <span className="font-mono text-[11px] text-neutral-500">{page.route}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-600">{page.sections.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 md:col-span-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-neutral-500">Guest readiness</p>
                <span className="rounded-xl border border-primary/15 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">{tpl.readinessLabel}</span>
                <span className="rounded-xl border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-700">{tpl.readinessScore}/100</span>
              </div>
              <p className="mt-2 text-xs text-neutral-600">
                {tpl.readinessGaps.length > 0
                  ? `Review next: ${tpl.readinessGaps.join(', ')}.`
                  : 'The starter structure covers the guest-critical website pieces.'}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-semibold text-neutral-500 mb-2">Best for</p>
              <ul className="space-y-1">
                {tpl.bestFor.map((fit) => <li key={fit} className="text-xs text-neutral-700">• {fit}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 md:col-span-2">
              <p className="text-xs font-semibold text-neutral-500 mb-2">Included features</p>
              <div className="flex flex-wrap gap-1.5">
                {tpl.includedModules.map((mod) => (
                  <span key={mod} className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700">{mod}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 md:col-span-1">
              <p className="text-xs font-semibold text-neutral-500 mb-2">Fast start</p>
              <ol className="space-y-1 text-xs text-neutral-700 list-decimal list-inside">
                <li>Choose this design</li>
                <li>Add your names + date</li>
                <li>Share when ready</li>
              </ol>
            </div>

            {supportManifest && (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 md:col-span-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-neutral-500">Design preview</p>
                  <span className={`rounded-xl border px-2 py-0.5 text-[11px] font-medium ${supportManifest.previewStatus === 'verified' ? 'border-primary/20 bg-primary/5 text-primary' : 'border-neutral-200 bg-white text-neutral-700'}`}>{supportManifest.previewLabel}</span>
                  <span className="rounded-xl border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-700">{supportManifest.pageFlowLabel}</span>
                  <span className="rounded-xl border border-primary/15 bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary">{supportManifest.readinessLabel} · {supportManifest.readinessScore}</span>
                  <span className="rounded-xl border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-700">{supportManifest.sectionsIncluded} starter sections</span>
                  <span className="rounded-xl border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-700">{supportManifest.modulesIncluded} features</span>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 mb-2">Starts with</p>
                    <div className="flex flex-wrap gap-1.5">
                      {supportManifest.highlightedSections.map((section) => (
                        <span key={section} className="rounded bg-white border border-neutral-200 px-2 py-1 text-xs text-neutral-700">{section}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 mb-2">What is included</p>
                    <p className="mb-2 text-xs text-neutral-600">{supportManifest.previewDetail}</p>
                    <ul className="space-y-1 text-xs text-neutral-700">
                      {supportManifest.supportNotes.map((note) => <li key={note}>• {note}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs text-neutral-700">You can switch designs later in setup and keep your core wedding details.</p>
          </div>

          <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold text-neutral-500 mb-2">Ways this design can grow</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {TEMPLATE_USE_CASE_PACKS.map((pack) => (
                <div key={pack.id} className="rounded-xl border border-neutral-200 bg-white p-3">
                  <p className="text-sm font-medium text-neutral-900">{pack.label}</p>
                  <p className="mt-1 text-xs text-neutral-600">{pack.description}</p>
                  <ul className="mt-2 space-y-1 text-[11px] text-neutral-600">
                    {pack.defaultChanges.map((change) => <li key={change}>• {change}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button onClick={() => handleUseTemplate()} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">Use this design</button>
            <Link to="/templates" className="rounded border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100">Back to gallery</Link>
          </div>

          {relatedTemplates.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-neutral-500 mb-2">Similar designs</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {relatedTemplates.map((rel) => {
                  const moduleDelta = rel.includedModules.length - tpl.includedModules.length;
                  return (
                    <div key={rel.id} className="rounded-xl border border-neutral-200 bg-white p-2 hover:border-primary/35">
                      <Link to={`/templates/${rel.id}`}>
                        <img src={rel.previewImage} alt={rel.name} className="h-20 w-full rounded object-cover" />
                        <p className="mt-1 text-xs font-medium text-neutral-800">{rel.name}</p>
                      </Link>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {rel.includedModules.length} features {moduleDelta === 0 ? '(same depth)' : moduleDelta > 0 ? `(+${moduleDelta} vs this design)` : `(${moduleDelta} vs this design)`}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleUseTemplate(rel.id)}
                        className="mt-1.5 w-full rounded border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
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
        <button onClick={() => handleUseTemplate()} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-hover">Use this design</button>
      </div>
    </div>
  );
};

export default TemplateDetail;
