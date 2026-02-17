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
      .eq('wedding_id', weddingId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapRowToAsset);
  },

  async save(asset: Omit<BuilderMediaAsset, 'id'>): Promise<BuilderMediaAsset> {
    const { data, error } = await supabase
      .from('builder_media_assets')
      .insert({
        wedding_id: asset.weddingId,
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

function mapRowToAsset(row: Record<string, unknown>): BuilderMediaAsset {
  return {
    id: row.id as string,
    weddingId: row.wedding_id as string,
    filename: row.filename as string,
    originalFilename: row.original_filename as string,
    mimeType: row.mime_type as string,
    assetType: row.asset_type as BuilderMediaAsset['assetType'],
    status: row.status as BuilderMediaAsset['status'],
    url: row.url as string,
    thumbnailUrl: row.thumbnail_url as string | undefined,
    width: row.width as number | undefined,
    height: row.height as number | undefined,
    sizeBytes: row.size_bytes as number,
    altText: row.alt_text as string | undefined,
    caption: row.caption as string | undefined,
    tags: (row.tags as string[]) ?? [],
    attachedSectionIds: (row.attached_section_ids as string[]) ?? [],
    meta: {
      uploadedAtISO: row.uploaded_at as string,
      updatedAtISO: row.updated_at as string,
    },
  };
}
