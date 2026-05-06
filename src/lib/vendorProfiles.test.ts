import { describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    functions: { invoke },
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  },
}));

describe('vendor profile draft fallback safety', () => {
  it('does not synthesize third-party screenshot images when preview generation falls back', async () => {
    invoke.mockRejectedValueOnce(new Error('preview unavailable'));
    const { generateVendorProfileDraft } = await import('./vendorProfiles');

    const draft = await generateVendorProfileDraft({
      vendorName: '  acme photo  ',
      websiteUrl: 'example.com/profile#team',
      instagramUrl: 'instagram.com/acmephoto',
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
});
