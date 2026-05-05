import { supabase } from './supabase';

export interface VendorProfile {
  id: string;
  slug: string;
  vendor_name: string;
  descriptor: string | null;
  about: string;
  hero_image_url: string | null;
  image_urls: string[];
  instagram_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  source_payload: Record<string, unknown> | null;
}

export type VendorTemplateId = 'editorial' | 'portfolio' | 'minimal';

export const VENDOR_TEMPLATE_IDS: VendorTemplateId[] = ['editorial', 'portfolio', 'minimal'];

export function normalizeVendorTemplateId(value: unknown): VendorTemplateId {
  return VENDOR_TEMPLATE_IDS.includes(value as VendorTemplateId) ? value as VendorTemplateId : 'editorial';
}

export interface VendorProfileInquiryInput {
  vendor_profile_id: string;
  name: string;
  email: string;
  message: string;
}

export interface VendorProfileInquiry {
  id: string;
  vendor_profile_id: string;
  vendor_name: string;
  vendor_slug: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export interface VendorProfileDraft {
  slug: string;
  vendor_name: string;
  descriptor: string | null;
  about: string;
  hero_image_url: string | null;
  image_urls: string[];
  instagram_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  source_payload: Record<string, unknown>;
}

function normalizeUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).toString();
  } catch {
    return null;
  }
}

function normalizeSlugPart(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeVendorProfile(row: any): VendorProfile {
  return {
    id: row.id,
    slug: row.slug,
    vendor_name: row.vendor_name,
    descriptor: row.descriptor ?? null,
    about: row.about,
    hero_image_url: row.hero_image_url ?? null,
    image_urls: Array.isArray(row.image_urls) ? row.image_urls.filter((item: unknown): item is string => typeof item === 'string') : [],
    instagram_url: row.instagram_url ?? null,
    website_url: row.website_url ?? null,
    contact_email: row.contact_email ?? null,
    source_payload: row.source_payload ?? null,
  };
}

function titleCaseWords(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function buildFallbackVendorProfileDraft(input: { vendorName: string; instagramUrl?: string; websiteUrl?: string }): VendorProfileDraft {
  const vendorName = titleCaseWords(input.vendorName.trim());
  const websiteUrl = normalizeUrl(input.websiteUrl);
  const instagramUrl = normalizeUrl(input.instagramUrl);
  const websiteLabel = websiteUrl ? new URL(websiteUrl).hostname.replace(/^www\./, '') : null;

  return {
    slug: normalizeSlugPart(vendorName),
    vendor_name: vendorName,
    descriptor: websiteLabel ? `${websiteLabel} wedding vendor profile` : 'Wedding vendor profile',
    about: `${vendorName} is ready for a clean public vendor page with core links, a direct inquiry path, and room for polished images as the profile is refined.`,
    hero_image_url: websiteUrl ? `https://image.thum.io/get/width/1200/noanimate/${websiteUrl}` : null,
    image_urls: [],
    instagram_url: instagramUrl,
    website_url: websiteUrl,
    contact_email: null,
    source_payload: {
      sourceLabel: websiteLabel ?? 'manual entry',
      fallbackGenerated: true,
      websiteLabel,
    },
  };
}

export async function generateVendorProfileDraft(input: { vendorName: string; instagramUrl?: string; websiteUrl?: string }) {
  try {
    const { data, error } = await supabase.functions.invoke('vendor-profile-preview', {
      body: input,
    });
    if (error) throw error;
    return data as VendorProfileDraft;
  } catch (error) {
    if (!input.vendorName.trim() || (!input.instagramUrl?.trim() && !input.websiteUrl?.trim())) {
      throw error;
    }
    return buildFallbackVendorProfileDraft(input);
  }
}

export async function createVendorProfile(draft: VendorProfileDraft): Promise<VendorProfile> {
  const baseSlug = normalizeSlugPart(draft.slug || draft.vendor_name) || `vendor-${Date.now()}`;
  const { data: { user } } = await supabase.auth.getUser();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const nextSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`.slice(0, 72);
    const { data, error } = await supabase
      .from('vendor_profiles')
      .insert({ ...draft, slug: nextSlug, created_by: user?.id ?? null })
      .select('*')
      .single();

    if (!error) return normalizeVendorProfile(data);

    const message = (error.message || '').toLowerCase();
    const duplicateSlug = message.includes('vendor_profiles_slug_key') || message.includes('duplicate key') || message.includes('unique');
    if (!duplicateSlug) throw error;
  }

  throw new Error('Could not find an available vendor page URL. Try a slightly different vendor name.');
}

export async function getVendorProfileBySlug(slug: string): Promise<VendorProfile | null> {
  const { data, error } = await supabase
    .from('vendor_profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeVendorProfile(data) : null;
}

export async function submitVendorInquiry(input: VendorProfileInquiryInput): Promise<void> {
  const { error } = await supabase.functions.invoke('vendor-profile-inquiry-submit', {
    body: input,
  });
  if (error) throw error;
}

export async function listMyVendorProfileInquiries(limit = 8): Promise<VendorProfileInquiry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('vendor_profile_inquiries')
    .select('id, vendor_profile_id, name, email, message, created_at, vendor_profiles!inner(vendor_name, slug, created_by)')
    .eq('vendor_profiles.created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    vendor_profile_id: row.vendor_profile_id,
    vendor_name: row.vendor_profiles?.vendor_name ?? 'Vendor',
    vendor_slug: row.vendor_profiles?.slug ?? '',
    name: row.name,
    email: row.email,
    message: row.message,
    created_at: row.created_at,
  }));
}
