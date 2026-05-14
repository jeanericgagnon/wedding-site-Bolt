export interface Message {
  id: string;
  subject: string;
  body: string;
  sent_at: string | null;
  scheduled_for: string | null;
  status: string;
  channel: string;
  recipient_filter: Record<string, unknown> | null;
  audience_filter?: string | null;
  recipient_count?: number | null;
  delivered_count?: number | null;
  failed_count?: number | null;
}

export interface Guest {
  id: string;
  email: string | null;
  phone?: string | null;
  sms_consent?: boolean | null;
  preferred_language?: string | null;
  rsvp_status: string;
  invitation_sent_at?: string | null;
  reminder_last_sent_at?: string | null;
  mailing_address_line1?: string | null;
  mailing_city?: string | null;
  mailing_state?: string | null;
  mailing_postal_code?: string | null;
  meal_choice?: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string;
}

export interface WeddingSite {
  id: string;
  site_slug?: string | null;
  default_language?: string | null;
  couple_first_name: string | null;
  couple_second_name: string | null;
  couple_email: string | null;
  venue_name?: string | null;
  wedding_date?: string | null;
  sms_credits_balance?: number;
}

export interface SmsCreditTransaction {
  id: string;
  credits_delta: number;
  reason: string;
  created_at: string;
  expires_at?: string | null;
  remaining_credits?: number | null;
}

export interface AudienceOption {
  value: string;
  label: string;
  count: number;
  detail?: string;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface DeliveryRow {
  id: string;
  message_id: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  provider_message_id: string | null;
  error_message: string | null;
  attempted_at: string | null;
  delivered_at: string | null;
  recipient_email: string;
  recipient_name?: string | null;
}

export type ChannelType = 'email' | 'sms';

export const DELIVERY_ACTIVE_STATUSES = ['queued', 'sending', 'sent', 'partial', 'failed'] as const;
export const DELIVERY_COMPLETED_STATUSES = ['sent', 'partial', 'failed'] as const;
export const EMAIL_CAP_CONSUMING_STATUSES = ['queued', 'sent', 'partial'] as const;

export type MessageTemplateKey =
  | 'blank'
  | 'save-the-date'
  | 'rsvp-reminder'
  | 'event-reminder'
  | 'day-of-update'
  | 'photo-request'
  | 'thank-you';

export interface ComposerTemplate {
  key: MessageTemplateKey;
  label: string;
  detail: string;
  campaignType?: string;
  defaultChannel: ChannelType;
  build: (input: {
    audienceLabel: string | null;
    venue: string | null;
    weddingDate: string | null;
    applyTemplateVariables: (text: string) => string;
  }) => { subject: string; body: string };
}

export interface SavedComposerTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channel: ChannelType;
  audience: string;
  campaignName: string;
  scheduleType?: 'now' | 'later';
  scheduleDate?: string;
  scheduleTime?: string;
  createdAt: string;
  updatedAt?: string;
}

export const SAVED_COMPOSER_TEMPLATES_STORAGE_KEY = 'dayof.savedComposerTemplates.v1';
