import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft, RefreshCw, LayoutTemplate } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BuilderShell } from './components/BuilderShell';
import { builderProjectService } from './services/builderProjectService';
import { publishService } from './services/publishService';
import { BuilderProject, createEmptyBuilderProject } from '../types/builder/project';
import { WeddingDataV1, createEmptyWeddingData } from '../types/weddingData';
import { createDefaultSectionInstance } from '../types/builder/section';
import { demoWeddingSite } from '../lib/demoData';
import { buildCoupleDisplayName } from '../lib/coupleDisplayName';
import { getTemplatePack } from './constants/builderTemplatePacks';
import { readSetupDraft } from '../lib/setupDraft';
import { resolveActiveSiteForUser } from '../lib/activeSite';
import { applySetupDraftToWeddingData, hasMeaningfulSetupDraft } from './utils/setupDraftHydration';

function createDemoBuilderProject(): BuilderProject {
  const templateId = 'modern-luxe';
  const project = createEmptyBuilderProject(demoWeddingSite.id, templateId);
  const template = getTemplatePack(templateId);

  if (template) {
    project.themeId = template.defaultThemeId;
    project.pages[0].sections = template.sectionComposition.map((section, index) => ({
      ...createDefaultSectionInstance(section.type, section.variant, index),
      enabled: section.enabled,
      locked: section.locked,
      settings: { ...section.settings },
    }));
  }

  return project;
}

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

const toIsoDateOrUndefined = (value: string): string | undefined => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const buildDemoSchedule = (weddingDateISO?: string) => {
  if (!weddingDateISO) return [];
  const weddingDate = new Date(weddingDateISO);

  return [
    { id: 'sched-1', label: 'Guest Arrival', startTimeISO: new Date(weddingDate.getTime() - 60 * 60 * 1000).toISOString(), venueId: 'venue-ceremony' },
    { id: 'sched-2', label: 'Ceremony', startTimeISO: weddingDate.toISOString(), venueId: 'venue-ceremony' },
    { id: 'sched-3', label: 'Cocktail Hour', startTimeISO: new Date(weddingDate.getTime() + 90 * 60 * 1000).toISOString(), venueId: 'venue-reception' },
    { id: 'sched-4', label: 'Dinner & Toasts', startTimeISO: new Date(weddingDate.getTime() + 150 * 60 * 1000).toISOString(), venueId: 'venue-reception' },
    { id: 'sched-5', label: 'Dancing', startTimeISO: new Date(weddingDate.getTime() + 240 * 60 * 1000).toISOString(), venueId: 'venue-reception' },
  ];
};

export function createDemoWeddingDataFromSite(overrides: Partial<typeof demoWeddingSite> = {}): WeddingDataV1 {
  const data = createEmptyWeddingData();
  const now = new Date();
  const site = { ...demoWeddingSite, ...overrides };
  const weddingDateISO = toIsoDateOrUndefined(site.wedding_date);

  data.couple.partner1Name = site.couple_name_1;
  data.couple.partner2Name = site.couple_name_2;
  data.couple.displayName = buildCoupleDisplayName(site.couple_name_1, site.couple_name_2, 'The couple');
  data.couple.story = 'We met on a rainy Tuesday in Seattle and spent our first date talking for six hours in a tiny coffee shop. Years later, after moving cities, building a home, and collecting too many plants, we got engaged at sunset with our families nearby. We cannot wait to celebrate with everyone we love.';
  data.event.weddingDateISO = weddingDateISO;
  data.event.timezone = 'America/Los_Angeles';

  data.venues = [
    { id: 'venue-ceremony', name: 'Sunset Gardens Estate', address: site.venue_location, notes: 'Ceremony lawn opens at 3:30 PM.' },
    { id: 'venue-reception', name: 'Grand Ballroom', address: '123 Garden Lane, Napa Valley, CA 94558', notes: 'Cocktail hour and reception.' },
  ];

  data.schedule = buildDemoSchedule(weddingDateISO);

  data.rsvp.deadlineISO = new Date(now.getTime() + 45 * 86400000).toISOString();
  data.travel.hotelInfo = 'We reserved room blocks at Hotel Indigo Napa Valley and The Archer. Mention "Thompson-Rivera Wedding" for discounted rates.';
  data.travel.parkingInfo = 'Complimentary valet is available at the main entrance. Rideshare drop-off is at the Garden Gate.';
  data.travel.flightInfo = 'Closest airports: OAK and SFO. From either airport, expect a 70–90 minute drive.';

  data.registry.links = [
    { id: 'reg-1', label: 'Honeyfund', url: 'https://www.honeyfund.com/' },
    { id: 'reg-2', label: 'Crate & Barrel', url: 'https://www.crateandbarrel.com/gift-registry/' },
    { id: 'reg-3', label: 'Amazon', url: 'https://www.amazon.com/wedding' },
  ];
  data.registry.notes = 'Your presence is the best gift. If you would like, you can contribute to our honeymoon and first-home fund.';

  data.faq = [
    { id: 'faq-1', q: 'What is the dress code?', a: 'Garden formal: suits, cocktail dresses, and comfortable shoes for lawn paths.' },
    { id: 'faq-2', q: 'Can I bring a plus one?', a: 'Please refer to your invitation. If your invite includes a plus one, it will be reflected in RSVP.' },
    { id: 'faq-3', q: 'Are kids invited?', a: 'We love your little ones, but this will be an adults-only celebration.' },
    { id: 'faq-4', q: 'What time should I arrive?', a: 'Please arrive 30 minutes before the ceremony so we can begin on time.' },
  ];

  data.media.heroImageUrl = site.hero_image_url;
  data.media.gallery = [
    { id: 'g-1', url: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg', caption: 'Our favorite weekend trip' },
    { id: 'g-2', url: 'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg', caption: 'Engagement day' },
    { id: 'g-3', url: 'https://images.pexels.com/photos/1468379/pexels-photo-1468379.jpeg', caption: 'City sunset walk' },
    { id: 'g-4', url: 'https://images.pexels.com/photos/265947/pexels-photo-265947.jpeg', caption: 'Celebrating with family' },
    { id: 'g-5', url: 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg', caption: 'Weekend market tradition' },
    { id: 'g-6', url: 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg', caption: 'Countdown mode' },
  ];

  data.theme.preset = 'elegant';
  data.meta.updatedAtISO = new Date().toISOString();
  return data;
}

export const BuilderPage: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<BuilderProject | null>(null);
  const [weddingData, setWeddingData] = useState<WeddingDataV1 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupleName, setCoupleName] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    loadBuilderProject(user.id);
  }, [user, isDemoMode]);

  const loadBuilderProject = async (userId: string) => {
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

      const activeSite = await resolveActiveSiteForUser(userId);
      const siteData = await builderProjectService.loadEntrySite(activeSite?.id ?? '');

      if (!siteData) {
        setError('no-site');
        return;
      }

      const siteId = siteData.id as string;
      const name1 = siteData.couple_name_1 || siteData.couple_first_name || '';
      const name2 = siteData.couple_name_2 || siteData.couple_second_name || '';
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
    } catch {
      setError('Couldn’t load the site editor right now. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-subtle">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-text-secondary">Loading your site editor…</p>
        </div>
      </div>
    );
  }

  if (error === 'no-site') {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-subtle">
        <div className="text-center max-w-sm px-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-border-subtle bg-white">
            <LayoutTemplate size={24} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">No website yet</h2>
          <p className="text-sm text-text-secondary mb-6">
            Finish setup first and dayof will create a strong first version of your website for you.
          </p>
          <p className="text-xs text-text-tertiary mb-6">That first draft will give you something real to refine instead of a blank editor.</p>
          <button
            onClick={() => navigate('/setup/names')}
            className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Start setup
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-3 flex items-center gap-1.5 mx-auto text-sm text-text-tertiary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            Back to wedding home
          </button>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-subtle">
        <div className="text-center max-w-sm px-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border-subtle bg-white">
            <AlertCircle size={24} className="text-primary" />
          </div>
          <h2 className="text-base font-semibold text-text-primary mb-2">Site editor unavailable</h2>
          <p className="text-sm text-text-secondary mb-5">We couldn’t load your site editor right now.</p>
          <p className="text-xs text-text-tertiary mb-5">If this keeps happening, go back to your wedding home and reopen the site editor.</p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => user && loadBuilderProject(user.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
            >
              <RefreshCw size={14} />
              Try again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={14} />
              Back to wedding home
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
    />
  );
};

export default BuilderPage;
