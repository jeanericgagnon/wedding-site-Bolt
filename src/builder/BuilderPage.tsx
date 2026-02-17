import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BuilderShell } from './components/BuilderShell';
import { builderProjectService } from './services/builderProjectService';
import { publishService } from './services/publishService';
import { BuilderProject } from '../types/builder/project';

export const BuilderPage: React.FC = () => {
  const { user } = useAuth();
  const [project, setProject] = useState<BuilderProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [coupleName, setCoupleName] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    loadBuilderProject(user.id);
  }, [user]);

  const loadBuilderProject = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { supabase } = await import('../lib/supabase');
      const { data: weddingData, error: weddingError } = await supabase
        .from('weddings')
        .select('id, partner1_name, partner2_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (weddingError) throw weddingError;
      if (!weddingData) {
        setError('No wedding found. Please complete onboarding first.');
        return;
      }

      setWeddingId(weddingData.id);
      setCoupleName(`${weddingData.partner1_name} & ${weddingData.partner2_name}`);

      const loadedProject = await builderProjectService.loadProject(weddingData.id);
      setProject(loadedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load builder');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedProject: BuilderProject) => {
    await publishService.saveDraft(updatedProject);
  };

  const handlePublish = async (projectId: string) => {
    if (!project || !weddingId) return;
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

  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Builder unavailable</h2>
          <p className="text-sm text-gray-500 mb-4">{error ?? 'Unable to load project.'}</p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <BuilderShell
      initialProject={project}
      projectName={coupleName}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
};

export default BuilderPage;
