import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import PhotoUpload from './PhotoUpload';
import {
  mapPhotoUploadError,
  PHOTO_UPLOAD_ACCESS_LABEL,
  PHOTO_UPLOAD_ACCESS_PLACEHOLDER,
  PHOTO_UPLOAD_MISSING_ACCESS_ERROR,
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
});
