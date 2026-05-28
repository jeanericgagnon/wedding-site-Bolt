import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PhotoUpload from './PhotoUpload';
import {
  mapPhotoUploadError,
  mapPhotoUploadRuntimeError,
  PHOTO_UPLOAD_ACCESS_LABEL,
  PHOTO_UPLOAD_ACCESS_PLACEHOLDER,
  PHOTO_UPLOAD_MISSING_ACCESS_ERROR,
  PHOTO_UPLOAD_RETRY_ERROR,
  PHOTO_UPLOAD_UNAVAILABLE_ERROR,
} from './photoUploadCopy';

vi.mock('../components/guest/GuestJourneyCompanion', () => ({
  GuestJourneyCompanion: () => null,
}));

describe('PhotoUpload guest-safe copy', () => {
  it('uses access-code language instead of token language for manual upload entry', () => {
    window.history.replaceState({}, '', '/photos/upload');

    render(<PhotoUpload />);

    expect(screen.getByLabelText(PHOTO_UPLOAD_ACCESS_LABEL)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(PHOTO_UPLOAD_ACCESS_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByText(/upload token/i)).not.toBeInTheDocument();
  });

  it('still asks for the access code when a site slug is present without invite access', () => {
    window.history.replaceState({}, '', '/photos/upload?site=maya-leo');

    render(<PhotoUpload />);

    expect(screen.getByText('Uploading to maya-leo.dayof.love')).toBeInTheDocument();
    expect(screen.getByLabelText(PHOTO_UPLOAD_ACCESS_LABEL)).toBeInTheDocument();
    expect(screen.queryByText(/upload token/i)).not.toBeInTheDocument();
  });

  it('hides the access-code field when the invitation link already carries upload access', () => {
    window.history.replaceState({}, '', '/photos/upload?site=maya-leo&invite_token=invite-123');

    render(<PhotoUpload />);

    expect(screen.queryByLabelText(PHOTO_UPLOAD_ACCESS_LABEL)).not.toBeInTheDocument();
  });

  it('keeps the missing access-code error guest-facing and calm', () => {
    expect(PHOTO_UPLOAD_MISSING_ACCESS_ERROR).toBe('An upload access code is required.');
  });

  it('keeps unavailable uploads guest-safe instead of naming internal config', () => {
    expect(PHOTO_UPLOAD_UNAVAILABLE_ERROR).toBe('Photo uploads are unavailable right now. Please try again soon.');
    expect(PHOTO_UPLOAD_UNAVAILABLE_ERROR).not.toMatch(/supabase/i);
  });

  it('maps invalid upload links to guest-safe guidance', () => {
    expect(mapPhotoUploadError('INVALID_TOKEN')).toBe('This upload link is invalid. Ask the couple for a fresh link.');
  });

  it('keeps runtime upload failures guest-safe instead of echoing internal fetch details', () => {
    expect(mapPhotoUploadRuntimeError(new Error('Supabase storage bucket policy denied upload'))).toBe(
      PHOTO_UPLOAD_RETRY_ERROR,
    );
  });

  it('keeps failed files selected after a partial upload so guests can retry them', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        uploaded: [{ name: 'party.jpg' }],
        failed: [{ name: 'dance.mp4' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.replaceState({}, '', '/photos/upload?invite_token=invite-123&site=maya-leo');

    render(<PhotoUpload />);

    const fileInput = screen.getByLabelText('Files') as HTMLInputElement;
    const files = [
      new File(['one'], 'party.jpg', { type: 'image/jpeg' }),
      new File(['two'], 'dance.mp4', { type: 'video/mp4' }),
    ];
    fireEvent.change(fileInput, { target: { files } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload files' }));

    await screen.findByText('Uploaded 1 file(s), 1 failed. Failed files stayed selected so you can retry them.');
    expect(screen.getByText('Failed files are still selected so you can retry right away.')).toBeInTheDocument();
    expect(screen.getByText('1 file(s) selected')).toBeInTheDocument();
    expect(screen.getByText('dance.mp4')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('lets guests clear success state and start another upload with Upload more', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        uploaded: [{ name: 'party.jpg' }],
        failed: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    window.history.replaceState({}, '', '/photos/upload?invite_token=invite-123&site=maya-leo');

    render(<PhotoUpload />);

    const fileInput = screen.getByLabelText('Files') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['one'], 'party.jpg', { type: 'image/jpeg' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload files' }));

    await screen.findByText('Uploaded 1 file(s). Thank you!');
    fireEvent.click(screen.getByRole('button', { name: 'Upload more' }));

    await waitFor(() => {
      expect(screen.queryByText('Uploaded 1 file(s). Thank you!')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('party.jpg')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload more' })).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
