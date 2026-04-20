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

export async function generateVendorProfileDraft(input: { vendorName: string; instagramUrl?: string; websiteUrl?: string }) {
  const { data, error } = await supabase.functions.invoke('vendor-profile-preview', {
    body: input,
  });
  if (error) throw error;
  return data as VendorProfileDraft;
}

export async function createVendorProfile(draft: VendorProfileDraft): Promise<VendorProfile> {
  const { data, error } = await supabase
    .from('vendor_profiles')
    .insert(draft)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeVendorProfile(data);
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
