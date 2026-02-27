import { supabase } from '../../lib/supabase';
import { BuilderProject, createEmptyBuilderProject } from '../../types/builder/project';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { WeddingDataV1, createEmptyWeddingData } from '../../types/weddingData';
import { safeJsonParse } from '../../lib/jsonUtils';
import { fromExistingLayoutToBuilderProject, fromBuilderProjectToExistingLayout } from '../adapters/layoutAdapter';
import { serializeBuilderProject } from '../serializers/projectSerializer';

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
    const normalizedProject = serializeBuilderProject(project);
    const layoutConfig = fromBuilderProjectToExistingLayout(normalizedProject);
    const projectJson = normalizedProject;
    const layoutJson = layoutConfig;

    const updatePayload: Record<string, unknown> = {
      layout_config: layoutJson,
      site_json: projectJson,
      active_template_id: normalizedProject.templateId,
      template_id: normalizedProject.templateId,
      updated_at: new Date().toISOString(),
    };

    if (weddingData) {
      updatePayload.wedding_data = weddingData;

      const p1 = weddingData.couple?.partner1Name?.trim() || null;
      const p2 = weddingData.couple?.partner2Name?.trim() || null;
      const weddingDateISO = weddingData.event?.weddingDateISO || null;
      const weddingDate = weddingDateISO ? weddingDateISO.slice(0, 10) : null;
      const primaryVenue = weddingData.venues?.[0];

      updatePayload.couple_name_1 = p1;
      updatePayload.couple_name_2 = p2;
      updatePayload.wedding_date = weddingDate;
      updatePayload.venue_date = weddingDate;
      updatePayload.venue_name = primaryVenue?.name || null;
      updatePayload.wedding_location = primaryVenue?.address || null;
    }

    const payload: Record<string, unknown> = { ...updatePayload };
    const driftFields = [
      'active_template_id',
      'layout_config',
      'site_json',
      'wedding_data',
      'template_id',
      'wedding_date',
      'venue_date',
      'venue_name',
      'wedding_location',
      'couple_name_1',
      'couple_name_2',
    ];

    let error: { message?: string } | null = null;

    for (let i = 0; i <= driftFields.length; i += 1) {
      const result = await supabase
        .from('wedding_sites')
        .update(payload)
        .eq('id', project.weddingId);

      error = result.error;
      if (!error) break;

      const field = driftFields.find((candidate) => error?.message?.includes(candidate));
      if (!field || !(field in payload)) break;
      delete payload[field];
    }

    if (error) throw error;
  },

  async publishProject(_projectId: string, weddingSiteId: string): Promise<{ publishedAt: string; version: number }> {
    const publishedAt = new Date().toISOString();

    let currentSiteJson: unknown = null;

    {
      const primary = await supabase
        .from('wedding_sites')
        .select('site_json')
        .eq('id', weddingSiteId)
        .maybeSingle();

      if (!primary.error) {
        currentSiteJson = primary.data?.site_json ?? null;
      } else {
        const fallback = await supabase
          .from('wedding_sites')
          .select('id')
          .eq('id', weddingSiteId)
          .maybeSingle();
        if (fallback.error) throw fallback.error;
      }
    }

    const currentSiteJsonObj = (currentSiteJson && typeof currentSiteJson === 'object')
      ? (currentSiteJson as Record<string, unknown>)
      : {};

    const nextPublishedVersion =
      typeof currentSiteJsonObj.publishedVersion === 'number'
        ? (currentSiteJsonObj.publishedVersion as number) + 1
        : 1;

    const nextSiteJson: Record<string, unknown> = {
      ...currentSiteJsonObj,
      publishStatus: 'published',
      lastPublishedAt: publishedAt,
      publishedVersion: nextPublishedVersion,
    };

    // Try richest publish payload first, then gracefully degrade for schema-drifted tables.
    const publishPayload: Record<string, unknown> = {
      is_published: true,
      published_at: publishedAt,
      updated_at: publishedAt,
      published_json: currentSiteJson,
      site_json: nextSiteJson,
    };

    const driftFields = ['published_json', 'published_at', 'is_published'];
    let publishError: { message?: string } | null = null;

    for (let i = 0; i <= driftFields.length; i += 1) {
      const { error } = await supabase
        .from('wedding_sites')
        .update(publishPayload)
        .eq('id', weddingSiteId);
      publishError = error;

      if (!publishError) break;
      const field = driftFields.find((candidate) => publishError?.message?.includes(candidate));
      if (!field || !(field in publishPayload)) break;
      delete publishPayload[field];
    }

    if (publishError) {
      const fallback = await supabase
        .from('wedding_sites')
        .update({
          site_json: nextSiteJson,
          updated_at: publishedAt,
        })
        .eq('id', weddingSiteId);
      publishError = fallback.error;
    }

    if (publishError) throw publishError;

    return { publishedAt, version: nextPublishedVersion };
  },
};
