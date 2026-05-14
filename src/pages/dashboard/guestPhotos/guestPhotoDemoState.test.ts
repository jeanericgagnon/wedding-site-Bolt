import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendDemoGuestPhotoUploads,
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

  it('appends local QA guest uploads, including video analysis metadata, into the persisted demo state', () => {
    const base = buildDefaultDemoGuestPhotoState();
    writeDemoGuestPhotoState(base);

    appendDemoGuestPhotoUploads({
      siteSlug: 'alex-jordan-demo',
      inviteToken: 'token-c-2',
      guestName: 'Taylor Guest',
      guestEmail: 'taylor@example.com',
      note: 'Short welcome toast clip.',
      files: [
        {
          name: 'welcome-toast.mp4',
          type: 'video/mp4',
          size: 5843200,
        },
      ],
    });

    const snapshot = readDemoGuestPhotoState();
    const upload = snapshot.uploads.find((entry) => entry.original_filename === 'welcome-toast.mp4');
    expect(upload).toMatchObject({
      photo_album_id: 'demo-photo-album-reception',
      guest_name: 'Taylor Guest',
      guest_email: 'taylor@example.com',
      note: 'Short welcome toast clip.',
      mime_type: 'video/mp4',
      size_bytes: 5843200,
    });
    expect(snapshot.uploadAnalyses.find((entry) => entry.upload_id === upload?.id)).toMatchObject({
      is_video: true,
      suggested_bucket_name: 'Reception',
      caption: 'Short welcome toast clip.',
    });
    expect(snapshot.uploadMetadata.find((entry) => entry.upload_id === upload?.id)).toMatchObject({
      event_match_id: 'reception-id',
      width: 1920,
      height: 1080,
    });
  });
});
