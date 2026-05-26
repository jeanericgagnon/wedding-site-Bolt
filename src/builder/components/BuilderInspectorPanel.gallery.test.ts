import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSectionAnchorPath,
  normalizeGalleryImages,
  resolveSectionAnchorId,
  sanitizeSectionAnchorId,
} from './BuilderInspectorPanel';

describe('builder inspector anchor copy', () => {
  it('uses the shared copy/download fallback instead of silent raw clipboard writes', () => {
    const source = readFileSync(join(process.cwd(), 'src/builder/components/BuilderInspectorPanel.tsx'), 'utf8');

    expect(source).toContain("import { copyTextOrDownload } from '../../lib/copyText';");
    expect(source).toContain('const handleCopySectionAnchor = async () => {');
    expect(source).toContain("const result = await copyTextOrDownload(copyText, 'dayof-section-anchor-link.txt');");
    expect(source).toContain("dispatch(builderActions.setError('Couldn’t copy that section link right now.'));");
    expect(source).toContain("'Downloaded'");
    expect(source).not.toContain('navigator.clipboard?.writeText');
  });

  it('keeps advanced anchor controls behind an explicit disclosure in the default content flow', () => {
    const source = readFileSync(join(process.cwd(), 'src/builder/components/BuilderInspectorPanel.tsx'), 'utf8');

    expect(source).toContain('const [showSectionLinkTools, setShowSectionLinkTools] = React.useState(false);');
    expect(source).toContain('Most sections can use the page link as-is. Open advanced link settings only if you need a custom anchor.');
    expect(source).toContain("showSectionLinkTools ? 'Hide advanced link settings' : 'Show advanced link settings'");
    expect(source).toContain('{showSectionLinkTools ? (');
  });
});

describe('normalizeGalleryImages', () => {
  it('unwraps provenance-wrapped gallery arrays before rendering the inspector', () => {
    const image = { id: 'img-1', url: 'https://example.com/photo.jpg', alt: 'Couple', caption: 'Weekend' };

    expect(normalizeGalleryImages({
      value: [image],
      source: 'user-edited',
      updatedAt: '2026-05-03T00:00:00.000Z',
    })).toEqual([image]);
  });

  it('falls back to an empty array when persisted gallery images are malformed', () => {
    expect(normalizeGalleryImages({ value: { id: 'not-an-array' } })).toEqual([]);
    expect(normalizeGalleryImages(null)).toEqual([]);
  });
});

describe('sanitizeSectionAnchorId', () => {
  it('keeps readable section anchors URL-safe', () => {
    expect(sanitizeSectionAnchorId(' Registry Gifts! ')).toBe('registry-gifts');
    expect(sanitizeSectionAnchorId('Travel_Info')).toBe('travel_info');
  });
});

describe('buildSectionAnchorPath', () => {
  it('uses the root public site path for home page anchors', () => {
    expect(buildSectionAnchorPath('maya-leo', { slug: 'home', meta: { isHome: true } }, 'Our Story')).toBe('/site/maya-leo#our-story');
    expect(buildSectionAnchorPath(' maya-leo ', { slug: 'home', meta: { isHome: true } }, 'Our Story')).toBe('/site/maya-leo#our-story');
  });

  it('uses the dedicated public page path for non-home page anchors', () => {
    expect(buildSectionAnchorPath('maya-leo', { slug: 'travel', meta: { isHome: false } }, 'Hotel Block')).toBe('/site/maya-leo/travel#hotel-block');
  });

  it('normalizes imported page slugs before building dedicated page anchor paths', () => {
    expect(buildSectionAnchorPath('maya-leo', { id: 'travel-page', slug: 'Travel Info!', meta: { isHome: false } }, 'Hotel Block')).toBe('/site/maya-leo/travel-info#hotel-block');
  });

  it('unwraps builder value page slugs before building dedicated page anchor paths', () => {
    expect(buildSectionAnchorPath(
      'maya-leo',
      {
        id: 'travel-page',
        slug: { value: 'Guest Travel!', source: 'user-edited' },
        meta: { isHome: false },
      },
      'Hotel Block',
    )).toBe('/site/maya-leo/guest-travel#hotel-block');
  });

  it('falls back to a local hash before the site slug exists', () => {
    expect(buildSectionAnchorPath(null, { slug: 'travel', meta: { isHome: false } }, 'Hotel Block')).toBe('#hotel-block');
  });

  it('does not advertise redundant dedicated-page anchors or hidden page anchors', () => {
    expect(buildSectionAnchorPath('maya-leo', { slug: 'travel', meta: { isHome: false } }, 'Travel')).toBeNull();
    expect(buildSectionAnchorPath('maya-leo', { slug: 'after-party', meta: { isHome: false, isHidden: true } }, 'After Party')).toBeNull();
  });
});

describe('resolveSectionAnchorId', () => {
  it('prefers explicit anchors, then default guest task anchors, then the section id', () => {
    expect(resolveSectionAnchorId({
      id: 'section-rsvp',
      type: 'rsvp',
      settings: { anchorId: 'Guest Reply' },
    })).toBe('guest-reply');

    expect(resolveSectionAnchorId({
      id: 'section-travel',
      type: 'travel',
      settings: {},
    })).toBe('travel');

    expect(resolveSectionAnchorId({
      id: 'section-story',
      type: 'story',
      settings: {},
    })).toBe('section-story');
  });
});
