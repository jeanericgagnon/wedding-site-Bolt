import { supabase } from '../../lib/supabase';
import { BuilderProject, createEmptyBuilderProject } from '../../types/builder/project';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { WeddingDataV1, createEmptyWeddingData } from '../../types/weddingData';
import { safeJsonParse } from '../../lib/jsonUtils';
import { fromExistingLayoutToBuilderProject, fromBuilderProjectToExistingLayout } from '../adapters/layoutAdapter';
import { serializeBuilderProject } from '../serializers/projectSerializer';
import { BuilderRevision, getBuilderRevision, listBuilderRevisions, recordBuilderRevision } from './versionHistory';
import { rewriteSignedMediaUrlsToPublicDeep } from '../../lib/mediaUrl';
import { buildCoupleDisplayName } from '../../lib/coupleDisplayName';

const toNonEmptyIsoStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toPositiveNumberOrNull = (value: unknown): number | null => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
};

function normalizePersistenceMetadata(project: BuilderProject, row?: Record<string, unknown>): BuilderProject {
  const siteJson = (row?.site_json && typeof row.site_json === 'object')
    ? (row.site_json as Record<string, unknown>)
    : null;

  const publishedVersion = toPositiveNumberOrNull(project.publishedVersion)
    ?? toPositiveNumberOrNull(siteJson?.publishedVersion)
    ?? null;
  const lastPublishedAt = toNonEmptyIsoStringOrNull(project.lastPublishedAt)
    ?? toNonEmptyIsoStringOrNull(siteJson?.lastPublishedAt)
    ?? toNonEmptyIsoStringOrNull(row?.published_at)
    ?? null;
  const draftVersion = toPositiveNumberOrNull(project.draftVersion)
    ?? toPositiveNumberOrNull(siteJson?.draftVersion)
    ?? 1;
  const publishStatus = project.publishStatus === 'published'
    || siteJson?.publishStatus === 'published'
    || publishedVersion !== null
    || lastPublishedAt !== null
      ? 'published'
      : 'draft';

  return {
    ...project,
    draftVersion,
    publishedVersion,
    publishStatus,
    lastPublishedAt,
  };
}

const toIsoDateOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

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
        const durableParsed = rewriteSignedMediaUrlsToPublicDeep(parsed);
        return normalizePersistenceMetadata({ ...durableParsed, weddingId: weddingSiteId }, data as Record<string, unknown>);
      }
    }

    if (data.layout_config) {
      const layout = safeJsonParse<LayoutConfigV1>(data.layout_config, null as unknown as LayoutConfigV1);
      if (layout && layout.version === '1' && Array.isArray(layout.pages)) {
        return normalizePersistenceMetadata(fromExistingLayoutToBuilderProject(weddingSiteId, layout), data as Record<string, unknown>);
      }
    }

    return normalizePersistenceMetadata(createEmptyBuilderProject(weddingSiteId, templateId), data as Record<string, unknown>);
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
      if (parsed && parsed.version === '1') return rewriteSignedMediaUrlsToPublicDeep(parsed);
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

  async saveDraft(project: BuilderProject, weddingData?: WeddingDataV1): Promise<BuilderProject> {
    const normalizedProject = serializeBuilderProject(project);
    const now = new Date().toISOString();
    const nextDraftVersion = Math.max(toPositiveNumberOrNull(normalizedProject.draftVersion) ?? 1, 1) + 1;
    const normalizedProjectWithDurableMedia = rewriteSignedMediaUrlsToPublicDeep(normalizedProject);
    const persistedProject = normalizePersistenceMetadata({
      ...normalizedProjectWithDurableMedia,
      draftVersion: nextDraftVersion,
      meta: {
        ...normalizedProjectWithDurableMedia.meta,
        updatedAtISO: now,
      },
    });
    const layoutConfig = fromBuilderProjectToExistingLayout(persistedProject);
    const projectJson = persistedProject;
    const layoutJson = layoutConfig;

    const updatePayload: Record<string, unknown> = {
      layout_config: layoutJson,
      site_json: projectJson,
      active_template_id: persistedProject.templateId,
      template_id: persistedProject.templateId,
      updated_at: now,
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

    const durableWeddingData = weddingData ? rewriteSignedMediaUrlsToPublicDeep(weddingData) : undefined;

    recordBuilderRevision({
      weddingId: project.weddingId,
      project: persistedProject,
      weddingData: durableWeddingData,
      action: 'save',
      actor: 'builder',
    });
    return persistedProject;
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

    // Try richest publish payload first, then gracefully degrade for schema-drifted tables.
    const publishPayload: Record<string, unknown> = {
      is_published: true,
      published_at: publishedAt,
      updated_at: publishedAt,
      published_json: nextPublishedJson,
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

  listProjectRevisions(weddingSiteId: string) {
    return listBuilderRevisions(weddingSiteId);
  },

  async rollbackToRevision(weddingSiteId: string, revisionId: string): Promise<BuilderRevision | null> {
    const revision = getBuilderRevision(weddingSiteId, revisionId);
    if (!revision) return null;

    await this.saveDraft(revision.project, revision.weddingData);
    recordBuilderRevision({
      weddingId: weddingSiteId,
      project: revision.project,
      weddingData: revision.weddingData,
      action: 'rollback',
      actor: 'builder',
    });
    return revision;
  },
};
