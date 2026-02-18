import { supabase } from '../../lib/supabase';
import { BuilderProject, createEmptyBuilderProject } from '../../types/builder/project';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { WeddingDataV1, createEmptyWeddingData } from '../../types/weddingData';
import { safeJsonParse } from '../../lib/jsonUtils';
import { fromExistingLayoutToBuilderProject, fromBuilderProjectToExistingLayout } from '../adapters/layoutAdapter';

export const builderProjectService = {
  async loadProject(weddingSiteId: string): Promise<BuilderProject | null> {
    const { data, error } = await supabase
      .from('wedding_sites')
      .select('id, layout_config, site_json, active_template_id, template_id, wedding_data')
      .eq('id', weddingSiteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const templateId = (data.active_template_id ?? data.template_id ?? 'modern-luxe') as string;

    if (data.site_json) {
      const parsed = safeJsonParse<BuilderProject>(data.site_json, null as unknown as BuilderProject);
      if (parsed && parsed.pages && Array.isArray(parsed.pages)) {
        return { ...parsed, weddingId: weddingSiteId };
      }
    }

    if (data.layout_config) {
      const layout = safeJsonParse<LayoutConfigV1>(data.layout_config, null as unknown as LayoutConfigV1);
      if (layout && layout.version === '1' && Array.isArray(layout.pages)) {
        return fromExistingLayoutToBuilderProject(weddingSiteId, layout);
      }
    }

    return createEmptyBuilderProject(weddingSiteId, templateId);
  },

  async loadWeddingData(weddingSiteId: string): Promise<WeddingDataV1> {
    const { data, error } = await supabase
      .from('wedding_sites')
      .select('wedding_data, couple_name_1, couple_name_2, wedding_date, venue_name, venue_location, site_slug')
      .eq('id', weddingSiteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return createEmptyWeddingData();

    if (data.wedding_data) {
      const parsed = safeJsonParse<WeddingDataV1>(data.wedding_data, null as unknown as WeddingDataV1);
      if (parsed && parsed.version === '1') return parsed;
    }

    const now = new Date().toISOString();
    return {
      version: '1',
      couple: {
        partner1Name: (data.couple_name_1 as string) ?? '',
        partner2Name: (data.couple_name_2 as string) ?? '',
        displayName: data.couple_name_1 && data.couple_name_2
          ? `${data.couple_name_1} & ${data.couple_name_2}`
          : '',
      },
      event: {
        weddingDateISO: data.wedding_date ? new Date(data.wedding_date as string).toISOString() : undefined,
      },
      venues: data.venue_name
        ? [{ id: 'primary', name: data.venue_name as string, address: (data.venue_location as string) ?? undefined }]
        : [],
      schedule: [],
      rsvp: { enabled: true },
      travel: {},
      registry: { links: [] },
      faq: [],
      theme: {},
      media: { gallery: [] },
      meta: { createdAtISO: now, updatedAtISO: now },
    };
  },

  async saveDraft(project: BuilderProject, weddingData?: WeddingDataV1): Promise<void> {
    const layoutConfig = fromBuilderProjectToExistingLayout(project);
    const projectJson = project;
    const layoutJson = layoutConfig;

    const updatePayload: Record<string, unknown> = {
      layout_config: layoutJson,
      site_json: projectJson,
      active_template_id: project.templateId,
      template_id: project.templateId,
      updated_at: new Date().toISOString(),
    };

    if (weddingData) {
      updatePayload.wedding_data = weddingData;
    }

    const { error } = await supabase
      .from('wedding_sites')
      .update(updatePayload)
      .eq('id', project.weddingId);

    if (error) throw error;
  },

  async publishProject(_projectId: string, weddingSiteId: string): Promise<{ publishedAt: string; version: number }> {
    const publishedAt = new Date().toISOString();

    const { error } = await supabase
      .from('wedding_sites')
      .update({
        is_published: true,
        published_at: publishedAt,
        updated_at: publishedAt,
      })
      .eq('id', weddingSiteId);

    if (error) throw error;

    return { publishedAt, version: Date.now() };
  },
};
