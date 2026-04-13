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

export function getMessageDeliveryState(input: MessageDeliveryInput): MessageDeliveryState {
  const status = (input.status || '').toLowerCase();
  if (status === 'failed' || input.error) {
    return {
      label: 'Delivery failed',
      tone: 'danger',
      explainer: input.error || 'This message did not finish sending successfully.',
    };
  }
  if (status === 'queued' || status === 'processing') {
    return {
      label: 'Queued',
      tone: 'warning',
      explainer: 'This message is queued or processing and may still be on its way.',
    };
  }
  if (status === 'sent' || input.sentAt) {
    return {
      label: 'Sent',
      tone: 'success',
      explainer: 'This message finished sending through the current delivery path.',
    };
  }
  return {
    label: 'Draft',
    tone: 'neutral',
    explainer: 'This message has not been delivered yet.',
  };
}
