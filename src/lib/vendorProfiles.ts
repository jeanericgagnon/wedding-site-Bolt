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

export interface VendorProfileInquiryInput {
  vendor_profile_id: string;
  name: string;
  email: string;
  message: string;
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

function normalizeSlugPart(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeVendorProfile(row: Record<string, unknown>): VendorProfile {
  return {
    id: typeof row.id === 'string' ? row.id : '',
    slug: typeof row.slug === 'string' ? row.slug : '',
    vendor_name: typeof row.vendor_name === 'string' ? row.vendor_name : '',
    descriptor: typeof row.descriptor === 'string' ? row.descriptor : null,
    about: typeof row.about === 'string' ? row.about : '',
    hero_image_url: typeof row.hero_image_url === 'string' ? row.hero_image_url : null,
    image_urls: Array.isArray(row.image_urls) ? row.image_urls.filter((item: unknown): item is string => typeof item === 'string') : [],
    instagram_url: typeof row.instagram_url === 'string' ? row.instagram_url : null,
    website_url: typeof row.website_url === 'string' ? row.website_url : null,
    contact_email: typeof row.contact_email === 'string' ? row.contact_email : null,
    source_payload: row.source_payload && typeof row.source_payload === 'object'
      ? row.source_payload as Record<string, unknown>
      : null,
  };
}

export async function generateVendorProfileDraft(input: { vendorName: string; instagramUrl?: string; websiteUrl?: string }) {
  const { data, error } = await supabase.functions.invoke('vendor-profile-preview', {
    body: input,
  });
  if (error) throw error;
  return data as VendorProfileDraft;
}

export async function createVendorProfile(draft: VendorProfileDraft): Promise<VendorProfile> {
  const baseSlug = normalizeSlugPart(draft.slug || draft.vendor_name) || `vendor-${Date.now()}`;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const nextSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`.slice(0, 72);
    const { data, error } = await supabase
      .from('vendor_profiles')
      .insert({ ...draft, slug: nextSlug })
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
  const { error } = await supabase.from('vendor_profile_inquiries').insert(input);
  if (error) throw error;
}
