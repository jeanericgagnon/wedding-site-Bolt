import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildDefaultDemoGuestPhotoState,
  DEMO_GUEST_PHOTO_STATE_STORAGE_KEY,
  readDemoGuestPhotoState,
  writeDemoGuestPhotoState,
} from './guestPhotoDemoState';

describe('guestPhotoDemoState', () => {
  beforeEach(() => {
    window.localStorage.removeItem(DEMO_GUEST_PHOTO_STATE_STORAGE_KEY);
  });

  it('returns a seeded memory-flow-ready demo state by default', () => {
    const snapshot = readDemoGuestPhotoState();
    expect(snapshot.siteSlug).toBe('alex-jordan-demo');
    expect(snapshot.uploads.some((upload) => upload.mime_type === 'video/mp4')).toBe(true);
    expect(snapshot.hubSettings.recap_status).toBe('private_link');
    expect(snapshot.guestProspects.length).toBeGreaterThan(0);
  });

  it('round-trips saved demo recap settings and upload moderation state', () => {
    const base = buildDefaultDemoGuestPhotoState();
    writeDemoGuestPhotoState({
      ...base,
      hubSettings: {
        ...base.hubSettings,
        recap_status: 'published',
      },
      uploads: base.uploads.map((upload) => (
        upload.id === 'demo-photo-upload-4'
          ? { ...upload, recap_featured: true }
          : upload
      )),
    });

    const snapshot = readDemoGuestPhotoState();
    expect(snapshot.hubSettings.recap_status).toBe('published');
    expect(snapshot.uploads.find((upload) => upload.id === 'demo-photo-upload-4')?.recap_featured).toBe(true);
  });
});
