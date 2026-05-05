import { describe, expect, it } from 'vitest';

import { sanitizePublicSectionDataDeep } from './publicSectionDataSanitizer';

describe('sanitizePublicSectionDataDeep', () => {
  it('drops unsafe public image values while preserving safe local and web images', () => {
    const result = sanitizePublicSectionDataDeep({
      heroImageUrl: 'javascript:alert(1)',
      backgroundImage: '/preview-photos/header-anchor.jpg',
      photos: [
        'https://image.thum.io/get/https://example.com/private',
        '/preview-photos/gallery.jpg',
        {
          url: 'https://example.com/photo.jpg',
          alt: 'Dinner toast',
        },
      ],
      nested: {
        thumbnailUrl: 'ftp://example.com/thumb.jpg',
        portrait: 'https://example.com/portrait.jpg',
      },
    });

    expect(result).toMatchObject({
      heroImageUrl: '',
      backgroundImage: '/preview-photos/header-anchor.jpg',
      photos: [
        '',
        '/preview-photos/gallery.jpg',
        {
          url: 'https://example.com/photo.jpg',
          alt: 'Dinner toast',
        },
      ],
      nested: {
        thumbnailUrl: '',
        portrait: 'https://example.com/portrait.jpg',
      },
    });
  });

  it('drops unsafe public link values while preserving anchors, local routes, and web URLs', () => {
    const result = sanitizePublicSectionDataDeep({
      ctaHref: 'javascript:alert(1)',
      rsvpUrl: '#rsvp',
      viewAllUrl: '/site/alex-jordan#registry',
      websiteLink: 'https://example.com/details',
      cashFundUrl: 'ftp://example.com/fund',
      title: 'javascript:alert(1) is text here',
    });

    expect(result).toMatchObject({
      ctaHref: '',
      rsvpUrl: '#rsvp',
      viewAllUrl: '/site/alex-jordan#registry',
      websiteLink: 'https://example.com/details',
      cashFundUrl: '',
      title: 'javascript:alert(1) is text here',
    });
  });
});
