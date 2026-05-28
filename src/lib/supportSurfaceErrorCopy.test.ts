import { describe, expect, it } from 'vitest';

import {
  BUILDER_CUTOVER_OPEN_RETRY_ERROR,
  GUEST_PHOTO_CREATE_BUCKET_RETRY_ERROR,
  GUEST_PHOTO_SHARING_LOAD_RETRY_ERROR,
  OVERVIEW_BRIEF_REFRESH_RETRY_ERROR,
  mapSupportSurfaceError,
} from './supportSurfaceErrorCopy';

describe('supportSurfaceErrorCopy', () => {
  it('masks provider and backend errors behind calm support-surface copy', () => {
    expect(mapSupportSurfaceError(new Error('openai provider timeout with token=abc'), OVERVIEW_BRIEF_REFRESH_RETRY_ERROR)).toBe(
      OVERVIEW_BRIEF_REFRESH_RETRY_ERROR,
    );
    expect(mapSupportSurfaceError(new Error('Supabase row-level security policy denied photo bucket insert'), GUEST_PHOTO_CREATE_BUCKET_RETRY_ERROR)).toBe(
      GUEST_PHOTO_CREATE_BUCKET_RETRY_ERROR,
    );
    expect(mapSupportSurfaceError(new Error('google-drive-auth-start provider timeout'), BUILDER_CUTOVER_OPEN_RETRY_ERROR)).toBe(
      BUILDER_CUTOVER_OPEN_RETRY_ERROR,
    );
  });

  it('uses the fallback when no readable message is available', () => {
    expect(mapSupportSurfaceError(null, GUEST_PHOTO_SHARING_LOAD_RETRY_ERROR)).toBe(
      GUEST_PHOTO_SHARING_LOAD_RETRY_ERROR,
    );
  });

  it('keeps support-surface recovery copy calm and customer-safe', () => {
    expect(OVERVIEW_BRIEF_REFRESH_RETRY_ERROR).toBe('Could not refresh your draft from the saved brief right now.');
    expect(GUEST_PHOTO_SHARING_LOAD_RETRY_ERROR).toBe('Could not load photo sharing right now.');
    expect(GUEST_PHOTO_CREATE_BUCKET_RETRY_ERROR).toBe('Could not create that photo bucket right now.');
  });
});
