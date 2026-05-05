export const SMS_PROVIDER_PENDING_COPY = 'Text sending will turn on after the final texting setup is complete.';

export function isSmsProviderEnabled(): boolean {
  return String(import.meta.env.VITE_ENABLE_SMS_PROVIDER ?? '').toLowerCase() === 'true';
}
