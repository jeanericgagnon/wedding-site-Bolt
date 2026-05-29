import type { SitePrivacyMode } from '../../lib/siteVisibilityState';

export function getOverviewPrivacyMode(value: unknown): SitePrivacyMode {
  return value === 'password_protected' || value === 'invite_only' ? value : 'public';
}

export function getOverviewHideFromSearch(site: { hide_from_search?: unknown } | null | undefined, siteJson: Record<string, unknown> | null): boolean {
  return site?.hide_from_search === true || siteJson?.hide_from_search === true;
}
