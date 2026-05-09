import { describe, expect, it } from 'vitest';
import {
  rewriteSignedMediaUrlsToPublicDeep,
  sanitizeSignedMediaUrl,
  sanitizeSignedMediaUrlsDeep,
  toSupabasePublicMediaUrl,
} from './mediaUrl';

describe('mediaUrl', () => {
  it('rewrites valid Supabase signed media URLs to public URLs without token query text', () => {
    expect(
      toSupabasePublicMediaUrl(
        'https://project.supabase.co/storage/v1/object/sign/photos/couple.jpg?token=secret#preview'
      )
    ).toBe('https://project.supabase.co/storage/v1/object/public/photos/couple.jpg');
  });

  it('drops malformed signed media URL strings instead of preserving signed text', () => {
    expect(toSupabasePublicMediaUrl('/storage/v1/object/sign/photos/couple.jpg?token=secret')).toBe('');
    expect(
      rewriteSignedMediaUrlsToPublicDeep({
        hero: '/storage/v1/object/sign/photos/couple.jpg?token=secret',
        caption: 'First look',
      })
    ).toEqual({
      hero: '',
      caption: 'First look',
    });
  });

  it('sanitizes signed media URLs deeply while preserving ordinary strings', () => {
    expect(
      sanitizeSignedMediaUrlsDeep({
        gallery: [
          'https://project.supabase.co/storage/v1/object/sign/photos/private.jpg?token=secret',
          'https://cdn.example.com/photos/public.jpg',
        ],
      })
    ).toEqual({
      gallery: ['', 'https://cdn.example.com/photos/public.jpg'],
    });
    expect(sanitizeSignedMediaUrl('https://cdn.example.com/photos/public.jpg')).toBe(
      'https://cdn.example.com/photos/public.jpg'
    );
  });
});
