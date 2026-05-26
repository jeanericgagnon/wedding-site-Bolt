export const SETTINGS_SITE_SELECT_FIELDS = [
  'id',
  'couple_name_1',
  'couple_name_2',
  'active_template_id',
  'site_slug',
  'wedding_date',
  'venue_name',
  'privacy_mode',
  'hide_from_search',
  'guest_access_token',
  'default_language',
  'notification_prefs',
  'rsvp_custom_questions',
  'rsvp_meal_config',
  'music_playlist_url',
] as const;

export const SETTINGS_SITE_SELECT = SETTINGS_SITE_SELECT_FIELDS.join(', ');
