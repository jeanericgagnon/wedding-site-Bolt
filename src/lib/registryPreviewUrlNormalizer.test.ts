import { describe, expect, it } from 'vitest';
import {
  isPublicPreviewResourceUrl,
  isSameProduct,
  normalizeUrl,
} from '../../supabase/functions/registry-preview/urlNormalizer';

describe('registry preview URL normalizer SSRF guard', () => {
  it.each([
    ['localhost', 'http://localhost/product'],
    ['localhost subdomain', 'https://shop.localhost/product'],
    ['local mDNS', 'https://printer.local/product'],
    ['internal host', 'https://registry.internal/product'],
    ['invalid reserved host', 'https://proof.invalid/product'],
    ['example reserved host', 'https://registry.example/product'],
    ['test host', 'https://example.test/product'],
    ['metadata host', 'http://metadata.google.internal/computeMetadata/v1/'],
    ['AWS metadata IP', 'http://169.254.169.254/latest/meta-data/'],
    ['loopback IPv4', 'http://127.0.0.1/product'],
    ['decimal loopback IPv4', 'http://2130706433/product'],
    ['hex loopback IPv4', 'http://0x7f000001/product'],
    ['short loopback IPv4', 'http://127.1/product'],
    ['private class A', 'http://10.0.0.4/product'],
    ['private class B', 'http://172.16.4.9/product'],
    ['private class C', 'http://192.168.1.2/product'],
    ['carrier grade NAT', 'http://100.64.0.1/product'],
    ['documentation range', 'http://192.0.2.4/product'],
    ['benchmark range', 'http://198.18.0.1/product'],
    ['multicast range', 'http://224.0.0.1/product'],
    ['IPv6 loopback', 'http://[::1]/product'],
    ['IPv4-mapped IPv6 loopback', 'http://[::ffff:127.0.0.1]/product'],
    ['credentialed URL', 'https://user:pass@example.com/product'],
    ['javascript URL', 'javascript:alert(1)'],
    ['file URL', 'file:///etc/passwd'],
  ])('blocks %s', (_label, url) => {
    expect(() => normalizeUrl(url)).toThrow('Enter a public product URL.');
  });

  it('keeps public product URLs canonical while removing tracking-only parameters', () => {
    const normalized = normalizeUrl(
      'https://www.target.com/p/greenpan-rio-advanced-8-ceramic/-/A-95024971?utm_source=mail&color=blue#reviews',
    );

    expect(normalized).toMatchObject({
      canonical: 'https://target.com/p/-/A-95024971?color=blue',
      hostname: 'target.com',
      pathname: '/p/-/A-95024971',
      retailer: 'target',
      metadata: { tcin: '95024971' },
    });
  });

  it('still deduplicates retailer product URLs after canonicalization', () => {
    expect(
      isSameProduct(
        'https://www.amazon.com/gp/product/B07XYZ1234?tag=affiliate',
        'https://amazon.com/dp/B07XYZ1234?utm_campaign=tracking',
      ),
    ).toBe(true);
  });

  it.each([
    ['plain public image', 'https://cdn.example.com/product.jpg'],
    ['existing public image proxy', 'https://images.weserv.nl/?url=cdn.example.com/product.jpg&w=1200'],
    ['existing public image proxy with scheme', 'https://images.weserv.nl/?url=https%3A%2F%2Fcdn.example.com%2Fproduct.jpg&w=1200'],
  ])('allows %s resource URLs', (_label, url) => {
    expect(isPublicPreviewResourceUrl(url)).toBe(true);
  });

  it.each([
    ['metadata IP image', 'http://169.254.169.254/latest/meta-data/'],
    ['invalid reserved image host', 'https://cdn.invalid/product.jpg'],
    ['example reserved image host', 'https://cdn.example/product.jpg'],
    ['credentialed image', 'https://user:pass@cdn.example.com/product.jpg'],
    ['non-web image scheme', 'file:///etc/passwd'],
    ['private image behind proxy', 'https://images.weserv.nl/?url=169.254.169.254/latest/meta-data/&w=1200'],
    ['credentialed image behind proxy', 'https://images.weserv.nl/?url=https%3A%2F%2Fuser%3Apass%40cdn.example.com%2Fproduct.jpg&w=1200'],
    [
      'over-nested image proxy',
      'https://images.weserv.nl/?url=images.weserv.nl%2F%3Furl%3Dimages.weserv.nl%252F%253Furl%253Dcdn.example.com%252Fproduct.jpg',
    ],
  ])('blocks %s resource URLs', (_label, url) => {
    expect(isPublicPreviewResourceUrl(url)).toBe(false);
  });
});
