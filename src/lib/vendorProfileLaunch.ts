export function isVendorProfileCreationEnabled(value = import.meta.env.VITE_ENABLE_VENDOR_PROFILE_CREATION): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized !== 'false';
}
