const smsSendingEnabledRaw = String(import.meta.env.VITE_SMS_SENDING_ENABLED ?? '').trim().toLowerCase();

export const SMS_SENDING_ENABLED = smsSendingEnabledRaw === 'true'
  || smsSendingEnabledRaw === '1'
  || smsSendingEnabledRaw === 'yes';

export const SMS_PUBLIC_LOCK_COPY = 'Texts stay locked until sender setup, consent, and delivery readiness are complete.';
export const SMS_WORKSPACE_LOCK_COPY = 'Texting stays locked in this workspace until sender setup, consent, opt-out, and delivery readiness are complete.';
export const SMS_CREDITS_LOCK_COPY = 'SMS credits stay locked until texting readiness is complete.';
