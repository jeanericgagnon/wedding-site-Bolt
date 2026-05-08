import { describe, expect, it } from 'vitest';

import {
  getSafePublicGalleryImageUrl,
  sanitizePublicGalleryImages,
  sanitizePublicGalleryText,
} from './publicGallery';

describe('public gallery sanitizers', () => {
  it('allows normal public image urls and rejects unsafe image sources', () => {
    expect(getSafePublicGalleryImageUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
    expect(getSafePublicGalleryImageUrl('javascript:alert(1)')).toBe('');
    expect(getSafePublicGalleryImageUrl('ftp://example.com/photo.jpg')).toBe('');
    expect(getSafePublicGalleryImageUrl('https://image.thum.io/get/width/900/https%3A%2F%2Fexample.com')).toBe('');
  });

  it('hides internal-looking alt and caption text before public rendering', () => {
    expect(sanitizePublicGalleryText('Provider metadata token failed')).toBe('');
    expect(sanitizePublicGalleryText('Google OAuth service_role api-key refresh failed')).toBe('');
    expect(sanitizePublicGalleryText('first dance')).toBe('first dance');
    expect(sanitizePublicGalleryText('Head table flowers')).toBe('Head table flowers');
    expect(sanitizePublicGalleryText('Editorial model pose')).toBe('Editorial model pose');
  });

  it('drops unsafe photos and preserves safe guest-facing image details', () => {
    expect(sanitizePublicGalleryImages([
      { id: 'bad-url', url: 'javascript:alert(1)', alt: 'bad', caption: 'bad' },
      { id: 'bad-copy', url: 'https://example.com/ok.jpg', alt: 'database bucket image', caption: 'Page Not Found' },
      { id: 'good', url: 'https://example.com/good.jpg', alt: 'Ceremony', caption: 'Garden vows' },
    ])).toEqual([
      { id: 'bad-copy', url: 'https://example.com/ok.jpg', alt: 'Gallery photo', caption: '' },
      { id: 'good', url: 'https://example.com/good.jpg', alt: 'Ceremony', caption: 'Garden vows' },
    ]);
  });
});
