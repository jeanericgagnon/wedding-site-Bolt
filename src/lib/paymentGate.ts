const raw = import.meta.env.VITE_REQUIRE_PAYMENT;

export const isPaymentGateEnabled = (): boolean => {
  if (raw === undefined) return true;
  const normalized = String(raw).trim().toLowerCase();
  return !(normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no');
};
