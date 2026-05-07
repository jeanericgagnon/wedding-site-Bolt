import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest photo query bounds', () => {
  it('caps guest photo event and album hydration', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/GuestPhotoSharing.tsx'), 'utf8');

    expect(source).toContain('export const MAX_GUEST_PHOTO_EVENTS = 200;');
    expect(source).toContain('export const MAX_GUEST_PHOTO_ALBUMS = 500;');
    expect(source).toContain('export const MAX_GUEST_PHOTO_UPLOADS = 200;');
    expect(source).toContain('export const MAX_GUEST_PHOTO_GUESTBOOK_ENTRIES = 50;');
    expect(source).toContain('export const MAX_GUEST_PHOTO_PROSPECTS = 200;');
    expect(source).toContain('export const MAX_GUEST_PHOTO_ANALYSES = 250;');
    expect(source).toContain('export const MAX_GUEST_PHOTO_METADATA_ROWS = 250;');
    expect(source).toContain('export const MAX_GUEST_PHOTO_BUCKET_CORRECTIONS = 100;');
    expect(source).toContain(".order('start_time', { ascending: true })\n          .limit(MAX_GUEST_PHOTO_EVENTS),");
    expect(source).toContain(".order('created_at', { ascending: false })\n          .limit(MAX_GUEST_PHOTO_ALBUMS),");
    expect(source).toContain(".order('uploaded_at', { ascending: false })\n          .limit(MAX_GUEST_PHOTO_UPLOADS),");
    expect(source).toContain(".order('created_at', { ascending: false })\n        .limit(MAX_GUEST_PHOTO_GUESTBOOK_ENTRIES);");
    expect(source).toContain(".order('created_at', { ascending: false })\n        .limit(MAX_GUEST_PHOTO_PROSPECTS);");
    expect(source).toContain(".order('analyzed_at', { ascending: false })\n        .limit(MAX_GUEST_PHOTO_ANALYSES);");
    expect(source).toContain(".eq('wedding_site_id', site.id)\n        .limit(MAX_GUEST_PHOTO_METADATA_ROWS);");
    expect(source).toContain(".order('created_at', { ascending: false })\n        .limit(MAX_GUEST_PHOTO_BUCKET_CORRECTIONS);");
  });
});
