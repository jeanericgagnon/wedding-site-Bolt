import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { FIRST_SESSION_WORKSPACE_ROUTES } from '../lib/firstSessionWorkspaceRoutes';
import { readSetupDraft } from '../lib/setupDraft';
import { builderProjectService } from '../builder/services/builderProjectService';
import { getBuilderEntryExperience } from '../builder/builderEntryExperience';
import { buildBuilderV2UpgradeGuidance } from '../builder/components/builderV2UpgradeGuidance';
import { saveBuilderV2UpgradeBridge } from '../builder-v2/upgradeBridge';
import { getLegacyBuilderRoute, hasLegacyBuilderIntent } from './builderCutoverRoute';
import type { BuilderProject } from '../types/builder/project';
import type { WeddingDataV1 } from '../types/weddingData';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; project: BuilderProject | null; weddingData: WeddingDataV1 | null; coupleLabel: string }
  | { kind: 'no-site' }
  | { kind: 'error'; message: string };

export const BuilderCutover: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const setupDraft = useMemo(() => readSetupDraft(), []);
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [upgradeError, setUpgradeError] = useState('');

  useEffect(() => {
    if (hasLegacyBuilderIntent(location.search, location.hash)) {
      navigate(getLegacyBuilderRoute(location.search, location.hash), { replace: true });
    }
  }, [location.hash, location.search, navigate]);

  useEffect(() => {
    if (!user) return;
    if (hasLegacyBuilderIntent(location.search, location.hash)) return;

    let cancelled = false;

    const load = async () => {
      try {
        if (isDemoMode) {
          if (!cancelled) {
            setLoadState({ kind: 'ready', project: null, weddingData: null, coupleLabel: 'your demo site' });
          }
          return;
        }

        const { data: siteData, error: siteError } = await supabase
          .from('wedding_sites')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (siteError) throw siteError;
        if (!siteData) {
          if (!cancelled) setLoadState({ kind: 'no-site' });
          return;
        }

        const siteId = siteData.id as string;
        const [project, weddingData] = await Promise.all([
          builderProjectService.loadProject(siteId),
          builderProjectService.loadWeddingData(siteId),
        ]);

        const row = siteData as Record<string, unknown>;
        const coupleName1 = typeof row.couple_name_1 === 'string' ? row.couple_name_1 : '';
        const coupleName2 = typeof row.couple_name_2 === 'string' ? row.couple_name_2 : '';
        const coupleLabel = weddingData?.couple?.displayName?.trim()
          || [coupleName1, coupleName2].filter(Boolean).join(' & ')
          || 'your wedding site';

        if (!cancelled) {
          setLoadState({
            kind: 'ready',
            project,
            weddingData,
            coupleLabel,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Could not open the builder right now.',
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isDemoMode, location.hash, location.search, user]);

  const loadingExperience = getBuilderEntryExperience({ mode: 'loading', isDemoMode, draft: setupDraft });
  const noSiteExperience = getBuilderEntryExperience({ mode: 'no-site', draft: setupDraft });
  const errorExperience = getBuilderEntryExperience({
    mode: 'error',
    errorMessage: loadState.kind === 'error' ? loadState.message : null,
    draft: setupDraft,
  });

  const v2Guidance = useMemo(() => (
    loadState.kind === 'ready' && loadState.project
      ? buildBuilderV2UpgradeGuidance(loadState.project, loadState.weddingData, { isDirty: false })
      : null
  ), [loadState]);

  const openLegacyEditor = () => {
    navigate(getLegacyBuilderRoute('', ''));
  };

  const openStructuredV2 = () => {
    setUpgradeError('');

    if (loadState.kind === 'ready' && loadState.project) {
      const sourceName = `${loadState.coupleLabel} builder upgrade`;
      const saved = saveBuilderV2UpgradeBridge({
        sourceName,
        project: loadState.project,
        weddingData: loadState.weddingData,
      });

      if (!saved) {
        setUpgradeError('We could not carry the current builder draft into V2 right now. Try again or keep working in the current editor.');
        return;
      }
    }

    navigate('/builder-v2-lab');
  };

  if (loadState.kind === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-rose-500" />
          <p className="mt-4 text-center text-lg font-semibold text-neutral-900">{loadingExperience.title}</p>
          <p className="mt-2 text-center text-sm text-neutral-600">{loadingExperience.detail}</p>
        </div>
      </div>
    );
  }

  if (loadState.kind === 'error') {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Builder access</p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-950">{errorExperience.title}</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">{errorExperience.detail}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-4 w-4" />
              {errorExperience.primaryActionLabel}
            </button>
            <button
              type="button"
              onClick={() => navigate(FIRST_SESSION_WORKSPACE_ROUTES.overview)}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:border-neutral-400"
            >
              {errorExperience.secondaryActionLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadState.kind === 'no-site') {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Builder cutover</p>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-950">{noSiteExperience.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">{noSiteExperience.detail}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
              <div className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                Recommended next
              </div>
              <h2 className="mt-3 text-lg font-semibold text-neutral-950">Finish setup, then edit from a real draft</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{noSiteExperience.bestNextMove}</p>
              <p className="mt-3 text-xs leading-5 text-neutral-600">
                <span className="font-semibold text-neutral-800">Watchout:</span> {noSiteExperience.watchout}
              </p>
              <button
                type="button"
                onClick={() => navigate('/setup/names')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                {noSiteExperience.primaryActionLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
              <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                V2 starter draft
              </div>
              <h2 className="mt-3 text-lg font-semibold text-neutral-950">Open the structured V2 starter now</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                Use the setup draft you already have as a V2 starting point. This is useful for structure and page-map work before you treat anything as publish-ready.
              </p>
              <p className="mt-3 text-xs leading-5 text-neutral-600">
                This does not replace setup completion or create a live launch-ready site by itself.
              </p>
              <button
                type="button"
                onClick={openStructuredV2}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-2.5 text-sm font-semibold text-sky-900 hover:border-sky-400"
              >
                Open Builder V2 starter
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-3xl border border-neutral-200 bg-white px-6 py-8 shadow-sm">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-700">Builder cutover</p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Choose the right editor for the next step</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Builder V2 is the structured editing lane we are deepening. The current editor still holds a few live launch and quick-edit workflows, so this route keeps the handoff honest instead of pretending the switch is already finished.
          </p>
        </div>

        {v2Guidance ? (
          <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">Recommended V2 lane</p>
                <h2 className="mt-2 text-lg font-semibold text-neutral-950">{v2Guidance.title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-700">{v2Guidance.detail}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {v2Guidance.keyStats.map((stat) => (
                  <span key={stat} className="rounded-full border border-sky-200 bg-white px-2 py-1 text-sky-900">
                    {stat}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {v2Guidance.steps.map((step) => (
                <div key={step.label} className="rounded-xl border border-white/70 bg-white/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{step.label}</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-700">{step.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-neutral-900">{v2Guidance.bestNextMove}</p>
            <p className="mt-2 text-xs leading-5 text-neutral-600">
              <span className="font-semibold text-neutral-800">Decision rule:</span> {v2Guidance.decisionRule}
            </p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">
              <span className="font-semibold text-neutral-800">Watchout:</span> {v2Guidance.watchout}
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
            <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
              <Wand2 className="h-3.5 w-3.5" />
              Builder V2
            </div>
            <h2 className="mt-3 text-lg font-semibold text-neutral-950">Open a structured V2 working copy</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Carry the current draft into the V2 editor so you can review page flow, section structure, import repairs, and handoff quality without rebuilding from scratch.
            </p>
            <p className="mt-3 text-xs leading-5 text-neutral-600">
              Nothing goes live from this step. Review the imported structure before treating the V2 copy as the new source of truth.
            </p>
            <button
              type="button"
              onClick={openStructuredV2}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Open Builder V2 working copy
              <ArrowRight className="h-4 w-4" />
            </button>
            {upgradeError ? <p className="mt-3 text-sm text-rose-700">{upgradeError}</p> : null}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <div className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
              Current editor
            </div>
            <h2 className="mt-3 text-lg font-semibold text-neutral-950">Continue in the live legacy editor</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-700">
              Use the current editor when you need the existing quick-edit, launch checklist, or photo-tip workflows that still live there today.
            </p>
            <p className="mt-3 text-xs leading-5 text-neutral-600">
              This keeps the current editor available as the fallback while the V2 route becomes the clearer default entry point.
            </p>
            <button
              type="button"
              onClick={openLegacyEditor}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:border-neutral-400"
            >
              Continue in current editor
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BuilderCutover;
