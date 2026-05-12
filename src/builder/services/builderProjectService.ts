import { supabase } from '../../lib/supabase';
import { BuilderProject, createEmptyBuilderProject } from '../../types/builder/project';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { WeddingDataV1, createEmptyWeddingData, normalizeWeddingData } from '../../types/weddingData';
import { safeJsonParse } from '../../lib/jsonUtils';
import { fromExistingLayoutToBuilderProject, fromBuilderProjectToExistingLayout } from '../adapters/layoutAdapter';
import { serializeBuilderProject } from '../serializers/projectSerializer';
import { getBuilderRevision, listBuilderRevisions, recordBuilderRevision } from './versionHistory';
import { rewriteSignedMediaUrlsToPublicDeep } from '../../lib/mediaUrl';
import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';

const BUILDER_PROJECT_SITE_SELECT = 'id, active_template_id, template_id, site_json, layout_config' as const;
const BUILDER_WEDDING_DATA_SITE_SELECT = 'id, wedding_data, couple_name_1, couple_name_2, couple_first_name, couple_second_name, wedding_date, venue_date, venue_name, wedding_location, venue_location' as const;
const BUILDER_ENTRY_SITE_SELECT = 'id, couple_name_1, couple_name_2, couple_first_name, couple_second_name' as const;

export interface BuilderEntrySiteRow {
  id: string;
  couple_name_1?: string | null;
  couple_name_2?: string | null;
  couple_first_name?: string | null;
  couple_second_name?: string | null;
}

const toIsoDateOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const cleanRowString = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

const hydrateWeddingDataFromSiteRow = (
  weddingData: WeddingDataV1,
  siteRow: Record<string, unknown>,
): WeddingDataV1 => {
  const partner1 = cleanRowString(siteRow.couple_name_1) || cleanRowString(siteRow.couple_first_name);
  const partner2 = cleanRowString(siteRow.couple_name_2) || cleanRowString(siteRow.couple_second_name);
  const hasRowNames = Boolean(partner1 || partner2);
  const displayName = hasRowNames
    ? buildCoupleDisplayName(partner1, partner2)
    : buildCoupleDisplayName(
        weddingData.couple?.partner1Name,
        weddingData.couple?.partner2Name,
        weddingData.couple?.displayName,
      );

  const weddingDateISO = toIsoDateOrUndefined(siteRow.wedding_date)
    ?? toIsoDateOrUndefined(siteRow.venue_date)
    ?? weddingData.event?.weddingDateISO;

  const venueName = cleanRowString(siteRow.venue_name);
  const venueAddress = cleanRowString(siteRow.wedding_location) || cleanRowString(siteRow.venue_location);
  const venues = Array.isArray(weddingData.venues) ? [...weddingData.venues] : [];

  if (venueName || venueAddress) {
    if (venues.length === 0) {
      venues.push({
        id: 'primary',
        ...(venueName ? { name: venueName } : {}),
        ...(venueAddress ? { address: venueAddress } : {}),
      });
    } else {
      venues[0] = {
        ...venues[0],
        ...(venueName ? { name: venueName } : {}),
        ...(venueAddress ? { address: venueAddress } : {}),
      };
    }
  }

  return {
    ...weddingData,
    couple: {
      ...weddingData.couple,
      partner1Name: partner1 || weddingData.couple?.partner1Name || '',
      partner2Name: partner2 || weddingData.couple?.partner2Name || '',
      displayName,
    },
    event: {
      ...weddingData.event,
      weddingDateISO,
    },
    venues,
  };
};

export const builderProjectService = {
  async loadEntrySite(weddingSiteId: string): Promise<BuilderEntrySiteRow | null> {
    const { data, error } = await supabase
      .from('wedding_sites')
      .select(BUILDER_ENTRY_SITE_SELECT)
      .eq('id', weddingSiteId)
      .maybeSingle();

    if (error) throw error;
    return (data as BuilderEntrySiteRow | null) ?? null;
  },

  async loadProject(weddingSiteId: string): Promise<BuilderProject | null> {
    const { data, error } = await supabase
      .from('wedding_sites')
      .select(BUILDER_PROJECT_SITE_SELECT)
      .eq('id', weddingSiteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const templateId = (data.active_template_id ?? data.template_id ?? 'modern-luxe') as string;

    if (data.site_json) {
      const parsed = safeJsonParse<BuilderProject>(data.site_json, null as unknown as BuilderProject);
      if (parsed && parsed.pages && Array.isArray(parsed.pages)) {
        const durableParsed = rewriteSignedMediaUrlsToPublicDeep(parsed);
        return { ...durableParsed, weddingId: weddingSiteId };
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
      .select(BUILDER_WEDDING_DATA_SITE_SELECT)
      .eq('id', weddingSiteId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return createEmptyWeddingData();

    if (data.wedding_data) {
      const parsed = safeJsonParse<WeddingDataV1>(data.wedding_data, null as unknown as WeddingDataV1);
      if (parsed && parsed.version === '1') {
        return hydrateWeddingDataFromSiteRow(
          rewriteSignedMediaUrlsToPublicDeep(normalizeWeddingData(parsed)),
          data as Record<string, unknown>,
        );
      }
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
        displayName: buildCoupleDisplayName(partner1, partner2),
      },
      event: {
        weddingDateISO: toIsoDateOrUndefined(data.venue_date || data.wedding_date),
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
    const normalizedProjectWithDurableMedia = rewriteSignedMediaUrlsToPublicDeep(normalizedProject);
    const layoutConfig = fromBuilderProjectToExistingLayout(normalizedProjectWithDurableMedia);
    const projectJson = normalizedProjectWithDurableMedia;
    const layoutJson = layoutConfig;

    const updatePayload: Record<string, unknown> = {
      layout_config: layoutJson,
      site_json: projectJson,
      active_template_id: normalizedProject.templateId,
      template_id: normalizedProject.templateId,
      updated_at: new Date().toISOString(),
    };

    if (weddingData) {
      const durableWeddingData = rewriteSignedMediaUrlsToPublicDeep(weddingData);
      updatePayload.wedding_data = durableWeddingData;

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
      const result = await supabase.rpc('wedding_site_settings_patch', {
        p_wedding_site_id: project.weddingId,
        p_patch: payload,
      });

      error = result.error;
      if (!error) break;

      const field = driftFields.find((candidate) => error?.message?.includes(candidate));
      if (!field || !(field in payload)) break;
      delete payload[field];
    }

    if (error) throw error;

    recordBuilderRevision({
      weddingId: project.weddingId,
      project: normalizedProject,
      weddingData,
      action: 'save',
      actor: 'builder',
    });
  },

  async publishProject(_projectId: string, weddingSiteId: string): Promise<{ publishedAt: string; version: number }> {
    const publishedAt = new Date().toISOString();

    let currentSiteJson: unknown = null;
    let currentWeddingData: unknown = null;

    {
      const primary = await supabase
        .from('wedding_sites')
        .select('site_json, wedding_data')
        .eq('id', weddingSiteId)
        .maybeSingle();

      if (!primary.error) {
        currentSiteJson = primary.data?.site_json ?? null;
        currentWeddingData = primary.data?.wedding_data ?? null;
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
      ? (rewriteSignedMediaUrlsToPublicDeep(currentSiteJson) as Record<string, unknown>)
      : {};

    const nextPublishedVersion =
      typeof currentSiteJsonObj.publishedVersion === 'number'
        ? (currentSiteJsonObj.publishedVersion as number) + 1
        : 1;

    const durableWeddingData = currentWeddingData
      ? rewriteSignedMediaUrlsToPublicDeep(currentWeddingData)
      : null;

    const nextSiteJson: Record<string, unknown> = {
      ...currentSiteJsonObj,
      publishStatus: 'published',
      lastPublishedAt: publishedAt,
      publishedVersion: nextPublishedVersion,
      ...(durableWeddingData ? { weddingDataSnapshot: durableWeddingData } : {}),
    };

    const nextPublishedJson: Record<string, unknown> | unknown = currentSiteJsonObj && typeof currentSiteJsonObj === 'object'
      ? {
          ...currentSiteJsonObj,
          ...(durableWeddingData ? { weddingDataSnapshot: durableWeddingData } : {}),
        }
      : currentSiteJson;

    const { error: publishError } = await supabase.rpc('builder_project_publish', {
      p_wedding_site_id: weddingSiteId,
      p_published_at: publishedAt,
      p_next_site_json: nextSiteJson,
      p_next_published_json: nextPublishedJson,
    });

    if (publishError) throw publishError;

    try {
      const latestProject = await this.loadProject(weddingSiteId);
      if (latestProject) {
        const latestWeddingData = await this.loadWeddingData(weddingSiteId);
        recordBuilderRevision({
          weddingId: weddingSiteId,
          project: latestProject,
          weddingData: latestWeddingData,
          action: 'publish',
          actor: 'builder',
        });
      }
    } catch {
      // non-blocking revision logging
    }

    return { publishedAt, version: nextPublishedVersion };
  },

  async listProjectRevisions(weddingSiteId: string) {
    return listBuilderRevisions(weddingSiteId);
  },

  async rollbackToRevision(weddingSiteId: string, revisionId: string): Promise<boolean> {
    const revision = getBuilderRevision(weddingSiteId, revisionId);
    if (!revision) return false;

    await this.saveDraft(revision.project, revision.weddingData);
    recordBuilderRevision({
      weddingId: weddingSiteId,
      project: revision.project,
      weddingData: revision.weddingData,
      action: 'rollback',
      actor: 'builder',
    });
    return true;
  },
};
