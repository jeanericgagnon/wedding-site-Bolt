import { describe, expect, it } from 'vitest';
import { getMessageDeliveryState } from './messageDeliveryState';

describe('getMessageDeliveryState', () => {
  it('treats missed delivery as a review state without leaking provider details', () => {
    expect(getMessageDeliveryState({ status: 'failed' })).toEqual({
      label: 'Needs review',
      tone: 'warning',
      explainer: 'This message needs another look before it reaches every guest.',
    });

    expect(getMessageDeliveryState({ status: 'sent', error: 'SMTP timeout' })).toEqual({
      label: 'Needs review',
      tone: 'warning',
      explainer: 'This message needs another look before it reaches every guest.',
    });
  });

  it('hides auth/session/cookie/passcode diagnostics from delivery explanations', () => {
    expect(getMessageDeliveryState({ status: 'failed', error: 'Auth session cookie failed for passcode refresh' })).toEqual({
      label: 'Needs review',
      tone: 'warning',
      explainer: 'This message needs another look before it reaches every guest.',
    });
  });

  it('keeps safe delivery explanations when they are not diagnostic', () => {
    expect(getMessageDeliveryState({ status: 'failed', error: 'Guest mailbox was full.' })).toEqual({
      label: 'Needs review',
      tone: 'warning',
      explainer: 'Guest mailbox was full.',
    });
  });

  it('keeps scheduled messages distinct from sent messages', () => {
    expect(getMessageDeliveryState({ status: 'scheduled' })).toEqual({
      label: 'Scheduled',
      tone: 'warning',
      explainer: 'This message is scheduled for later and has not gone out yet.',
    });
  });

  it('treats queued and processing states as in-flight delivery without calling them sent', () => {
    expect(getMessageDeliveryState({ status: 'queued' })).toEqual({
      label: 'Queued',
      tone: 'warning',
      explainer: 'This message is waiting for the send step to start.',
    });

    expect(getMessageDeliveryState({ status: 'processing' })).toEqual({
      label: 'Sending',
      tone: 'warning',
      explainer: 'This message is actively working through recipients now.',
    });

    expect(getMessageDeliveryState({ status: 'sending' })).toEqual({
      label: 'Sending',
      tone: 'warning',
      explainer: 'This message is actively working through recipients now.',
    });
  });

  it('keeps partial delivery distinct from fully sent', () => {
    expect(getMessageDeliveryState({ status: 'partial' })).toEqual({
      label: 'Needs follow-up',
      tone: 'warning',
      explainer: 'Some guests were reached, but some still need attention before another send.',
    });
  });

  it('treats sent status or sentAt timestamp as sent', () => {
    expect(getMessageDeliveryState({ status: 'sent' })).toEqual({
      label: 'Sent',
      tone: 'success',
      explainer: 'This message was sent to the selected guests.',
    });

    expect(getMessageDeliveryState({ sentAt: '2026-04-20T21:00:00.000Z' })).toEqual({
      label: 'Sent',
      tone: 'success',
      explainer: 'This message was sent to the selected guests.',
    });
  });

  it('falls back to draft when nothing indicates delivery started', () => {
    expect(getMessageDeliveryState({})).toEqual({
      label: 'Draft',
      tone: 'neutral',
      explainer: 'This message is ready to review when you are.',
    });
  });
});
