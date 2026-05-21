import { describe, expect, it } from 'vitest';

import { SETTINGS_SITE_SELECT_FIELDS } from './settingsSiteSelect';

describe('settings site select', () => {
  it('includes every persisted field hydrated by Settings', () => {
    expect(SETTINGS_SITE_SELECT_FIELDS).toEqual(
      expect.arrayContaining([
        'privacy_mode',
        'hide_from_search',
        'guest_access_token',
        'default_language',
        'notification_prefs',
        'rsvp_custom_questions',
        'rsvp_meal_config',
        'music_playlist_url',
      ]),
    );
  });
});
