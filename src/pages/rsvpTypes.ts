import { isInternalCustomerErrorMessage } from '../lib/customerSafeError';

export const DEMO_RSVP_QUESTIONS_KEY = 'dayof_demo_rsvp_custom_questions_v1';
export const DEMO_RSVP_RESPONSES_KEY = 'dayof_demo_rsvp_responses_v1';
export const DEMO_RSVP_MEAL_KEY = 'dayof_demo_rsvp_meal_config_v1';
export const RSVP_CONTINUITY_EVENT = 'dayof:rsvp-updated';
export const RSVP_CONTINUITY_STORAGE_KEY = 'dayof.rsvp.updatedAt';
export const RSVP_SUBMIT_ERROR_COPY = 'Couldn’t send your RSVP. Please try again.';
export const RSVP_LOOKUP_ERROR_COPY = 'Invitation not recognized. Please use the private RSVP link or code from your invitation.';
const RSVP_INTERNAL_SENTINEL_ERROR_COPY = /\b(configuration|missing-config|failed\s*to\s*submit)\b/i;

export function normalizeRsvpGuestError(message?: string | null, fallback = RSVP_LOOKUP_ERROR_COPY) {
  const cleaned = String(message ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned || RSVP_INTERNAL_SENTINEL_ERROR_COPY.test(cleaned) || isInternalCustomerErrorMessage(cleaned)) return fallback;
  return cleaned;
}

export function normalizeRsvpSubmitError(message?: string | null) {
  if (!message || message === 'Failed to submit RSVP. Please try again.') {
    return RSVP_SUBMIT_ERROR_COPY;
  }
  return normalizeRsvpGuestError(message, RSVP_SUBMIT_ERROR_COPY);
}

export interface Guest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  plus_one_allowed: boolean;
  children_allowed?: boolean | null;
  max_children?: number | null;
  max_additional_guests?: number | null;
  invited_to_ceremony: boolean;
  invited_to_reception: boolean;
}

export interface ExistingRSVP {
  id: string;
  attending: boolean;
  attending_ceremony?: boolean | null;
  attending_reception?: boolean | null;
  guest_ids?: string[] | null;
  meal_choice: string | null;
  plus_one_name: string | null;
  plus_one_count?: number | null;
  children_count?: number | null;
  notes: string | null;
  custom_answers?: Record<string, string | string[]> | null;
}

export interface HouseholdGuest {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  invited_to_ceremony?: boolean;
  invited_to_reception?: boolean;
}

export interface RSVPMealConfig {
  enabled: boolean;
  options: string[];
}

export interface RSVPQuestion {
  id: string;
  label: string;
  question_text?: string;
  type: 'short_text' | 'long_text' | 'single_choice' | 'multi_choice';
  required?: boolean;
  options?: string[];
  appliesTo?: 'all' | 'ceremony' | 'reception';
}

export interface LookupResponse {
  guest: Guest | null;
  existingRsvp: ExistingRSVP | null;
  guests: Guest[] | null;
  siteSlug?: string | null;
  rsvpDeadline: string | null;
  rsvpQuestions?: RSVPQuestion[] | null;
  rsvpMealConfig?: RSVPMealConfig | null;
  musicPlaylistUrl?: string | null;
  householdGuests?: HouseholdGuest[] | null;
  rsvpSession?: string | null;
}

export const DEFAULT_MEAL_CONFIG: RSVPMealConfig = {
  enabled: true,
  options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'],
};
