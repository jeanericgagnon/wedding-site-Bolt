import { supabase } from '../../lib/supabase';
import { BuilderMediaAsset } from '../../types/builder/media';

const STORAGE_BUCKET = 'wedding-media';

export interface MediaRepositoryUploadResult {
  url: string;
  path: string;
}

export const mediaRepository = {
  async upload(
    weddingId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<MediaRepositoryUploadResult> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${weddingId}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;

    onProgress?.(10);

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;

    onProgress?.(90);

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    onProgress?.(100);

    return { url: urlData.publicUrl, path };
  },

  async list(weddingId: string): Promise<BuilderMediaAsset[]> {
    const { data, error } = await supabase
      .from('builder_media_assets')
      .select('*')
      .eq('wedding_site_id', weddingId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapRowToAsset);
  },

  async save(asset: Omit<BuilderMediaAsset, 'id'>): Promise<BuilderMediaAsset> {
    const { data, error } = await supabase
      .from('builder_media_assets')
      .insert({
        wedding_site_id: asset.weddingId,
        filename: asset.filename,
        original_filename: asset.originalFilename,
        mime_type: asset.mimeType,
        asset_type: asset.assetType,
        status: asset.status,
        url: asset.url,
        thumbnail_url: asset.thumbnailUrl,
        width: asset.width,
        height: asset.height,
        size_bytes: asset.sizeBytes,
        alt_text: asset.altText,
        caption: asset.caption,
        tags: asset.tags,
        attached_section_ids: asset.attachedSectionIds,
      })
      .select()
      .single();

    if (error) throw error;
    return mapRowToAsset(data);
  },

  async delete(assetId: string): Promise<void> {
    const { error } = await supabase.from('builder_media_assets').delete().eq('id', assetId);
    if (error) throw error;
  },

  async attachToSection(assetId: string, sectionId: string): Promise<void> {
    const { data, error } = await supabase
      .from('builder_media_assets')
      .select('attached_section_ids')
      .eq('id', assetId)
      .maybeSingle();

    if (error) throw error;

    const current: string[] = data?.attached_section_ids ?? [];
    if (current.includes(sectionId)) return;

    const { error: updateError } = await supabase
      .from('builder_media_assets')
      .update({ attached_section_ids: [...current, sectionId] })
      .eq('id', assetId);

    if (updateError) throw updateError;
  },
};

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function maybeStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function maybeNum(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string') : [];
}

function mapRowToAsset(row: Record<string, unknown>): BuilderMediaAsset {
  const validAssetTypes: BuilderMediaAsset['assetType'][] = ['image', 'video', 'document'];
  const validStatuses: BuilderMediaAsset['status'][] = ['ready', 'uploading', 'error'];

  const rawAssetType = str(row.asset_type);
  const assetType: BuilderMediaAsset['assetType'] = validAssetTypes.includes(rawAssetType as BuilderMediaAsset['assetType'])
    ? (rawAssetType as BuilderMediaAsset['assetType'])
    : 'image';

  const rawStatus = str(row.status);
  const status: BuilderMediaAsset['status'] = validStatuses.includes(rawStatus as BuilderMediaAsset['status'])
    ? (rawStatus as BuilderMediaAsset['status'])
    : 'ready';

  return {
    id: str(row.id),
    weddingId: str(row.wedding_site_id),
    filename: str(row.filename),
    originalFilename: str(row.original_filename),
    mimeType: str(row.mime_type),
    assetType,
    status,
    url: str(row.url),
    thumbnailUrl: maybeStr(row.thumbnail_url),
    width: maybeNum(row.width),
    height: maybeNum(row.height),
    sizeBytes: typeof row.size_bytes === 'number' ? row.size_bytes : 0,
    altText: maybeStr(row.alt_text),
    caption: maybeStr(row.caption),
    tags: strArray(row.tags),
    attachedSectionIds: strArray(row.attached_section_ids),
    meta: {
      uploadedAtISO: str(row.uploaded_at),
      updatedAtISO: str(row.updated_at),
    },
  };
}
