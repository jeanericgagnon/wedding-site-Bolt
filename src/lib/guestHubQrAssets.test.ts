import { describe, expect, it } from 'vitest';
import { buildGuestHubQrAssets, buildQrImageUrl, isSafePublicQrAssetUrl, renderGuestHubQrPrintHtml } from './guestHubQrAssets';

describe('guestHubQrAssets', () => {
  it('builds a printable public guest hub asset pack', () => {
    const assets = buildGuestHubQrAssets({
      hubUrl: 'https://dayof.love/event/maya-and-leo',
      coupleLabel: 'Maya & Leo',
      actionSummary: 'RSVP, schedule, photo upload, and guestbook',
    });

    expect(assets.map((asset) => asset.kind)).toEqual(['welcome-sign', 'table-card', 'invite-insert', 'photo-prompt']);
    expect(assets[0]).toMatchObject({
      title: 'Maya & Leo',
      instruction: 'Scan for RSVP, schedule, photo upload, and guestbook.',
    });
  });

  it('blocks token-like urls from printable public assets', () => {
    expect(isSafePublicQrAssetUrl('https://dayof.love/event/maya-and-leo?token=secret')).toBe(false);
    expect(isSafePublicQrAssetUrl('https://dayof.love/event/maya-and-leo?invite_token=secret')).toBe(false);
    expect(isSafePublicQrAssetUrl('https://dayof.love/event/maya-and-leo?passwordSession=secret')).toBe(false);
    expect(isSafePublicQrAssetUrl('https://dayof.love/event/maya-and-leo?auth=bearer')).toBe(false);
    expect(isSafePublicQrAssetUrl('https://dayof.love/event/maya-and-leo?cookie=session')).toBe(false);
    expect(isSafePublicQrAssetUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isSafePublicQrAssetUrl('https://user:pass@dayof.love/event/maya-and-leo')).toBe(false);
    expect(isSafePublicQrAssetUrl('https://example.test/event/maya-and-leo')).toBe(false);
    expect(isSafePublicQrAssetUrl('javascript:alert(1)')).toBe(false);
    expect(buildGuestHubQrAssets({
      hubUrl: 'https://dayof.love/event/maya-and-leo?secureToken=secret',
      coupleLabel: 'Maya',
      actionSummary: 'RSVP',
    })).toEqual([]);
  });

  it('renders escaped print html with qr image urls', () => {
    const assets = buildGuestHubQrAssets({
      hubUrl: 'https://dayof.love/event/maya-and-leo',
      coupleLabel: '<Maya>',
      actionSummary: 'RSVP & photos',
      includePhotoPrompt: false,
    });
    const html = renderGuestHubQrPrintHtml(assets);

    expect(html).toContain('&lt;Maya&gt;');
    expect(html).toContain(buildQrImageUrl('https://dayof.love/event/maya-and-leo', 420).replace(/&/g, '&amp;'));
    expect(html).not.toContain('<Maya>');
    expect(html).not.toContain('photo-prompt');
  });
});
