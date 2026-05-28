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
    expect(kit.confidenceTitle).toBe('Ready for premium handoff');
    expect(kit.deliveryNote).toMatch(/guest-safe URL everywhere/i);
    expect(kit.focusTitle).toBe('Carry one wedding identity across every handoff');
    expect(kit.bestNextMove).toMatch(/share-now pack|print and planner handoff/i);
    expect(kit.decisionRule).toMatch(/reuse the same identity everywhere/i);
    expect(kit.watchout).toMatch(/channel drift|alternate URLs|old assets/i);
    expect(kit.items.find((item) => item.id === 'public-qr-card')).toMatchObject({
      status: 'ready',
      blockers: [],
    });
    expect(kit.items.find((item) => item.id === 'share-graphic')?.status).toBe('ready');
    expect(kit.warnings).toEqual([]);
    expect(kit.handoffSequence.map((step) => step.status)).toEqual(['current', 'next', 'then']);
    expect(kit.handoffSequence[0]?.title).toMatch(/share|guest-facing/i);
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.readiness).toBe('ready');
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.includes).toContain('Share graphic');
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.nextStep).toMatch(/share graphic first/i);
  });

  it('keeps print assets from looking ready when launch identity inputs are missing', () => {
    const kit = buildWeddingIdentityExportKit({
      coupleNames: '',
      publicSiteUrl: '',
      weddingDate: null,
      venueName: '',
    });

    expect(kit.title).toBe('Your wedding identity export kit');
    expect(kit.confidenceTitle).toBe('Foundation first');
    expect(kit.focusTitle).toBe('Give the kit one trustworthy public URL');
    expect(kit.bestNextMove).toMatch(/Set the clean public URL first|QR and print packs/i);
    expect(kit.decisionRule).toMatch(/Do not print or share QR-led assets/i);
    expect(kit.watchout).toMatch(/broken route|correction/i);
    expect(kit.items.find((item) => item.id === 'details-insert')?.blockers).toEqual([
      'Set a public site URL.',
      'Add a wedding date.',
      'Add a venue name.',
    ]);
    expect(kit.handoffSequence[0]?.title).toMatch(/public site/i);
    expect(kit.handoffSequence[1]?.detail).toMatch(/date|venue|public site/i);
    expect(kit.warnings).toContain('Set a public site URL before printing QR-based assets.');
    expect(kit.quickPacks.find((pack) => pack.id === 'print-table')?.readiness).toBe('needs-info');
    expect(kit.quickPacks.find((pack) => pack.id === 'planner-handoff')?.bestFor).toMatch(/someone else|repeat basics/i);
    expect(kit.quickPacks.find((pack) => pack.id === 'print-table')?.nextStep).toMatch(/Add the date, venue, and public site/i);
  });

  it('keeps the export handoff honest when the public URL exists but the site is not live yet', () => {
    const kit = buildWeddingIdentityExportKit({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      isPublished: false,
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    });

    expect(kit.handoffSequence[0]?.title).toMatch(/live first/i);
    expect(kit.confidenceDetail).toMatch(/last trust step|live publish/i);
    expect(kit.focusTitle).toMatch(/Make the guest-facing site live/i);
    expect(kit.bestNextMove).toMatch(/Publish the guest-facing site first|share and print packs/i);
    expect(kit.decisionRule).toMatch(/publish before you scale/i);
    expect(kit.watchout).toMatch(/polished dead end/i);
    expect(kit.handoffSequence[1]?.title).toMatch(/after the live publish/i);
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.readiness).toBe('ready');
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.nextStep).toMatch(/Publish the live site once/i);
  });

  it('keeps guest-facing export guidance honest when the site is access-restricted', () => {
    const kit = buildWeddingIdentityExportKit({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      isPublished: true,
      privacyMode: 'password_protected',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    });

    expect(kit.warnings).toContain('The site is currently password-protected, so guest-facing packs should only be shared with the right access instructions.');
    expect(kit.deliveryNote).toMatch(/password-protected instructions/i);
    expect(kit.focusTitle).toMatch(/access instructions/i);
    expect(kit.bestNextMove).toMatch(/password-protected instructions first|front-door clarity/i);
    expect(kit.decisionRule).toMatch(/clarity beats aesthetics/i);
    expect(kit.watchout).toMatch(/password-protected instructions/i);
    expect(kit.handoffSequence[0]?.title).toMatch(/access instructions/i);
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.detail).toMatch(/password/i);
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.nextStep).toMatch(/password instructions/i);
  });

  it('does not overclaim broad QR or print readiness for invite-only access', () => {
    const kit = buildWeddingIdentityExportKit({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      isPublished: true,
      privacyMode: 'invite_only',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    });

    expect(kit.confidenceDetail).toMatch(/direct sharing|invite-only guest access/i);
    expect(kit.focusTitle).toMatch(/direct guest sharing|invite-only/i);
    expect(kit.bestNextMove).toMatch(/share invite-only access links directly|planner\/stationer/i);
    expect(kit.decisionRule).toMatch(/do not turn that route into broad reusable QR or print assets/i);
    expect(kit.watchout).toMatch(/generic public-looking QR card|not actually usable/i);
    expect(kit.deliveryNote).toMatch(/direct couple-to-guest sharing/i);
    expect(kit.warnings).toContain('Invite-only guest access links are not safe for broad QR cards, story graphics, or reusable print signage.');
    expect(kit.items.find((item) => item.id === 'public-qr-card')).toMatchObject({
      status: 'needs-info',
      blockers: ['Invite-only links should be shared directly, not printed into broad QR packs.'],
    });
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.readiness).toBe('needs-info');
    expect(kit.quickPacks.find((pack) => pack.id === 'print-table')?.readiness).toBe('needs-info');
    expect(kit.quickPacks.find((pack) => pack.id === 'share-now')?.nextStep).toMatch(/share invite-only guest links directly/i);
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

  it('keeps photo signage on the public wedding hub instead of a generic uploader path', () => {
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
    expect(assets.find((asset) => asset.id === 'photo-upload-sign')).toMatchObject({
      label: 'Photo sharing sign',
      url: 'https://maya-leo.dayof.love',
      instruction: 'Scan for the wedding hub, then open photo sharing from the live guest path.',
    });

    const html = renderWeddingIdentityPrintHtml(assets);
    expect(html).toContain('DayOf wedding identity print pack');
    expect(html).toContain('data:image/svg+xml;charset=utf-8,');
    expect(html).toContain('https://maya-leo.dayof.love/rsvp');
    expect(html).toContain('Scan for the wedding hub, then open photo sharing from the live guest path.');
    expect(html).not.toMatch(/guest_access|service-role|secret/i);
  });

  it('refuses broad QR and print assets for invite-only sites even when the public URL itself looks safe', () => {
    expect(buildWeddingIdentityPrintAssets({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      privacyMode: 'invite_only',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    })).toEqual([]);

    expect(buildWeddingIdentityStoryGraphic({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      privacyMode: 'invite_only',
      weddingDate: '2026-09-12',
      venueName: 'Garden House',
    })).toBeNull();
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

  it('adds an invite-only caution to the planner-facing style kit without leaking tokenized routes', () => {
    const styleKit = buildWeddingIdentityStyleKit({
      coupleNames: 'Maya & Leo',
      publicSiteUrl: 'https://maya-leo.dayof.love',
      privacyMode: 'invite_only',
    });

    expect(styleKit.text).toContain('Invite-only guest access should stay in direct sharing, not reusable QR or print packs.');
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
