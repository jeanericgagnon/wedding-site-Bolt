import { describe, expect, it } from 'vitest';

import {
  SETTINGS_COLLAB_COPY_RETRY_ERROR,
  SETTINGS_PASSWORD_SAVE_RETRY_ERROR,
  SETTINGS_SUBSCRIBE_RETRY_ERROR,
  SETTINGS_TEMPLATE_RETRY_ERROR,
  mapSettingsError,
} from './settingsErrorCopy';

describe('mapSettingsError', () => {
  it('keeps the small set of owner-actionable settings errors readable', () => {
    expect(mapSettingsError(new Error('Current password is incorrect.'), 'fallback')).toBe('Current password is incorrect.');
    expect(mapSettingsError(new Error('This invite link is not ready yet.'), 'fallback')).toBe('This invite link is not ready yet.');
  });

  it('masks provider and internal settings failures behind calm owner copy', () => {
    expect(mapSettingsError(new Error('functions/v1/settings provider timeout with token=abc'), SETTINGS_SUBSCRIBE_RETRY_ERROR)).toBe(
      SETTINGS_SUBSCRIBE_RETRY_ERROR,
    );
    expect(mapSettingsError(new Error('Supabase bucket policy denied collaborator token reveal'), SETTINGS_COLLAB_COPY_RETRY_ERROR)).toBe(
      SETTINGS_COLLAB_COPY_RETRY_ERROR,
    );
  });

  it('keeps settings fallback copy calm and actionable', () => {
    expect(SETTINGS_PASSWORD_SAVE_RETRY_ERROR).toBe('Could not update your password right now.');
    expect(SETTINGS_COLLAB_COPY_RETRY_ERROR).toBe('Could not copy that collaborator invite right now.');
    expect(SETTINGS_TEMPLATE_RETRY_ERROR).toBe('Could not change templates right now.');
  });
});
