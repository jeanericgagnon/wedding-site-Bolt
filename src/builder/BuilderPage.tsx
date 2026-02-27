import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BuilderShell } from './components/BuilderShell';
import { builderProjectService } from './services/builderProjectService';
import { publishService } from './services/publishService';
import { BuilderProject, createEmptyBuilderProject } from '../types/builder/project';
import { WeddingDataV1, createEmptyWeddingData } from '../types/weddingData';
import { createDefaultSectionInstance } from '../types/builder/section';
import { supabase } from '../lib/supabase';
import { demoWeddingSite } from '../lib/demoData';
import { getTemplatePack } from './constants/builderTemplatePacks';

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

type SetupDraft = {
  selectedTemplateId?: string;
  partnerOneFirstName?: string;
  partnerOneLastName?: string;
  partnerTwoFirstName?: string;
  partnerTwoLastName?: string;
  dateKnown?: boolean;
  weddingDate?: string;
  weddingCity?: string;
  weddingRegion?: string;
  guestEstimateBand?: '' | 'lt50' | '50to100' | '100to200' | '200plus';
  stylePreferences?: string[];
};

function readSetupDraft(): SetupDraft | null {
  try {
    const raw = localStorage.getItem('dayof.builderV2.setupDraft');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SetupDraft;
    return parsed;
  } catch {
    return null;
  }
}

function applySetupDraftToWeddingData(source: WeddingDataV1, draft: SetupDraft): WeddingDataV1 {
  const next = structuredClone(source) as WeddingDataV1;

  const p1 = draft.partnerOneFirstName?.trim() ?? '';
  const p2 = draft.partnerTwoFirstName?.trim() ?? '';
  if (p1) next.couple.partner1Name = p1;
  if (p2) next.couple.partner2Name = p2;
  if (p1 && p2) next.couple.displayName = `${p1} & ${p2}`;

  if (draft.dateKnown && draft.weddingDate) {
    next.event.weddingDateISO = new Date(draft.weddingDate).toISOString();
  }

  const location = [draft.weddingCity?.trim(), draft.weddingRegion?.trim()].filter(Boolean).join(', ');
  if (location) {
    if (!next.venues || next.venues.length === 0) {
      next.venues = [{ id: 'primary', name: 'Main Venue', address: location }];
    } else {
      next.venues[0].address = location;
    }
  }

  if (Array.isArray(draft.stylePreferences) && draft.stylePreferences.length > 0) {
    next.theme = {
      ...next.theme,
      tokens: {
        ...(next.theme?.tokens ?? {}),
        style_preferences: draft.stylePreferences.join(','),
      },
    };
  }

  next.meta.updatedAtISO = new Date().toISOString();
  return next;
}

function createDemoWeddingDataFromSite(): WeddingDataV1 {
  const data = createEmptyWeddingData();
  const now = new Date();
  const weddingDate = new Date(demoWeddingSite.wedding_date);

  data.couple.partner1Name = demoWeddingSite.couple_name_1;
  data.couple.partner2Name = demoWeddingSite.couple_name_2;
  data.couple.displayName = `${demoWeddingSite.couple_name_1} & ${demoWeddingSite.couple_name_2}`;
  data.couple.story = 'We met on a rainy Tuesday in Seattle and spent our first date talking for six hours in a tiny coffee shop. Years later, after moving cities, building a home, and collecting too many plants, we got engaged at sunset with our families nearby. We cannot wait to celebrate with everyone we love.';
  data.event.weddingDateISO = weddingDate.toISOString();
  data.event.timezone = 'America/Los_Angeles';

  data.venues = [
    { id: 'venue-ceremony', name: 'Sunset Gardens Estate', address: demoWeddingSite.venue_location, notes: 'Ceremony lawn opens at 3:30 PM.' },
    { id: 'venue-reception', name: 'Grand Ballroom', address: '123 Garden Lane, Napa Valley, CA 94558', notes: 'Cocktail hour and reception.' },
  ];

  data.schedule = [
    { id: 'sched-1', label: 'Guest Arrival', startTimeISO: new Date(weddingDate.getTime() - 60 * 60 * 1000).toISOString(), venueId: 'venue-ceremony' },
    { id: 'sched-2', label: 'Ceremony', startTimeISO: weddingDate.toISOString(), venueId: 'venue-ceremony' },
    { id: 'sched-3', label: 'Cocktail Hour', startTimeISO: new Date(weddingDate.getTime() + 90 * 60 * 1000).toISOString(), venueId: 'venue-reception' },
    { id: 'sched-4', label: 'Dinner & Toasts', startTimeISO: new Date(weddingDate.getTime() + 150 * 60 * 1000).toISOString(), venueId: 'venue-reception' },
    { id: 'sched-5', label: 'Dancing', startTimeISO: new Date(weddingDate.getTime() + 240 * 60 * 1000).toISOString(), venueId: 'venue-reception' },
  ];

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

  data.media.heroImageUrl = demoWeddingSite.hero_image_url;
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

      if (setupDraft && hasNoCoupleNames) {
        nextWeddingData = applySetupDraftToWeddingData(loadedWeddingData, setupDraft);

        if (nextProject && setupDraft.selectedTemplateId && nextProject.templateId !== setupDraft.selectedTemplateId) {
          nextProject = {
            ...nextProject,
            templateId: setupDraft.selectedTemplateId,
          };
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

  const handlePublish = async (projectId: string) => {
    if (!project) return;
    if (isDemoMode) return;
    const result = await publishService.publish({ ...project, id: projectId });
    if (!result.success) throw new Error(result.error);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-rose-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading builder...</p>
        </div>
      </div>
    );
  }

  if (error === 'no-site') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-4">
          <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💍</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No wedding site yet</h2>
          <p className="text-sm text-gray-500 mb-6">
            Complete your wedding setup first to start building your site.
          </p>
          <button
            onClick={() => navigate('/setup/names')}
            className="inline-flex items-center px-5 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors"
          >
            Start Setup
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-3 flex items-center gap-1.5 mx-auto text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm px-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Builder unavailable</h2>
          <p className="text-sm text-gray-500 mb-5">{error ?? 'Unable to load project.'}</p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => user && loadBuilderProject(user.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Dashboard
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
