import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPhotoUploadAccessPayload, buildPhotoUploadIdentityPayload, mapUploadError, PhotoUpload, safePhotoUploadMessage } from './PhotoUpload';
import * as guestPhotoDemoState from './dashboard/guestPhotos/guestPhotoDemoState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'photo_upload.title': 'Share your photos',
        'photo_upload.default_subtitle': "Upload photos and videos directly to the couple's shared album.",
        'photo_upload.uploading_to': `Uploading to ${params?.site}.dayof.love`,
        'photo_upload.name_label': 'Your name (optional)',
        'photo_upload.name_placeholder': 'Jane Doe',
        'photo_upload.email_label': 'Email (optional)',
        'photo_upload.email_placeholder': 'you@example.com',
        'photo_upload.phone_label': 'Phone (optional)',
        'photo_upload.phone_placeholder': 'For recap updates',
        'photo_upload.send_updates': 'Send me the wedding recap when it is ready.',
        'photo_upload.own_event': 'I want a dayof link for my own event someday.',
        'photo_upload.note_label': 'Note (optional)',
        'photo_upload.note_placeholder': 'A few words for the couple',
        'photo_upload.files_label': 'Files',
        'photo_upload.files_selected': `${params?.count} file(s) selected`,
        'photo_upload.limits': 'Up to 10 files per upload, 30MB per file, 120MB total.',
        'photo_upload.upload_files': 'Upload files',
        'photo_upload.uploading': 'Uploading...',
        'photo_upload.upload_success': `${params?.count} file uploaded.`,
        'photo_upload.upload_partial': `${params?.uploaded} uploaded, ${params?.failed} failed.`,
        'photo_upload.see_recap': 'See the recap',
        'photo_upload.back_hub': 'Back to the hub',
        'photo_upload.create_own': 'Create your own',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('../components/ui/LanguageSwitcher', () => ({
  LanguageSwitcher: () => React.createElement('div', { 'data-testid': 'language-switcher' }),
}));

afterEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('photo upload guest error copy', () => {
  it('packages invite and password artifacts for gated site photo uploads', () => {
    sessionStorage.setItem('dayof_invite_token_ericandkaras', 'stored-invite');
    sessionStorage.setItem('dayof_pw_session_ericandkaras', 'password-session');
    window.history.replaceState({}, '', '/photos/upload?site=ericandkaras&token=current-invite');

    expect(buildPhotoUploadAccessPayload('ericandkaras')).toEqual({
      inviteToken: 'current-invite',
      passwordSession: 'password-session',
    });
  });

  it('maps known upload error codes to guest-safe messages', () => {
    expect(mapUploadError('INVALID_TOKEN')).toBe('This upload link is invalid. Ask the couple for a fresh link.');
    expect(mapUploadError('DRIVE_RECONNECT_REQUIRED')).toBe('Uploads are available here. Please refresh and try again.');
    expect(mapUploadError('UNSUPPORTED_FILE_TYPE')).toBe('Please upload photos or videos only.');
    expect(mapUploadError('FILE_TOO_LARGE')).toBe('Your upload exceeds the allowed limits.');
  });

  it('does not pass raw backend upload errors through to guests', () => {
    expect(safePhotoUploadMessage('storage bucket policy denied token')).toBe('Couldn’t upload that file. Please try again.');
    expect(safePhotoUploadMessage('request failed at functions/v1/photo-upload')).toBe('Couldn’t upload that file. Please try again.');
  });

  it('keeps known guest-safe upload messages', () => {
    expect(safePhotoUploadMessage('This album is closed for uploads.')).toBe('This album is closed for uploads.');
  });

  it('forwards gated access artifacts to the guest prospect opt-in follow-up', () => {
    const source = readFileSync('src/pages/PhotoUpload.tsx', 'utf8');

    expect(source).toContain("const access = siteSlug ? buildPhotoUploadAccessPayload(siteSlug) : null;");
    expect(source).toContain("...(access ?? {}),");
    expect(source).toContain("uploadToken: token.trim() || null,");
    expect(source).toContain('captureGuestInviteTokenFromSearch(siteSlug, params);');
  });

  it('packages guest identity artifacts for invite-scoped photo tracking', () => {
    sessionStorage.setItem('dayof_guest_invite_token_ericandkaras', 'guest-invite');
    window.history.replaceState({}, '', '/photos/upload?site=ericandkaras&invite_token=current-guest-invite');

    expect(buildPhotoUploadIdentityPayload('ericandkaras')).toEqual({
      guestInviteToken: 'current-guest-invite',
    });
  });

  it('tracks direct photo-upload invite views through aggregate guest analytics', () => {
    const source = readFileSync('src/pages/PhotoUpload.tsx', 'utf8');

    expect(source).toContain("trackGuestHubEvent(siteSlug, 'view', '/photos/upload/invite'");
    expect(source).toContain('...buildPhotoUploadAccessPayload(siteSlug)');
    expect(source).toContain('...buildPhotoUploadIdentityPayload(siteSlug)');
  });

  it('routes upload feedback and post-upload CTAs through the shared status panel', () => {
    const source = readFileSync('src/pages/PhotoUpload.tsx', 'utf8');
    const statusPanel = readFileSync('src/pages/PhotoUploadStatusPanel.tsx', 'utf8');

    expect(source).toContain("from './PhotoUploadStatusPanel'");
    expect(source).toContain('<PhotoUploadStatusPanel');
    expect(statusPanel).toContain("href={`/event/${encodeURIComponent(siteSlug)}/recap`}");
    expect(statusPanel).toContain('href="/signup"');
  });

  it('connects the file chooser to upload limits and live selected-file status', () => {
    window.history.pushState({}, '', '/photos/upload?site=ericandkaras');

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(PhotoUpload),
      ),
    );

    const fileInput = screen.getByLabelText('Files');
    expect(fileInput).toHaveAttribute('aria-describedby', 'photo-upload-files-hint photo-upload-status');
    expect(screen.getByText('Up to 10 files per upload, 30MB per file, 120MB total.')).toHaveAttribute('id', 'photo-upload-files-hint');

    fireEvent.change(fileInput, {
      target: {
        files: [new File(['photo'], 'dance-floor.jpg', { type: 'image/jpeg' })],
      },
    });

    expect(screen.getByRole('status')).toHaveTextContent('1 file(s) selected');
  });

  it('uses the local demo upload path for photo memory QA guest video uploads', async () => {
    const appendDemoGuestPhotoUploadsSpy = vi.spyOn(guestPhotoDemoState, 'appendDemoGuestPhotoUploads').mockReturnValue(
      guestPhotoDemoState.buildDefaultDemoGuestPhotoState(),
    );

    const originalFetch = global.fetch;
    global.fetch = vi.fn();
    window.history.pushState({}, '', '/photos/upload?site=alex-jordan-demo&hub=1&invite_token=token-c-2&photoMemoryFlowQa=1');

    render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(PhotoUpload),
      ),
    );

    fireEvent.change(screen.getByLabelText('Your name (optional)'), {
      target: { value: 'Taylor Guest' },
    });
    fireEvent.change(screen.getByLabelText('Email (optional)'), {
      target: { value: 'taylor@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Note (optional)'), {
      target: { value: 'Short welcome toast clip.' },
    });
    fireEvent.change(screen.getByLabelText('Files'), {
      target: {
        files: [new File(['video-bytes'], 'welcome-toast.mp4', { type: 'video/mp4' })],
      },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Upload files' }).closest('form')!);

    await screen.findByText('1 file uploaded.');
    expect(appendDemoGuestPhotoUploadsSpy).toHaveBeenCalledWith({
      siteSlug: 'alex-jordan-demo',
      inviteToken: 'token-c-2',
      guestName: 'Taylor Guest',
      guestEmail: 'taylor@example.com',
      note: 'Short welcome toast clip.',
      files: [
        {
          name: 'welcome-toast.mp4',
          type: 'video/mp4',
          size: 11,
        },
      ],
    });
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/functions/v1/photo-upload'), expect.anything());

    appendDemoGuestPhotoUploadsSpy.mockRestore();
    global.fetch = originalFetch;
  });
});
