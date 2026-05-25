import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const invoke = vi.fn();
const getUser = vi.fn();
const from = vi.fn();
const rpc = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: { invoke },
    auth: { getUser },
    from,
    rpc,
  },
}));

describe('vendor profile draft fallback safety', () => {
  beforeEach(() => {
    invoke.mockReset();
    getUser.mockReset();
    from.mockReset();
    rpc.mockReset();
  });

  it('does not synthesize third-party screenshot images when preview generation falls back', async () => {
    invoke.mockRejectedValueOnce(new Error('preview unavailable'));
    const { generateVendorProfileDraft } = await import('./vendorProfiles');

    const draft = await generateVendorProfileDraft({
      vendorName: '  acme photo  ',
      websiteUrl: 'example.com/profile#team',
      instagramUrl: '@acmephoto',
    });

    expect(draft).toMatchObject({
      vendor_name: 'Acme Photo',
      hero_image_url: null,
      image_urls: [],
      website_url: 'https://example.com/profile',
      instagram_url: 'https://instagram.com/acmephoto',
    });
    expect(JSON.stringify(draft)).not.toContain('image.thum.io');
  });

  it.each([
    ['credentialed website', 'https://user:pass@example.com/profile'],
    ['local website', 'http://localhost/profile'],
    ['metadata website', 'http://169.254.169.254/latest/meta-data'],
    ['invalid reserved website', 'https://proof.invalid/profile'],
    ['example reserved website', 'https://studio.example/profile'],
    ['javascript website', 'javascript:alert(1)'],
  ])('drops unsafe %s URLs from fallback drafts', async (_label, websiteUrl) => {
    invoke.mockRejectedValueOnce(new Error('preview unavailable'));
    const { generateVendorProfileDraft } = await import('./vendorProfiles');

    const draft = await generateVendorProfileDraft({
      vendorName: 'Acme Photo',
      websiteUrl,
      instagramUrl: 'https://user:pass@instagram.com/acmephoto',
    });

    expect(draft.website_url).toBeNull();
    expect(draft.instagram_url).toBeNull();
    expect(draft.hero_image_url).toBeNull();
  });

  it('sanitizes generated drafts again before inserting vendor profiles', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        id: 'vendor-1',
        slug: 'acme-photo',
        vendor_name: 'Acme Photo',
        descriptor: null,
        about: 'About',
        hero_image_url: null,
        image_urls: ['https://cdn.example.com/gallery.jpg'],
        instagram_url: null,
        website_url: null,
        contact_email: null,
        source_payload: {},
      },
      error: null,
    });

    const { createVendorProfile } = await import('./vendorProfiles');
    await createVendorProfile({
      slug: 'acme-photo',
      vendor_name: 'Acme Photo',
      descriptor: null,
      about: 'About',
      hero_image_url: 'https://image.thum.io/get/width/1200/noanimate/https://example.com',
      image_urls: ['javascript:alert(1)', 'https://cdn.example.com/gallery.jpg'],
      instagram_url: 'https://evil.example.com/acmephoto',
      website_url: 'http://169.254.169.254/latest/meta-data',
      contact_email: '<script>@example.com',
      source_payload: {},
    });

    expect(rpc).toHaveBeenCalledWith('vendor_profile_write', {
      p_payload: expect.objectContaining({
        slug: 'acme-photo',
        hero_image_url: null,
        image_urls: ['https://cdn.example.com/gallery.jpg'],
        instagram_url: null,
        website_url: null,
        contact_email: null,
      }),
    });
  });

  it('keeps vendor profile write migrations storing image_urls as jsonb payloads', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260524181721_fix_vendor_profile_write_image_urls_jsonb.sql'),
      'utf8',
    );

    expect(migration).toContain("coalesce(p_payload->'image_urls', '[]'::jsonb)");
    expect(migration).not.toContain("jsonb_array_elements_text(coalesce(p_payload->'image_urls', '[]'::jsonb))");
    expect(migration).not.toContain("array[]::text[]");
  });

  it('keeps the expected modern-events sample slug reachable before any database read', async () => {
    const { getSampleVendorProfileBySlug, getVendorProfileBySlug } = await import('./vendorProfiles');

    const sample = getSampleVendorProfileBySlug('modern-events');
    expect(sample).toMatchObject({
      id: 'sample-modern-events',
      slug: 'modern-events',
      vendor_name: 'Modern Events',
    });

    const resolved = await getVendorProfileBySlug('modern-events');
    expect(resolved).toMatchObject({
      id: 'sample-modern-events',
      slug: 'modern-events',
      vendor_name: 'Modern Events',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('keeps the expected everlight public sample slug reachable before any database read', async () => {
    const { getSampleVendorProfileBySlug, getVendorProfileBySlug } = await import('./vendorProfiles');

    const sample = getSampleVendorProfileBySlug('everlight');
    expect(sample).toMatchObject({
      id: 'sample-everlight',
      slug: 'everlight',
      vendor_name: 'Everlight Studio',
    });

    const resolved = await getVendorProfileBySlug('everlight');
    expect(resolved).toMatchObject({
      id: 'sample-everlight',
      slug: 'everlight',
      vendor_name: 'Everlight Studio',
    });
    expect(from).not.toHaveBeenCalled();
  });
});
