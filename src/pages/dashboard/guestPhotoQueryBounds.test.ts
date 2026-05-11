import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest photo query bounds', () => {
  it('caps guest photo event and album hydration', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotos/useGuestPhotoDashboardData.ts'), 'utf8');
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/GuestPhotoSharing.tsx'), 'utf8');
    const serviceSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/guestPhotoSharingService.ts'), 'utf8');

    expect(source).toContain('const snapshot = await loadGuestPhotoDashboardSnapshot(userId).catch((err) => {');
    expect(page).toContain('useGuestPhotoDashboardData({');
    expect(serviceSource).toContain('export const MAX_GUEST_PHOTO_EVENTS = 200;');
    expect(serviceSource).toContain('export const MAX_GUEST_PHOTO_ALBUMS = 500;');
    expect(serviceSource).toContain('export const MAX_GUEST_PHOTO_UPLOADS = 200;');
    expect(serviceSource).toContain('export const MAX_GUEST_PHOTO_GUESTBOOK_ENTRIES = 50;');
    expect(serviceSource).toContain('export const MAX_GUEST_PHOTO_PROSPECTS = 200;');
    expect(serviceSource).toContain('export const MAX_GUEST_PHOTO_ANALYSES = 250;');
    expect(serviceSource).toContain('export const MAX_GUEST_PHOTO_METADATA_ROWS = 250;');
    expect(serviceSource).toContain('export const MAX_GUEST_PHOTO_BUCKET_CORRECTIONS = 100;');
    expect(serviceSource).toContain(".order('start_time', { ascending: true })\n      .limit(MAX_GUEST_PHOTO_EVENTS),");
    expect(serviceSource).toContain(".order('created_at', { ascending: false })\n      .limit(MAX_GUEST_PHOTO_ALBUMS),");
    expect(serviceSource).toContain(".order('uploaded_at', { ascending: false })\n      .limit(MAX_GUEST_PHOTO_UPLOADS),");
    expect(serviceSource).toContain(".order('created_at', { ascending: false })\n      .limit(MAX_GUEST_PHOTO_GUESTBOOK_ENTRIES),");
    expect(serviceSource).toContain(".order('created_at', { ascending: false })\n      .limit(MAX_GUEST_PHOTO_PROSPECTS),");
    expect(serviceSource).toContain(".order('analyzed_at', { ascending: false })\n      .limit(MAX_GUEST_PHOTO_ANALYSES),");
    expect(serviceSource).toContain(".eq('wedding_site_id', site.id)\n      .limit(MAX_GUEST_PHOTO_METADATA_ROWS),");
    expect(serviceSource).toContain(".order('created_at', { ascending: false })\n      .limit(MAX_GUEST_PHOTO_BUCKET_CORRECTIONS),");
  });
});
