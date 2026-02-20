import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BuilderShell } from './components/BuilderShell';
import { builderProjectService } from './services/builderProjectService';
import { publishService } from './services/publishService';
import { BuilderProject, createEmptyBuilderProject } from '../types/builder/project';
import { WeddingDataV1, createEmptyWeddingData } from '../types/weddingData';
import { supabase } from '../lib/supabase';
import { demoWeddingSite } from '../lib/demoData';

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
        const demoProject = createEmptyBuilderProject(demoWeddingSite.id, 'modern-luxe');
        const demoWedding = createEmptyWeddingData();
        demoWedding.couple.partner1Name = demoWeddingSite.couple_name_1;
        demoWedding.couple.partner2Name = demoWeddingSite.couple_name_2;
        demoWedding.couple.displayName = `${demoWeddingSite.couple_name_1} & ${demoWeddingSite.couple_name_2}`;
        demoWedding.event.weddingDateISO = new Date(demoWeddingSite.wedding_date).toISOString();

        setProject(demoProject);
        setWeddingData(demoWedding);
        setCoupleName(demoWedding.couple.displayName || 'My Wedding');
        return;
      }

      const { data: siteData, error: siteError } = await supabase
        .from('wedding_sites')
        .select('id, couple_name_1, couple_name_2')
        .eq('user_id', userId)
        .maybeSingle();

      if (siteError) throw siteError;

      if (!siteData) {
        setError('no-site');
        return;
      }

      const siteId = siteData.id as string;
      const name1 = (siteData.couple_name_1 as string) ?? '';
      const name2 = (siteData.couple_name_2 as string) ?? '';
      setCoupleName(name1 && name2 ? `${name1} & ${name2}` : name1 || name2 || 'My Wedding');

      const [loadedProject, loadedWeddingData] = await Promise.all([
        builderProjectService.loadProject(siteId),
        builderProjectService.loadWeddingData(siteId),
      ]);

      setProject(loadedProject);
      setWeddingData(loadedWeddingData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load builder');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedProject: BuilderProject) => {
    if (isDemoMode) {
      setProject(updatedProject);
      return;
    }
    await publishService.saveDraft(updatedProject);
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
            onClick={() => navigate('/onboarding')}
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
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
};

export default BuilderPage;
