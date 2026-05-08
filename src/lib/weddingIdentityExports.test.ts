import { describe, expect, it } from 'vitest';
import {
  buildWeddingIdentityExportKit,
  buildWeddingIdentityManifestText,
  buildWeddingIdentityPrintAssets,
  renderWeddingIdentityPrintHtml,
} from './weddingIdentityExports';

describe('weddingIdentityExports', () => {
  it('marks core QR-based print assets ready when the public URL exists', () => {
    const kit = buildWeddingIdentityExportKit({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
      templateName: 'Editorial Garden',
      defaultLanguage: 'en',
    });

    expect(kit.readyCount).toBe(6);
    expect(kit.items.find((item) => item.id === 'public-qr-card')).toMatchObject({
      status: 'ready',
      blockers: [],
    });
    expect(kit.items.find((item) => item.id === 'share-graphic')?.status).toBe('planned');
    expect(kit.warnings).toEqual([]);
  });

  it('keeps print assets from looking ready when launch identity inputs are missing', () => {
    const kit = buildWeddingIdentityExportKit({
      coupleNames: '',
      publicSiteUrl: '',
      weddingDate: null,
      venueName: '',
    });

    expect(kit.title).toBe('Your wedding identity export kit');
    expect(kit.items.find((item) => item.id === 'details-insert')?.blockers).toEqual([
      'Set a public site URL.',
      'Add a wedding date.',
      'Add a venue name.',
    ]);
    expect(kit.warnings).toContain('Set a public site URL before printing QR-based assets.');
  });

  it('builds a planner-safe manifest without private guest access tokens', () => {
    const kit = buildWeddingIdentityExportKit({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
      templateName: 'Editorial Garden',
      defaultLanguage: 'es',
    });

    const manifest = buildWeddingIdentityManifestText(kit);

    expect(manifest).toContain('Public site: https://maya-leo.dayof.love');
    expect(manifest).toContain('Default language: es');
    expect(manifest).not.toMatch(/token|guest_access|secret|service-role/i);
  });

  it('does not mark private query URLs ready or echo them into the manifest', () => {
    const kit = buildWeddingIdentityExportKit({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love?passwordSession=secret',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    });

    expect(kit.items.find((item) => item.id === 'public-qr-card')).toMatchObject({
      status: 'needs-info',
      blockers: ['Set a public site URL.'],
    });
    expect(buildWeddingIdentityManifestText(kit)).toContain('Public site: Not set');
    expect(buildWeddingIdentityManifestText(kit)).not.toContain('passwordSession=secret');
  });

  it('builds deterministic public print assets with QR URLs for site, RSVP, and photo upload', () => {
    const assets = buildWeddingIdentityPrintAssets({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    });

    expect(assets.map((asset) => asset.id)).toEqual([
      'public-qr-card',
      'details-insert',
      'rsvp-card',
      'photo-upload-sign',
      'table-card',
    ]);
    expect(assets.find((asset) => asset.id === 'rsvp-card')?.url).toBe('https://maya-leo.dayof.love/rsvp');
    expect(assets.find((asset) => asset.id === 'photo-upload-sign')?.url).toBe('https://maya-leo.dayof.love/photos/upload');

    const html = renderWeddingIdentityPrintHtml(assets);
    expect(html).toContain('DayOf wedding identity print pack');
    expect(html).toContain('api.qrserver.com');
    expect(html).toContain(encodeURIComponent('https://maya-leo.dayof.love/rsvp'));
    expect(html).not.toMatch(/guest_access|service-role|secret/i);
  });

  it('refuses print assets when the public URL includes private access parameters', () => {
    expect(buildWeddingIdentityPrintAssets({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love?guest_access_token=abc',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    })).toEqual([]);

    const html = renderWeddingIdentityPrintHtml([
      {
        id: 'public-qr-card',
        label: 'Unsafe',
        sizeLabel: '3 x 2 in',
        title: '<script>alert(1)</script>',
        subtitle: 'Bad URL',
        instruction: 'Do not render unsafe URLs.',
        url: 'https://maya-leo.dayof.love?invite_token=abc',
      },
    ]);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('invite_token=abc');
  });
});
