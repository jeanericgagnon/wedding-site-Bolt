import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPhotoUploadAccessPayload, mapUploadError, PhotoUpload, safePhotoUploadMessage } from './PhotoUpload';

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

    render(React.createElement(PhotoUpload));

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
});
