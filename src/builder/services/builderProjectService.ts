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
      .select('*')
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
      .select('*')
      .eq('id', weddingSiteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return createEmptyWeddingData();

    if (data.wedding_data) {
      const parsed = safeJsonParse<WeddingDataV1>(data.wedding_data, null as unknown as WeddingDataV1);
      if (parsed && parsed.version === '1') return parsed;
    }

    const row = data as Record<string, unknown>;
    const partner1 = (row.couple_name_1 as string) || (row.couple_first_name as string) || '';
    const partner2 = (row.couple_name_2 as string) || (row.couple_second_name as string) || '';

    const now = new Date().toISOString();
    return {
      version: '1',
      couple: {
        partner1Name: partner1,
        partner2Name: partner2,
        displayName: partner1 && partner2 ? `${partner1} & ${partner2}` : '',
      },
      event: {
        weddingDateISO: (data.venue_date || data.wedding_date)
          ? new Date((data.venue_date || data.wedding_date) as string).toISOString()
          : undefined,
      },
      venues: data.venue_name
        ? [{ id: 'primary', name: data.venue_name as string, address: ((data.wedding_location as string) || (data.venue_location as string) || undefined) }]
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

    let { error } = await supabase
      .from('wedding_sites')
      .update(updatePayload)
      .eq('id', project.weddingId);

    if (error?.message?.includes('active_template_id')) {
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.active_template_id;

      const result = await supabase
        .from('wedding_sites')
        .update(fallbackPayload)
        .eq('id', project.weddingId);
      error = result.error;
    }

    if (error?.message?.includes('layout_config')) {
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.layout_config;

      const result = await supabase
        .from('wedding_sites')
        .update(fallbackPayload)
        .eq('id', project.weddingId);
      error = result.error;
    }

    if (error?.message?.includes('site_json')) {
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.site_json;

      const result = await supabase
        .from('wedding_sites')
        .update(fallbackPayload)
        .eq('id', project.weddingId);
      error = result.error;
    }

    if (error) throw error;
  },

  async publishProject(_projectId: string, weddingSiteId: string): Promise<{ publishedAt: string; version: number }> {
    const publishedAt = new Date().toISOString();

    const { data: current, error: fetchError } = await supabase
      .from('wedding_sites')
      .select('site_json')
      .eq('id', weddingSiteId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Try richest publish payload first, then gracefully degrade for schema-drifted tables.
    let publishError: { message?: string } | null = null;

    {
      const { error } = await supabase
        .from('wedding_sites')
        .update({
          is_published: true,
          published_at: publishedAt,
          updated_at: publishedAt,
          published_json: current?.site_json ?? null,
        })
        .eq('id', weddingSiteId);
      publishError = error;
    }

    if (publishError?.message?.includes('published_json')) {
      const { error } = await supabase
        .from('wedding_sites')
        .update({
          is_published: true,
          published_at: publishedAt,
          updated_at: publishedAt,
        })
        .eq('id', weddingSiteId);
      publishError = error;
    }

    if (publishError) throw publishError;

    return { publishedAt, version: Date.now() };
  },
};
