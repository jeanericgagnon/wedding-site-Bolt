import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('guest photo query bounds', () => {
  it('caps guest photo event and album hydration', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/GuestPhotoSharing.tsx'), 'utf8');

    expect(source).toContain('export const MAX_GUEST_PHOTO_EVENTS = 200;');
    expect(source).toContain('export const MAX_GUEST_PHOTO_ALBUMS = 500;');
    expect(source).toContain(".order('start_time', { ascending: true })\n          .limit(MAX_GUEST_PHOTO_EVENTS),");
    expect(source).toContain(".order('created_at', { ascending: false })\n          .limit(MAX_GUEST_PHOTO_ALBUMS),");
    expect(source).toContain(".order('uploaded_at', { ascending: false })\n          .limit(200),");
  });
});
