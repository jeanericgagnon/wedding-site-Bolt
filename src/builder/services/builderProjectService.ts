import { supabase } from '../../lib/supabase';
import { BuilderProject, createEmptyBuilderProject } from '../../types/builder/project';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { fromExistingLayoutToBuilderProject, fromBuilderProjectToExistingLayout } from '../adapters/layoutAdapter';

export const builderProjectService = {
  async loadProject(weddingId: string): Promise<BuilderProject | null> {
    const { data, error } = await supabase
      .from('wedding_sites')
      .select('id, layout_config, site_json, template_id, slug')
      .eq('wedding_id', weddingId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    if (data.site_json) {
      try {
        const parsed = JSON.parse(data.site_json) as BuilderProject;
        if (parsed && parsed.pages) return { ...parsed, weddingId };
      } catch {
        // fall through to layout_config
      }
    }

    if (data.layout_config) {
      try {
        const layout = JSON.parse(data.layout_config) as LayoutConfigV1;
        return fromExistingLayoutToBuilderProject(weddingId, layout);
      } catch {
        // fall through to empty project
      }
    }

    return createEmptyBuilderProject(weddingId, data.template_id ?? 'modern-luxe');
  },

  async saveDraft(project: BuilderProject): Promise<void> {
    const layoutConfig = fromBuilderProjectToExistingLayout(project);
    const projectJson = JSON.stringify(project);
    const layoutJson = JSON.stringify(layoutConfig);

    const { error } = await supabase
      .from('wedding_sites')
      .update({
        layout_config: layoutJson,
        site_json: projectJson,
        template_id: project.templateId,
        updated_at: new Date().toISOString(),
      })
      .eq('wedding_id', project.weddingId);

    if (error) throw error;
  },

  async publishProject(projectId: string, weddingId: string): Promise<void> {
    const { error } = await supabase
      .from('wedding_sites')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('wedding_id', weddingId);

    if (error) throw error;

    void projectId;
  },
};
