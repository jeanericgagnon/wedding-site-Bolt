export function isLocalInternalToolingHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized.endsWith('.local');
}

export function shouldAllowInternalToolingRoutes(input: {
  enabledFlag: boolean;
  hostname: string;
}): boolean {
  return input.enabledFlag || isLocalInternalToolingHost(input.hostname);
}
