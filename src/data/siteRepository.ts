import { supabase } from '../lib/supabase';
import { PersistedSection, PersistedSectionSchema, parseSections, SectionTypeValue } from '../sections/schemas';
import { BuilderSectionInstance } from '../types/builder/section';
import { buildSiteUrlLookupCandidates, normalizePublicSiteSlug } from '../lib/publicSiteSlug';

export interface SectionReorderItem {
  id: string;
  order: number;
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

    const bySlug = await supabase
      .from('wedding_sites')
      .select('*')
      .eq('site_slug', slug)
      .maybeSingle();

    if (bySlug.error) throw bySlug.error;
    if (bySlug.data) return bySlug.data as Record<string, unknown>;

    const urlCandidates = buildSiteUrlLookupCandidates(slug);
    for (const candidate of urlCandidates) {
      const bySiteUrl = await supabase
        .from('wedding_sites')
        .select('*')
        .eq('site_url', candidate)
        .maybeSingle();

      if (bySiteUrl.error) throw bySiteUrl.error;
      if (bySiteUrl.data) return bySiteUrl.data as Record<string, unknown>;
    }

    // Last-pass fallback for legacy rows that stored full URLs with extra path/query/trailing slash.
    const fuzzy = await supabase
      .from('wedding_sites')
      .select('*')
      .ilike('site_url', `%${slug}%`)
      .limit(20);

    if (fuzzy.error) throw fuzzy.error;
    const match = (fuzzy.data ?? []).find((row) => {
      const candidate = normalizePublicSiteSlug(typeof row.site_url === 'string' ? row.site_url : null);
      return candidate === slug;
    });
    if (match) return match as Record<string, unknown>;

    return null;
  },

  async fetchSections(siteId: string): Promise<PersistedSection[]> {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('site_id', siteId)
      .order('order', { ascending: true });

    if (error) throw error;
    return parseSections(data ?? []);
  },

  async fetchPublishedSections(siteId: string): Promise<PersistedSection[]> {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('site_id', siteId)
      .eq('visible', true)
      .order('order', { ascending: true });

    if (error) throw error;
    return parseSections(data ?? []);
  },

  async upsertSection(section: PersistedSection): Promise<PersistedSection> {
    const { created_at: _ca, updated_at: _ua, ...rest } = section;
    const { data, error } = await supabase
      .from('sections')
      .upsert({ ...rest, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    const parsed = PersistedSectionSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid section data returned from server');
    return parsed.data;
  },

  async upsertSections(siteId: string, sections: BuilderSectionInstance[]): Promise<void> {
    const rows = sections.map(s => builderToPersistedSection(s, siteId));
    const { error } = await supabase
      .from('sections')
      .upsert(rows.map(r => ({ ...r, updated_at: new Date().toISOString() })));

    if (error) throw error;
  },

  async updateSectionData(sectionId: string, data: Record<string, unknown>): Promise<void> {
    const { error } = await supabase
      .from('sections')
      .update({ data, updated_at: new Date().toISOString() })
      .eq('id', sectionId);

    if (error) throw error;
  },

  async updateSectionVisibility(sectionId: string, visible: boolean): Promise<void> {
    const { error } = await supabase
      .from('sections')
      .update({ visible, updated_at: new Date().toISOString() })
      .eq('id', sectionId);

    if (error) throw error;
  },

  async updateSectionVariant(sectionId: string, variant: string): Promise<void> {
    const { error } = await supabase
      .from('sections')
      .update({ variant, updated_at: new Date().toISOString() })
      .eq('id', sectionId);

    if (error) throw error;
  },

  async reorderSections(siteId: string, items: SectionReorderItem[]): Promise<void> {
    const updates = items.map(item =>
      supabase
        .from('sections')
        .update({ order: item.order, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('site_id', siteId)
    );
    const results = await Promise.all(updates);
    const failed = results.find(r => r.error);
    if (failed?.error) throw failed.error;
  },

  async deleteSection(sectionId: string): Promise<void> {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', sectionId);

    if (error) throw error;
  },

  async deleteSectionsForSite(siteId: string): Promise<void> {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('site_id', siteId);

    if (error) throw error;
  },

  async addSection(siteId: string, section: Omit<PersistedSection, 'created_at' | 'updated_at'>): Promise<PersistedSection> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('sections')
      .insert({ ...section, site_id: siteId, created_at: now, updated_at: now })
      .select()
      .single();

    if (error) throw error;
    const parsed = PersistedSectionSchema.safeParse(data);
    if (!parsed.success) throw new Error('Invalid section data returned from server');
    return parsed.data;
  },

  async syncBuilderSections(siteId: string, sections: BuilderSectionInstance[]): Promise<void> {
    await this.deleteSectionsForSite(siteId);
    if (sections.length === 0) return;
    await this.upsertSections(siteId, sections);
  },
};
