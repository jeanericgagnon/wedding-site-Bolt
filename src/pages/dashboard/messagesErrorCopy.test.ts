import { describe, expect, it } from 'vitest';

import {
  getDeliveryFailureReason,
  getDeliverySkipReason,
  mapMessageSendRuntimeError,
  mapMessagesError,
  mapScheduledDispatchRuntimeError,
  MESSAGES_CHECKOUT_RETRY_ERROR,
  MESSAGES_DELIVERY_HISTORY_LOAD_RETRY_ERROR,
  MESSAGES_HISTORY_LOAD_RETRY_ERROR,
  MESSAGES_ITINERARY_SEGMENTS_LOAD_RETRY_ERROR,
  MESSAGES_PROCESS_SCHEDULED_RETRY_ERROR,
  MESSAGES_RECIPIENTS_LOAD_RETRY_ERROR,
  MESSAGES_RETRY_SEND_RETRY_ERROR,
  MESSAGES_SEND_RETRY_ERROR,
  MESSAGES_SMS_ACTIVITY_LOAD_RETRY_ERROR,
  MESSAGES_TEMPLATE_DELETE_RETRY_ERROR,
  MESSAGES_TEMPLATE_SAVE_RETRY_ERROR,
  MESSAGES_WORKSPACE_LOAD_RETRY_ERROR,
} from './messagesErrorCopy';

describe('messagesErrorCopy', () => {
  it('keeps a small set of actionable messaging guidance readable', () => {
    expect(mapMessagesError(new Error('Not enough SMS credits to send this campaign.'), MESSAGES_SEND_RETRY_ERROR)).toBe(
      'Not enough SMS credits to send this campaign.',
    );
  });

  it('masks provider and internal messaging failures behind calm owner copy', () => {
    expect(mapMessagesError(new Error('functions/v1/send-bulk-message provider timeout with token=abc'), MESSAGES_SEND_RETRY_ERROR)).toBe(
      MESSAGES_SEND_RETRY_ERROR,
    );
    expect(mapMessagesError(new Error('Stripe checkout failed because Supabase policy denied access'), MESSAGES_CHECKOUT_RETRY_ERROR)).toBe(
      MESSAGES_CHECKOUT_RETRY_ERROR,
    );
  });

  it('keeps bulk-send and scheduled-dispatch helper failures behind shared safe copy', () => {
    expect(mapMessageSendRuntimeError('provider timeout token=abc')).toBe(
      MESSAGES_SEND_RETRY_ERROR,
    );
    expect(
      mapScheduledDispatchRuntimeError('functions/v1/send-bulk-message failed with relation "message_deliveries" missing'),
    ).toBe(MESSAGES_PROCESS_SCHEDULED_RETRY_ERROR);
  });

  it('sanitizes delivery history reasons before showing them in the workspace', () => {
    expect(getDeliveryFailureReason('Mailbox is temporarily unavailable')).toBe('Mailbox is temporarily unavailable');
    expect(getDeliveryFailureReason('provider timeout with access token abc')).toBe(
      'Delivery did not complete, and a clearer reason is not available yet.',
    );
    expect(getDeliverySkipReason('Missing email address')).toBe('Missing email address');
    expect(getDeliverySkipReason('Skipped before the provider was called.')).toBe(
      'Skipped before send because the contact details were missing or invalid.',
    );
  });

  it('keeps messaging workspace recovery copy calm and owner-safe', () => {
    expect(MESSAGES_WORKSPACE_LOAD_RETRY_ERROR).toBe('Could not load your messaging workspace right now. Please try again.');
    expect(MESSAGES_HISTORY_LOAD_RETRY_ERROR).toBe('Could not load message history right now. Please try again.');
    expect(MESSAGES_RECIPIENTS_LOAD_RETRY_ERROR).toBe('Could not load guest recipients right now. Please try again.');
    expect(MESSAGES_DELIVERY_HISTORY_LOAD_RETRY_ERROR).toBe('Could not load delivery history right now. Please try again.');
    expect(MESSAGES_ITINERARY_SEGMENTS_LOAD_RETRY_ERROR).toBe('Could not load itinerary audience segments right now. Please try again.');
    expect(MESSAGES_SMS_ACTIVITY_LOAD_RETRY_ERROR).toBe('Could not load SMS credit activity right now. Please try again.');
    expect(MESSAGES_RETRY_SEND_RETRY_ERROR).toBe('Could not retry that message right now. Please try again.');
    expect(MESSAGES_TEMPLATE_SAVE_RETRY_ERROR).toBe('Could not save that reusable template on this device right now.');
    expect(MESSAGES_TEMPLATE_DELETE_RETRY_ERROR).toBe('Could not remove that saved template from this device right now.');
  });
});
