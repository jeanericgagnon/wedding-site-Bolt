import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const getUser = vi.fn();
const from = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: { invoke },
    auth: { getUser },
    from,
  },
}));

describe('vendor profile draft fallback safety', () => {
  beforeEach(() => {
    invoke.mockReset();
    getUser.mockReset();
    from.mockReset();
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
    getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } });
    const single = vi.fn(async () => ({
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
    }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    from.mockReturnValueOnce({ insert });

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

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      hero_image_url: null,
      image_urls: ['https://cdn.example.com/gallery.jpg'],
      instagram_url: null,
      website_url: null,
      contact_email: null,
      created_by: 'user-1',
    }));
  });
});
