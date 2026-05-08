import { describe, expect, it } from 'vitest';

import {
  getSafePublicEmailHref,
  getSafePublicActionHref,
  getSafePublicImageUrl,
  getSafePublicInstagramHashtagUrl,
  getSafePublicInstagramUrl,
  getSafePublicMapsEmbedUrl,
  getSafePublicMapsUrl,
  getSafePublicTelHref,
  getSafePublicVideoEmbedUrl,
  getSafePublicWebUrl,
} from './publicLinks';

describe('public link helpers', () => {
  it('allows only public web URLs for guest-facing external links', () => {
    expect(getSafePublicWebUrl('https://example.com/stay')).toBe('https://example.com/stay');
    expect(getSafePublicWebUrl('http://example.com/stay')).toBe('http://example.com/stay');
    expect(getSafePublicWebUrl('#')).toBe('');
    expect(getSafePublicWebUrl('javascript:alert(1)')).toBe('');
    expect(getSafePublicWebUrl('ftp://example.com/stay')).toBe('');
    expect(getSafePublicWebUrl('https://user:pass@example.com/stay')).toBe('');
    expect(getSafePublicWebUrl('http://localhost/stay')).toBe('');
    expect(getSafePublicWebUrl('http://169.254.169.254/latest/meta-data')).toBe('');
    expect(getSafePublicWebUrl('https://example.test/stay')).toBe('');
    expect(getSafePublicWebUrl('https://service.invalid/stay')).toBe('');
    expect(getSafePublicWebUrl('https://registry.example/stay')).toBe('');
    expect(getSafePublicWebUrl('not a url')).toBe('');
  });

  it('allows safe public action hrefs without allowing script-style links', () => {
    expect(getSafePublicActionHref('#rsvp')).toBe('#rsvp');
    expect(getSafePublicActionHref('/site/alex-jordan')).toBe('/site/alex-jordan');
    expect(getSafePublicActionHref('https://example.com/details')).toBe('https://example.com/details');
    expect(getSafePublicActionHref('javascript:alert(1)', '#')).toBe('#');
    expect(getSafePublicActionHref('//example.com/phish', '#')).toBe('#');
    expect(getSafePublicActionHref('/\\evil', '#')).toBe('#');
  });

  it('falls back to a generated maps link when an explicit map URL is unsafe', () => {
    expect(getSafePublicMapsUrl('https://maps.google.com/?q=City Hall, SF', 'Fallback')).toBe(
      'https://maps.google.com/?q=City%20Hall%2C%20SF',
    );
    expect(getSafePublicMapsUrl('https://evil.example.com/embed', 'Rosewood Estate, Napa')).toBe(
      'https://maps.google.com/?q=Rosewood%20Estate%2C%20Napa',
    );
    expect(getSafePublicMapsUrl('javascript:alert(1)', 'Rosewood Estate, Napa')).toBe(
      'https://maps.google.com/?q=Rosewood%20Estate%2C%20Napa',
    );
    expect(getSafePublicMapsUrl('', '')).toBe('');
  });

  it('builds safe Google Maps embed URLs without trusting arbitrary iframe sources', () => {
    expect(getSafePublicMapsEmbedUrl('', 'Rosewood Estate, Napa')).toBe(
      'https://www.google.com/maps?q=Rosewood%20Estate%2C%20Napa&output=embed',
    );
    expect(getSafePublicMapsEmbedUrl('https://maps.google.com/?q=City Hall, SF', 'Fallback')).toBe(
      'https://www.google.com/maps?q=City%20Hall%2C%20SF&output=embed',
    );
    expect(getSafePublicMapsEmbedUrl('https://evil.example.com/embed', 'Rosewood')).toBe(
      'https://www.google.com/maps?q=Rosewood&output=embed',
    );
    expect(getSafePublicMapsEmbedUrl('javascript:alert(1)', '"><script>alert(1)</script>')).toBe(
      'https://www.google.com/maps?q=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E&output=embed',
    );
    expect(getSafePublicMapsEmbedUrl('', '')).toBe('');
  });

  it('allows only safe public image URLs', () => {
    const dataImage = 'data:image/png;base64,abc123';

    expect(getSafePublicImageUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
    expect(getSafePublicImageUrl('/preview-photos/header-anchor.jpg')).toBe('/preview-photos/header-anchor.jpg');
    expect(getSafePublicImageUrl(dataImage)).toBe(dataImage);
    expect(getSafePublicImageUrl('data:image/svg+xml;utf8,<svg></svg>')).toBe('');
    expect(getSafePublicImageUrl('https://image.thum.io/get/width/900/https%3A%2F%2Fexample.com')).toBe('');
    expect(getSafePublicImageUrl('javascript:alert(1)')).toBe('');
    expect(getSafePublicImageUrl('//example.com/photo.jpg')).toBe('');
    expect(getSafePublicImageUrl('/\\evil.jpg')).toBe('');
    expect(getSafePublicImageUrl('ftp://example.com/photo.jpg')).toBe('');
    expect(getSafePublicImageUrl('https://user:pass@example.com/photo.jpg')).toBe('');
    expect(getSafePublicImageUrl('http://169.254.169.254/photo.jpg')).toBe('');
    expect(getSafePublicImageUrl('https://service.invalid/photo.jpg')).toBe('');
    expect(getSafePublicImageUrl('not a url')).toBe('');
  });

  it('builds safe public email and phone hrefs', () => {
    expect(getSafePublicEmailHref('alex@example.com', 'Wedding logistics')).toBe(
      'mailto:alex@example.com?subject=Wedding%20logistics',
    );
    expect(getSafePublicEmailHref('bad@example.com?bcc=secret@example.com', 'Hi')).toBe('');
    expect(getSafePublicEmailHref('not an email', 'Hi')).toBe('');

    expect(getSafePublicTelHref('+1 (212) 555-0102')).toBe('tel:+12125550102');
    expect(getSafePublicTelHref('555')).toBe('');
    expect(getSafePublicTelHref('javascript:alert(1)')).toBe('');
  });

  it('builds safe public Instagram URLs', () => {
    expect(getSafePublicInstagramUrl('@dayof.love')).toBe('https://instagram.com/dayof.love');
    expect(getSafePublicInstagramUrl('https://www.instagram.com/dayof.love/')).toBe('https://instagram.com/dayof.love');
    expect(getSafePublicInstagramUrl('https://user:pass@instagram.com/dayof.love')).toBe('');
    expect(getSafePublicInstagramUrl('https://example.com/dayof.love')).toBe('');
    expect(getSafePublicInstagramUrl('../bad')).toBe('');
  });

  it('builds safe public Instagram hashtag URLs', () => {
    expect(getSafePublicInstagramHashtagUrl('#AlexAndJordan')).toBe(
      'https://www.instagram.com/explore/tags/AlexAndJordan/',
    );
    expect(getSafePublicInstagramHashtagUrl('alex_jordan_2026')).toBe(
      'https://www.instagram.com/explore/tags/alex_jordan_2026/',
    );
    expect(getSafePublicInstagramHashtagUrl('../bad')).toBe('');
    expect(getSafePublicInstagramHashtagUrl('wedding/bcc')).toBe('');
    expect(getSafePublicInstagramHashtagUrl('')).toBe('');
  });

  it('builds host-aware safe public video embed URLs', () => {
    expect(getSafePublicVideoEmbedUrl('https://www.youtube.com/watch?v=abcDEF123_4', 'youtube', true)).toBe(
      'https://www.youtube.com/embed/abcDEF123_4?autoplay=1&rel=0',
    );
    expect(getSafePublicVideoEmbedUrl('https://youtu.be/abcDEF123_4', 'youtube')).toBe(
      'https://www.youtube.com/embed/abcDEF123_4?autoplay=0&rel=0',
    );
    expect(getSafePublicVideoEmbedUrl('https://vimeo.com/123456789', 'vimeo')).toBe(
      'https://player.vimeo.com/video/123456789?autoplay=0',
    );
    expect(getSafePublicVideoEmbedUrl('https://cdn.example.com/wedding.mp4', 'direct')).toBe(
      'https://cdn.example.com/wedding.mp4',
    );
    expect(getSafePublicVideoEmbedUrl('https://example.com/watch?v=abcDEF123_4', 'youtube')).toBe('');
    expect(getSafePublicVideoEmbedUrl('javascript:alert(1)', 'direct')).toBe('');
  });
});
