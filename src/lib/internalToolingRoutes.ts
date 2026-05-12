export function isInternalToolingRouteEnabled(
  value = import.meta.env.VITE_ENABLE_INTERNAL_TOOLING_ROUTES,
  dev = import.meta.env.DEV
): boolean {
  if (dev) return true;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}
