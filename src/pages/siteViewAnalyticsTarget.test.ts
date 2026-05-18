import { describe, expect, it } from 'vitest';
import { resolveSiteViewAnalyticsTarget } from './siteViewAnalyticsTarget';

describe('resolveSiteViewAnalyticsTarget', () => {
  it('classifies QR and invite entry separately from ordinary public site visits', () => {
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('entry=qr'))).toBe('/site/qr');
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('token=private-invite'))).toBe('/site/invite');
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('invite_token=guest-invite'))).toBe('/site/invite');
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('passwordSession=session-1'))).toBe('/site/invite');
    expect(resolveSiteViewAnalyticsTarget(new URLSearchParams('lang=es'))).toBe('/site');
  });
});
