import { describe, expect, it } from 'vitest';
import { getMessageDeliveryState } from './messageDeliveryState';

describe('getMessageDeliveryState', () => {
  it('treats failed status or explicit error as delivery failure', () => {
    expect(getMessageDeliveryState({ status: 'failed' })).toEqual({
      label: 'Delivery failed',
      tone: 'danger',
      explainer: 'This message did not finish sending successfully.',
    });

    expect(getMessageDeliveryState({ status: 'sent', error: 'SMTP timeout' })).toEqual({
      label: 'Delivery failed',
      tone: 'danger',
      explainer: 'SMTP timeout',
    });
  });

  it('treats queued and processing states as in-flight delivery', () => {
    expect(getMessageDeliveryState({ status: 'queued' })).toEqual({
      label: 'Queued',
      tone: 'warning',
      explainer: 'This message is queued or processing and may still be on its way.',
    });

    expect(getMessageDeliveryState({ status: 'processing' })).toEqual({
      label: 'Queued',
      tone: 'warning',
      explainer: 'This message is queued or processing and may still be on its way.',
    });
  });

  it('treats sent status or sentAt timestamp as sent', () => {
    expect(getMessageDeliveryState({ status: 'sent' })).toEqual({
      label: 'Sent',
      tone: 'success',
      explainer: 'This message finished sending through the current delivery path.',
    });

    expect(getMessageDeliveryState({ sentAt: '2026-04-20T21:00:00.000Z' })).toEqual({
      label: 'Sent',
      tone: 'success',
      explainer: 'This message finished sending through the current delivery path.',
    });
  });

  it('falls back to draft when nothing indicates delivery started', () => {
    expect(getMessageDeliveryState({})).toEqual({
      label: 'Draft',
      tone: 'neutral',
      explainer: 'This message has not been delivered yet.',
    });
  });
});
