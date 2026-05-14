import { isInternalCustomerErrorMessage } from './customerSafeError';

export interface MessageDeliveryInput {
  status?: string | null;
  sentAt?: string | null;
  error?: string | null;
}

export interface MessageDeliveryState {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  explainer: string;
}

function safeDeliveryExplainer(error?: string | null): string {
  if (!error) return 'This message needs another look before it reaches every guest.';
  if (isInternalCustomerErrorMessage(error)) {
    return 'This message needs another look before it reaches every guest.';
  }
  return error;
}

export function getMessageDeliveryState(input: MessageDeliveryInput): MessageDeliveryState {
  const status = (input.status || '').toLowerCase();
  if (status === 'failed' || input.error) {
    return {
      label: 'Needs review',
      tone: 'warning',
      explainer: safeDeliveryExplainer(input.error),
    };
  }
  if (status === 'scheduled') {
    return {
      label: 'Scheduled',
      tone: 'warning',
      explainer: 'This message is scheduled for later and has not gone out yet.',
    };
  }
  if (status === 'queued') {
    return {
      label: 'Queued',
      tone: 'warning',
      explainer: 'This message is waiting for the send step to start.',
    };
  }
  if (status === 'processing' || status === 'sending') {
    return {
      label: 'Sending',
      tone: 'warning',
      explainer: 'This message is actively working through recipients now.',
    };
  }
  if (status === 'partial') {
    return {
      label: 'Needs follow-up',
      tone: 'warning',
      explainer: 'Some guests were reached, but some still need attention before another send.',
    };
  }
  if (status === 'sent' || input.sentAt) {
    return {
      label: 'Sent',
      tone: 'success',
      explainer: 'This message was sent to the selected guests.',
    };
  }
  return {
    label: 'Draft',
    tone: 'neutral',
    explainer: 'This message is ready to review when you are.',
  };
}
