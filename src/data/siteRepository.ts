import { supabase } from '../lib/supabase';
import { PersistedSection, PersistedSectionSchema, parseSections, SectionTypeValue } from '../sections/schemas';
import { BuilderSectionInstance } from '../types/builder/section';
import { buildSiteUrlLookupCandidates, normalizePublicSiteSlug } from '../lib/publicSiteSlug';

export interface SectionReorderItem {
  id: string;
  order: number;
}

const PERSISTED_SECTION_SELECT = 'id, site_id, type, variant, data, order, visible, schema_version, style_overrides, bindings, created_at, updated_at' as const;

function parsePersistedSectionRecord(data: unknown): PersistedSection {
  const parsed = PersistedSectionSchema.safeParse(data);
  if (!parsed.success) throw new Error('Invalid section data returned from server');
  return parsed.data;
}

function builderToPersistedSection(s: BuilderSectionInstance, siteId: string): Omit<PersistedSection, 'created_at' | 'updated_at'> {
  return {
    id: s.id,
    site_id: siteId,
    type: s.type as SectionTypeValue,
    variant: s.variant,
    data: { ...s.settings },
    order: s.orderIndex,
    visible: s.enabled,
    schema_version: 1,
    style_overrides: { ...s.styleOverrides },
    bindings: { ...s.bindings },
  };
}

export const siteRepository = {
  async fetchPublicSiteBySlug(slugInput: string): Promise<Record<string, unknown> | null> {
    const slug = normalizePublicSiteSlug(slugInput);
    if (!slug) return null;

    const basePublicSiteColumns = [
      'id',
      'site_slug',
      'site_url',
      'is_published',
      'couple_name_1',
      'couple_name_2',
      'wedding_date',
      'venue_name',
      'wedding_location',
      'template_id',
      'default_language',
    ];
    const publicSiteSelect = basePublicSiteColumns.join(',');

    const queryPublicSite = async (column: 'site_slug' | 'site_url', value: string) => {
      const result = await supabase
        .from('wedding_sites')
        .select(publicSiteSelect)
        .eq(column, value)
        .maybeSingle();

      return result;
    };

    const bySlug = await queryPublicSite('site_slug', slug);

    if (bySlug.error) throw bySlug.error;
    if (bySlug.data) return bySlug.data as unknown as Record<string, unknown>;

    const urlCandidates = buildSiteUrlLookupCandidates(slug);
    for (const candidate of urlCandidates) {
      const bySiteUrl = await queryPublicSite('site_url', candidate);

      if (bySiteUrl.error) throw bySiteUrl.error;
      if (bySiteUrl.data) return bySiteUrl.data as unknown as Record<string, unknown>;
    }

    return null;
  },
  async fetchSections(siteId: string): Promise<PersistedSection[]> {
    const { data, error } = await supabase
      .from('sections')
      .select(PERSISTED_SECTION_SELECT)
      .eq('site_id', siteId)
      .order('order', { ascending: true });

    if (error) throw error;
    return parseSections(data ?? []);
  },

  async fetchPublishedSections(siteId: string): Promise<PersistedSection[]> {
    const { data, error } = await supabase
      .from('sections')
      .select(PERSISTED_SECTION_SELECT)
      .eq('site_id', siteId)
      .eq('visible', true)
      .order('order', { ascending: true });

    if (error) throw error;
    return parseSections(data ?? []);
  },

  async upsertSection(section: PersistedSection): Promise<PersistedSection> {
    const { created_at: _ca, updated_at: _ua, ...rest } = section;
    const { data, error } = await supabase.rpc('section_write', {
      p_site_id: section.site_id,
      p_section_id: section.id,
      p_payload: { ...rest, updated_at: new Date().toISOString() },
    });

    if (error) throw error;
    return parsePersistedSectionRecord(data);
  },

  async upsertSections(siteId: string, sections: BuilderSectionInstance[]): Promise<void> {
    const rows = sections.map(s => builderToPersistedSection(s, siteId));
    const { error } = await supabase.rpc('section_upsert_many', {
      p_site_id: siteId,
      p_rows: rows.map(r => ({ ...r, updated_at: new Date().toISOString() })),
    });

    if (error) throw error;
  },

  async updateSectionData(sectionId: string, data: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.rpc('section_write', {
      p_site_id: null,
      p_section_id: sectionId,
      p_payload: { data, updated_at: new Date().toISOString() },
    });

    if (error) throw error;
  },

  async updateSectionVisibility(sectionId: string, visible: boolean): Promise<void> {
    const { error } = await supabase.rpc('section_write', {
      p_site_id: null,
      p_section_id: sectionId,
      p_payload: { visible, updated_at: new Date().toISOString() },
    });

    if (error) throw error;
  },

  async updateSectionVariant(sectionId: string, variant: string): Promise<void> {
    const { error } = await supabase.rpc('section_write', {
      p_site_id: null,
      p_section_id: sectionId,
      p_payload: { variant, updated_at: new Date().toISOString() },
    });

    if (error) throw error;
  },

  async reorderSections(siteId: string, items: SectionReorderItem[]): Promise<void> {
    const { error } = await supabase.rpc('section_reorder_many', {
      p_site_id: siteId,
      p_items: items,
    });
    if (error) throw error;
  },

  async deleteSection(sectionId: string): Promise<void> {
    const { error } = await supabase.rpc('section_delete_one', {
      p_section_id: sectionId,
    });

    if (error) throw error;
  },

  async deleteSectionsForSite(siteId: string): Promise<void> {
    const { error } = await supabase.rpc('section_delete_by_site', {
      p_site_id: siteId,
    });

    if (error) throw error;
  },

  async addSection(siteId: string, section: Omit<PersistedSection, 'created_at' | 'updated_at'>): Promise<PersistedSection> {
    const now = new Date().toISOString();
    const { data, error } = await supabase.rpc('section_write', {
      p_site_id: siteId,
      p_section_id: section.id,
      p_payload: { ...section, site_id: siteId, created_at: now, updated_at: now },
    });

    if (error) throw error;
    return parsePersistedSectionRecord(data);
  },

  async syncBuilderSections(siteId: string, sections: BuilderSectionInstance[]): Promise<void> {
    await this.deleteSectionsForSite(siteId);
    if (sections.length === 0) return;
    await this.upsertSections(siteId, sections);
  },
};
