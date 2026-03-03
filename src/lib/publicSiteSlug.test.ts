import { describe, expect, it } from 'vitest';
import { buildSiteUrlLookupCandidates, normalizePublicSiteSlug, resolvePublicSiteSlugFromRow } from './publicSiteSlug';

describe('normalizePublicSiteSlug', () => {
  it('keeps plain slugs', () => {
    expect(normalizePublicSiteSlug('alex-jordan-demo')).toBe('alex-jordan-demo');
  });

  it('extracts slug from /site route paths', () => {
    expect(normalizePublicSiteSlug('/site/alex-jordan-demo')).toBe('alex-jordan-demo');
  });

  it('extracts slug from full dayof url', () => {
    expect(normalizePublicSiteSlug('https://alex-jordan-demo.dayof.love')).toBe('alex-jordan-demo');
  });

  it('returns null for apex dayof host', () => {
    expect(normalizePublicSiteSlug('https://dayof.love')).toBeNull();
  });
});

describe('buildSiteUrlLookupCandidates', () => {
  it('builds exact match candidates for legacy site_url rows', () => {
    expect(buildSiteUrlLookupCandidates('alex-jordan-demo')).toEqual([
      'alex-jordan-demo.dayof.love',
      'https://alex-jordan-demo.dayof.love',
      'http://alex-jordan-demo.dayof.love',
      'https://www.alex-jordan-demo.dayof.love',
      'http://www.alex-jordan-demo.dayof.love',
    ]);
  });
});

describe('resolvePublicSiteSlugFromRow', () => {
  it('prefers site_slug when present', () => {
    expect(resolvePublicSiteSlugFromRow({ site_slug: 'alex-jordan-demo', site_url: 'wrong.dayof.love' })).toBe('alex-jordan-demo');
  });

  it('falls back to site_url when site_slug missing', () => {
    expect(resolvePublicSiteSlugFromRow({ site_slug: null, site_url: 'https://alex-jordan-demo.dayof.love' })).toBe('alex-jordan-demo');
  });
});
