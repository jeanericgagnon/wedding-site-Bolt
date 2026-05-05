export function isVendorProfileCreationEnabled(value = import.meta.env.VITE_ENABLE_VENDOR_PROFILE_CREATION): boolean {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

