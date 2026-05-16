export const RSVP_CAMPAIGN_LOG_KEY = 'dayof_rsvp_campaign_log_v1';
export const RSVP_FOLLOWUP_TASKS_KEY = 'dayof_rsvp_followup_tasks_v1';
export const RSVP_CAMPAIGN_PRESET_KEY = 'dayof_rsvp_campaign_preset_v1';
export const RSVP_SAVED_SEGMENTS_KEY = 'dayof_rsvp_saved_segments_v1';
export const DEMO_RSVP_CUSTOM_QUESTIONS_KEY = 'dayof_demo_rsvp_custom_questions_v1';
export const DEMO_RSVP_MEAL_CONFIG_KEY = 'dayof_demo_rsvp_meal_config_v1';
export const DEMO_RSVP_ACCESS_CONFIG_KEY = 'dayof_demo_rsvp_access_config_v1';

export interface Guest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  preferred_language?: string | null;
  plus_one_allowed: boolean;
  plus_one_name: string | null;
  invited_to_ceremony: boolean;
  invited_to_reception: boolean;
  invite_token: string | null;
  rsvp_status: string;
  rsvp_received_at: string | null;
  checked_in_at?: string | null;
  checkin_notes?: string | null;
  thank_you_sent_at?: string | null;
  thank_you_notes?: string | null;
  household_id: string | null;
}

export interface RSVP {
  attending: boolean;
  attending_ceremony?: boolean | null;
  attending_reception?: boolean | null;
  meal_choice: string | null;
  plus_one_name: string | null;
  plus_one_count?: number | null;
  children_count?: number | null;
  notes: string | null;
  custom_answers?: Record<string, string | string[]> | null;
}

export interface GuestWithRSVP extends Guest {
  rsvp?: RSVP;
  notes?: string | null;
  invited_event_ids?: string[] | null;
}

export interface GuestAuditEntry {
  id: string;
  guest_id?: string;
  action: 'insert' | 'update' | 'delete';
  changed_at: string;
  changed_by: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

export interface RsvpConflict {
  id: string;
  guest_id: string;
  conflict_code: string;
  message: string;
  severity: 'error' | 'warning' | string;
  created_at: string;
  resolved: boolean;
  resolved_at?: string | null;
}

export interface RsvpConflictStats {
  openNow: number;
  opened24h: number;
  resolved24h: number;
  unresolvedOver24h: number;
  unresolvedOver72h: number;
  topCodes: Array<{ code: string; count: number }>;
}

export interface WeddingSiteInfo {
  id: string;
  couple_name_1: string;
  couple_name_2: string;
  is_published: boolean;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  site_url: string | null;
  site_slug: string | null;
}

export interface RSVPQuestionSetting {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'single_choice' | 'multi_choice';
  required: boolean;
  appliesTo: 'all' | 'ceremony' | 'reception';
  options?: string[];
}

export interface ItineraryEvent {
  id: string;
  event_name: string;
  event_date: string | null;
  start_time: string | null;
  location_name: string | null;
}
