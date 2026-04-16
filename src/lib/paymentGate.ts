const paymentRaw = import.meta.env.VITE_REQUIRE_PAYMENT;
const bypassRaw = import.meta.env.VITE_ALLOW_PAYMENT_BYPASS;

const isEnabled = (raw: unknown, defaultValue: boolean): boolean => {
  if (raw === undefined) return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  return !(normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no');
};

export const isPaymentGateEnabled = (): boolean => isEnabled(paymentRaw, true);

export const isPaymentBypassAllowed = (): boolean => isEnabled(bypassRaw, false);
