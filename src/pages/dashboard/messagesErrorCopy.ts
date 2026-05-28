import { customerSafeErrorMessage, isInternalCustomerErrorMessage } from '../../lib/customerSafeError';

const MESSAGES_ALLOW_LIST = [
  /not enough sms credits/i,
  /insufficient sms credits/i,
];

export const MESSAGES_CHECKOUT_RETRY_ERROR = 'Couldn’t open checkout right now. Please try again.';
export const MESSAGES_WORKSPACE_LOAD_RETRY_ERROR = 'Could not load your messaging workspace right now. Please try again.';
export const MESSAGES_HISTORY_LOAD_RETRY_ERROR = 'Could not load message history right now. Please try again.';
export const MESSAGES_RECIPIENTS_LOAD_RETRY_ERROR = 'Could not load guest recipients right now. Please try again.';
export const MESSAGES_DELIVERY_HISTORY_LOAD_RETRY_ERROR = 'Could not load delivery history right now. Please try again.';
export const MESSAGES_ITINERARY_SEGMENTS_LOAD_RETRY_ERROR = 'Could not load itinerary audience segments right now. Please try again.';
export const MESSAGES_SMS_ACTIVITY_LOAD_RETRY_ERROR = 'Could not load SMS credit activity right now. Please try again.';
export const MESSAGES_SEND_RETRY_ERROR = 'Delivery needs another try. Check message history.';
export const MESSAGES_PROCESS_RETRY_ERROR = 'Could not process that message right now. Please try again.';
export const MESSAGES_SCHEDULED_SEND_RETRY_ERROR = 'Couldn’t send that scheduled message right now.';
export const MESSAGES_RESCHEDULE_RETRY_ERROR = 'Couldn’t reschedule that campaign right now.';
export const MESSAGES_UNSCHEDULE_RETRY_ERROR = 'Couldn’t unschedule that campaign right now.';
export const MESSAGES_PROCESS_SCHEDULED_RETRY_ERROR = 'Couldn’t process scheduled messages right now.';
export const MESSAGES_SAVE_THE_DATE_RETRY_ERROR = 'Could not create save-the-date campaign.';
export const MESSAGES_RETRY_SEND_RETRY_ERROR = 'Could not retry that message right now. Please try again.';
export const MESSAGES_TEMPLATE_SAVE_RETRY_ERROR = 'Could not save that reusable template on this device right now.';
export const MESSAGES_TEMPLATE_DELETE_RETRY_ERROR = 'Could not remove that saved template from this device right now.';

const DELIVERY_FAILED_FALLBACK = 'Delivery did not complete, and a clearer reason is not available yet.';
const DELIVERY_SKIPPED_FALLBACK = 'Skipped before send because the contact details were missing or invalid.';

export function mapMessagesError(error: unknown, fallback: string): string {
  return customerSafeErrorMessage(error, fallback, { allow: MESSAGES_ALLOW_LIST });
}

export function mapMessageSendRuntimeError(error: unknown): string {
  return mapMessagesError(error, MESSAGES_SEND_RETRY_ERROR);
}

export function mapScheduledDispatchRuntimeError(error: unknown): string {
  return mapMessagesError(error, MESSAGES_PROCESS_SCHEDULED_RETRY_ERROR);
}

export function getDeliveryFailureReason(message?: string | null): string {
  return sanitizeDeliveryReason(message, DELIVERY_FAILED_FALLBACK);
}

export function getDeliverySkipReason(message?: string | null): string {
  return sanitizeDeliveryReason(message, DELIVERY_SKIPPED_FALLBACK);
}

function sanitizeDeliveryReason(message: string | null | undefined, fallback: string): string {
  const normalized = typeof message === 'string' ? message.replace(/\s+/g, ' ').trim() : '';
  if (!normalized) return fallback;
  if (isInternalCustomerErrorMessage(normalized)) return fallback;
  return normalized;
}
