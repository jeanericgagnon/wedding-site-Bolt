import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('registry preview SSRF proof script', () => {
  it('keeps the live hostile-target matrix aligned with the local SSRF guard lane', () => {
    const script = readFileSync('scripts/v1-proof-registry-preview-ssrf.mjs', 'utf8');

    expect(script).toContain("['aws-metadata-ip', 'http://169.254.169.254/latest/meta-data/']");
    expect(script).toContain("['gcp-metadata-host', 'http://metadata.google.internal/computeMetadata/v1/']");
    expect(script).toContain("['localhost-name', 'http://localhost:54321/product']");
    expect(script).toContain("['localhost-subdomain', 'http://shop.localhost/product']");
    expect(script).toContain("['dot-local-host', 'http://printer.local/product']");
    expect(script).toContain("['dot-internal-host', 'http://admin.internal/product']");
    expect(script).toContain("['dot-invalid-host', 'https://proof.invalid/product']");
    expect(script).toContain("['dot-example-host', 'https://registry.example/product']");
    expect(script).toContain("['dot-test-host', 'http://shop.test/product']");
    expect(script).toContain("['loopback-ipv4', 'http://127.0.0.1:8080/product']");
    expect(script).toContain("['decimal-loopback-ipv4', 'http://2130706433/product']");
    expect(script).toContain("['hex-loopback-ipv4', 'http://0x7f000001/product']");
    expect(script).toContain("['short-loopback-ipv4', 'http://127.1/product']");
    expect(script).toContain("['zero-network-ipv4', 'http://0.0.0.0/product']");
    expect(script).toContain("['private-class-a', 'http://10.0.0.4/product']");
    expect(script).toContain("['private-class-b', 'http://172.16.4.9/product']");
    expect(script).toContain("['private-class-c', 'http://192.168.1.2/product']");
    expect(script).toContain("['carrier-grade-nat', 'http://100.64.1.2/product']");
    expect(script).toContain("['link-local-ipv4', 'http://169.254.10.20/product']");
    expect(script).toContain("['documentation-ipv4', 'http://192.0.2.20/product']");
    expect(script).toContain("['benchmark-ipv4', 'http://198.18.1.1/product']");
    expect(script).toContain("['multicast-ipv4', 'http://224.0.0.1/product']");
    expect(script).toContain("['ipv6-loopback', 'http://[::1]/product']");
    expect(script).toContain("['ipv4-mapped-ipv6-loopback', 'http://[::ffff:127.0.0.1]/product']");
    expect(script).toContain("['credentialed-url', 'https://user:pass@example.com/product']");
    expect(script).toContain("['non-http-scheme', 'file:///etc/passwd']");
    expect(script).toContain('V1_REGISTRY_PREVIEW_AUTH_TOKEN or V1_OWNER_EMAIL/V1_OWNER_PASSWORD');
    expect(script).toContain("const signInUrl = new URL('/auth/v1/token', env.supabaseUrl);");
    expect(script).toContain("authMode: 'owner_password_signin'");
    expect(script).toContain('Live authenticated registry-preview SSRF matrix is ready but requires either a disposable bearer token or reusable owner proof credentials.');
  });
});
