import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BuilderShell } from './components/BuilderShell';
import { builderProjectService } from './services/builderProjectService';
import { publishService } from './services/publishService';
import { BuilderProject } from '../types/builder/project';
import { WeddingDataV1 } from '../types/weddingData';
import { createDefaultSectionInstance } from '../types/builder/section';
import { supabase } from '../lib/supabase';
import { getTemplatePack } from './constants/builderTemplatePacks';
import { readSetupDraft } from '../lib/setupDraft';
import { applySetupDraftToWeddingData, hasMeaningfulSetupDraft } from './utils/setupDraftHydration';
import { getBuilderEntryExperience } from './builderEntryExperience';
import { createDemoBuilderProject, createDemoWeddingDataFromSite } from './builderDemoWeddingData';

function applyTemplateDefaultsToProject(project: BuilderProject, templateId: string): BuilderProject {
  const template = getTemplatePack(templateId);
  if (!template) return { ...project, templateId };

  const firstPage = project.pages[0];
  if (!firstPage) return { ...project, templateId, themeId: template.defaultThemeId };

  const hasExistingSections = firstPage.sections.some((section) =>
    section.enabled || Object.keys(section.settings ?? {}).length > 1 || Object.keys(section.bindings ?? {}).length > 0
  );

  if (hasExistingSections) {
    return {
      ...project,
      templateId,
      themeId: project.themeId || template.defaultThemeId,
    };
  }

  return {
    ...project,
    templateId,
    themeId: template.defaultThemeId,
    pages: project.pages.map((page, pageIndex) => {
      if (pageIndex !== 0) return page;
      return {
        ...page,
        sections: template.sectionComposition.map((section, index) => ({
          ...createDefaultSectionInstance(section.type, section.variant, index),
          enabled: section.enabled,
          locked: section.locked,
          settings: { ...section.settings },
        })),
      };
    }),
  };
}

export const BuilderPage: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<BuilderProject | null>(null);
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupleName, setCoupleName] = useState<string>('');
  const setupDraft = readSetupDraft();
  const loadingExperience = getBuilderEntryExperience({ mode: 'loading', isDemoMode, draft: setupDraft });
  const noSiteExperience = getBuilderEntryExperience({ mode: 'no-site', draft: setupDraft });
  const errorExperience = getBuilderEntryExperience({ mode: 'error', errorMessage: error, draft: setupDraft });

  const loadBuilderProject = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (isDemoMode) {
        const demoProject = createDemoBuilderProject();
        const demoWedding = createDemoWeddingDataFromSite();

        setProject(demoProject);
        setWeddingData(demoWedding);
        setCoupleName(demoWedding.couple.displayName || 'My Wedding');
        return;
      }

      const { data: siteData, error: siteError } = await supabase
        .from('wedding_sites')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (siteError) throw siteError;

      if (!siteData) {
        setError('no-site');
        return;
      }

      const siteId = siteData.id as string;
      const row = siteData as Record<string, unknown>;
      const name1 = ((row.couple_name_1 as string) || (row.couple_first_name as string) || '') as string;
      const name2 = ((row.couple_name_2 as string) || (row.couple_second_name as string) || '') as string;
      setCoupleName(name1 && name2 ? `${name1} & ${name2}` : name1 || name2 || 'My Wedding');

      const [loadedProject, loadedWeddingData] = await Promise.all([
        builderProjectService.loadProject(siteId),
        builderProjectService.loadWeddingData(siteId),
      ]);

      let nextWeddingData = loadedWeddingData;
      let nextProject = loadedProject;
      const setupDraft = readSetupDraft();
      const hasNoCoupleNames = !loadedWeddingData.couple.partner1Name && !loadedWeddingData.couple.partner2Name;

      if (hasMeaningfulSetupDraft(setupDraft) && hasNoCoupleNames) {
        nextWeddingData = applySetupDraftToWeddingData(loadedWeddingData, setupDraft);

        if (nextProject && setupDraft.selectedTemplateId) {
          nextProject = applyTemplateDefaultsToProject(nextProject, setupDraft.selectedTemplateId);
        }

        if (nextProject) {
          await publishService.saveDraft(nextProject, nextWeddingData);
        }
      }

      if (nextWeddingData.couple.displayName) {
        setCoupleName(nextWeddingData.couple.displayName);
      }

      setProject(nextProject);
      setWeddingData(nextWeddingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load builder');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (!user) return;
    loadBuilderProject(user.id);
  }, [loadBuilderProject, user]);

  const handleSave = async (updatedProject: BuilderProject, updatedWeddingData?: WeddingDataV1 | null) => {
    if (isDemoMode) {
      setProject(updatedProject);
      if (updatedWeddingData) setWeddingData(updatedWeddingData);
      return;
    }
    await publishService.saveDraft(updatedProject, updatedWeddingData ?? undefined);
    if (updatedWeddingData) setWeddingData(updatedWeddingData);
  };

  const handlePublish = async (projectId: string): Promise<{ version: number; publishedAt: string }> => {
    if (!project || isDemoMode) {
      return {
        version: project?.publishedVersion ?? 0,
        publishedAt: new Date().toISOString(),
      };
    }
    const result = await publishService.publish({ ...project, id: projectId });
    if (!result.success) throw new Error(result.error);
    return { version: result.version, publishedAt: result.publishedAt };
  };

  const handleRestoreRevision = async (revisionId: string): Promise<{ project: BuilderProject; weddingData?: WeddingDataV1 | null } | null> => {
    if (isDemoMode) return null;

    const weddingSiteId = project?.weddingId;
    if (!weddingSiteId) return null;

    const restored = await builderProjectService.rollbackToRevision(weddingSiteId, revisionId);
    if (!restored) return null;

    const [nextProject, nextWeddingData] = await Promise.all([
      builderProjectService.loadProject(weddingSiteId),
      builderProjectService.loadWeddingData(weddingSiteId),
    ]);

    const resolvedProject = nextProject ?? restored.project;
    const resolvedWeddingData = nextWeddingData ?? restored.weddingData ?? null;
    setProject(resolvedProject);
    setWeddingData(resolvedWeddingData);
    return { project: resolvedProject, weddingData: resolvedWeddingData };
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-xl px-6 text-center">
          <Loader2 size={32} className="animate-spin text-rose-500 mx-auto mb-3" />
          <p className="text-base font-semibold text-gray-800">{loadingExperience.title}</p>
          <p className="mt-2 text-sm text-gray-500">{loadingExperience.detail}</p>
          <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-900">Main focus</p>
            <p className="mt-1 text-sm font-medium text-sky-950">{loadingExperience.focusTitle}</p>
            <p className="mt-1 text-xs text-sky-800">{loadingExperience.focusDetail}</p>
          </div>
          <div className="mt-4 grid gap-3 text-left sm:grid-cols-3">
            {[
              { label: 'Current', detail: loadingExperience.currentStep },
              { label: 'Next', detail: loadingExperience.nextStep },
              { label: 'Then', detail: loadingExperience.thenStep },
            ].map((step) => (
              <div key={step.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{step.label}</p>
                <p className="mt-1 text-xs text-gray-600">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error === 'no-site') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-2xl px-4">
          <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💍</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{noSiteExperience.title}</h2>
          <p className="text-sm text-gray-500 mb-4">{noSiteExperience.detail}</p>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-left mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-900">Main focus</p>
            <p className="mt-1 text-sm font-medium text-sky-950">{noSiteExperience.focusTitle}</p>
            <p className="mt-1 text-xs text-sky-800">{noSiteExperience.focusDetail}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Best next move</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{noSiteExperience.bestNextMove}</p>
            <p className="mt-2 text-xs text-gray-600"><span className="font-semibold text-gray-800">Decision rule:</span> {noSiteExperience.decisionRule}</p>
            <p className="mt-1 text-xs text-gray-600"><span className="font-semibold text-gray-800">Watchout:</span> {noSiteExperience.watchout}</p>
          </div>
          <div className="grid gap-3 text-left mb-6 sm:grid-cols-3">
            {[
              { label: 'Current', detail: noSiteExperience.currentStep },
              { label: 'Next', detail: noSiteExperience.nextStep },
              { label: 'Then', detail: noSiteExperience.thenStep },
            ].map((step) => (
              <div key={step.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{step.label}</p>
                <p className="mt-1 text-xs text-gray-600">{step.detail}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/setup/names')}
            className="inline-flex items-center px-5 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors"
          >
            {noSiteExperience.primaryActionLabel}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-3 flex items-center gap-1.5 mx-auto text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={14} />
            {noSiteExperience.secondaryActionLabel}
          </button>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-2xl px-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-800 mb-2">{errorExperience.title}</h2>
          <p className="text-sm text-gray-500 mb-4">{errorExperience.detail}</p>
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-left mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-900">Main focus</p>
            <p className="mt-1 text-sm font-medium text-red-950">{errorExperience.focusTitle}</p>
            <p className="mt-1 text-xs text-red-800">{errorExperience.focusDetail}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Best next move</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{errorExperience.bestNextMove}</p>
            <p className="mt-2 text-xs text-gray-600"><span className="font-semibold text-gray-800">Decision rule:</span> {errorExperience.decisionRule}</p>
            <p className="mt-1 text-xs text-gray-600"><span className="font-semibold text-gray-800">Watchout:</span> {errorExperience.watchout}</p>
          </div>
          <div className="grid gap-3 text-left mb-5 sm:grid-cols-3">
            {[
              { label: 'Current', detail: errorExperience.currentStep },
              { label: 'Next', detail: errorExperience.nextStep },
              { label: 'Then', detail: errorExperience.thenStep },
            ].map((step) => (
              <div key={step.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">{step.label}</p>
                <p className="mt-1 text-xs text-gray-600">{step.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => user && loadBuilderProject(user.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors"
            >
              <RefreshCw size={14} />
              {errorExperience.primaryActionLabel}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={14} />
              {errorExperience.secondaryActionLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BuilderShell
      initialProject={project}
      initialWeddingData={weddingData ?? undefined}
      projectName={coupleName}
      isDemoMode={isDemoMode}
      onSave={handleSave}
      onPublish={handlePublish}
      onRestoreRevision={handleRestoreRevision}
    />
  );
};

export default BuilderPage;
