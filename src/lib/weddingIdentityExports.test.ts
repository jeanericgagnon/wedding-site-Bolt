import { describe, expect, it } from 'vitest';
import {
  buildWeddingIdentityExportKit,
  buildWeddingIdentityManifestText,
  buildWeddingIdentityPrintAssets,
  buildWeddingIdentityStoryGraphic,
  buildWeddingIdentityStyleKit,
  getHexContrastRatio,
  isSafePublicQrAssetUrl,
  renderWeddingIdentityPrintHtml,
  renderWeddingIdentityPrintSvg,
  resolveWeddingIdentityPalette,
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

    expect(kit.readyCount).toBe(7);
    expect(kit.items.find((item) => item.id === 'public-qr-card')).toMatchObject({
      status: 'ready',
      blockers: [],
    });
    expect(kit.items.find((item) => item.id === 'share-graphic')?.status).toBe('ready');
    expect(kit.warnings).toEqual([]);
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.readiness).toBe('ready');
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.includes).toContain('Share graphic');
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
    expect(kit.quickPacks.find((pack) => pack.id === 'print-table')?.readiness).toBe('needs-info');
    expect(kit.quickPacks.find((pack) => pack.id === 'planner-handoff')?.bestFor).toMatch(/someone else|repeat basics/i);
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
    expect(html).toContain('data:image/svg+xml;charset=utf-8,');
    expect(html).toContain('https://maya-leo.dayof.love/rsvp');
    expect(html).not.toMatch(/guest_access|service-role|secret/i);
  });

  it('builds a printable SVG sheet for safe public print assets', () => {
    const assets = buildWeddingIdentityPrintAssets({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    });

    const sheet = renderWeddingIdentityPrintSvg(assets);

    expect(sheet?.filename).toBe('dayof-wedding-identity-print-pack.svg');
    expect(sheet?.svg).toContain('<svg');
    expect(sheet?.svg).toContain('Public site QR card');
    expect(sheet?.svg).toContain('https://maya-leo.dayof.love/rsvp');
    expect(sheet?.svg).not.toMatch(/guest_access|invite_token|service-role|secret/i);
  });

  it('builds a downloadable story graphic svg for safe public site URLs', () => {
    const graphic = buildWeddingIdentityStoryGraphic({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
      templateId: 'editorial-impact',
      templateName: 'Editorial Impact',
    });

    expect(graphic?.filename).toBe('dayof-wedding-story-graphic.svg');
    expect(graphic?.svg).toContain('<svg');
    expect(graphic?.svg).toContain('M · L');
    expect(graphic?.svg).toContain('https://maya-leo.dayof.love');
    expect(graphic?.svg).toContain('data:image/svg+xml');
    expect(graphic?.svg).not.toMatch(/token|invite_token|guest_access/i);
  });

  it('keeps long couple and venue names inside a smaller fitted story-graphic type scale', () => {
    const graphic = buildWeddingIdentityStoryGraphic({
      coupleNames: 'Alexandria Montgomery-Smythe & Christopher Benedict Holloway',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      weddingDate: '2026-09-12',
      venueName: 'The Conservatory Ballroom at the Historic Riverside Estate',
      templateId: 'editorial-impact',
      templateName: 'Editorial Impact',
    });

    expect(graphic?.svg).toContain('font-size="38"');
    expect(graphic?.svg).toContain('font-size="24"');
  });

  it('keeps readable text and accent separation across supported identity themes', () => {
    const templateNames = [
      'Editorial Impact',
      'Coastal Breeze',
      'Garden Romance',
      'Playful Weekend',
      'Current site theme',
    ];

    for (const templateName of templateNames) {
      const palette = resolveWeddingIdentityPalette({
        coupleNames: 'Maya & Leo',
        publicSiteUrl: 'https://maya-leo.dayof.love',
        templateName,
      });

      expect(getHexContrastRatio(palette.foreground, palette.background)).toBeGreaterThan(7);
      expect(getHexContrastRatio(palette.foreground, palette.accentSoft)).toBeGreaterThan(8);
      expect(getHexContrastRatio(palette.accent, palette.background)).toBeGreaterThan(2.2);
    }
  });

  it('builds a planner-safe style kit with palette and typography notes', () => {
    const styleKit = buildWeddingIdentityStyleKit({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
      templateId: 'coastal-breeze',
      templateName: 'Coastal Breeze',
      defaultLanguage: 'fr',
    });

    expect(styleKit.filename).toBe('dayof-wedding-identity-style-kit.txt');
    expect(styleKit.text).toContain('Monogram: M · L');
    expect(styleKit.text).toContain('Theme: Coastal Breeze');
    expect(styleKit.text).toContain('Default language: fr');
    expect(styleKit.text).toContain('Background: #eef6f7');
    expect(styleKit.text).not.toMatch(/token|invite_token|guest_access/i);
  });

  it('refuses print assets when the public URL includes private access parameters', () => {
    expect(isSafePublicQrAssetUrl('https://maya-leo.dayof.love?guest_access_token=abc')).toBe(false);
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
    expect(renderWeddingIdentityPrintSvg([
      {
        id: 'public-qr-card',
        label: 'Unsafe',
        sizeLabel: '3 x 2 in',
        title: 'Bad URL',
        subtitle: 'Do not render',
        instruction: 'Unsafe URLs should be dropped.',
        url: 'https://maya-leo.dayof.love?invite_token=abc',
      },
    ])).toBeNull();
    expect(buildWeddingIdentityStoryGraphic({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love?invite_token=abc',
    })).toBeNull();
  });
});
