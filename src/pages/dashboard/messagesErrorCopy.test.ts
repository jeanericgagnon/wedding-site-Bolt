import { describe, expect, it } from 'vitest';

import {
  getDeliveryFailureReason,
  getDeliverySkipReason,
  mapMessageSendRuntimeError,
  mapMessagesError,
  mapScheduledDispatchRuntimeError,
  MESSAGES_CHECKOUT_RETRY_ERROR,
  MESSAGES_PROCESS_SCHEDULED_RETRY_ERROR,
  MESSAGES_SEND_RETRY_ERROR,
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
});
