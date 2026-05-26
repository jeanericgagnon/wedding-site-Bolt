export type DashboardLayoutSiteContext = {
  rowId: string | null;
  siteJson: Record<string, unknown> | null;
  isPublished: boolean;
  privacyMode: 'public' | 'password_protected' | 'invite_only';
};

export function resolveDashboardLayoutSiteContext(row: Record<string, unknown> | null): DashboardLayoutSiteContext {
  const siteJson = row?.site_json;
  return {
    rowId: row?.id && typeof row.id === 'string' ? row.id : null,
    siteJson:
      siteJson && typeof siteJson === 'object' && !Array.isArray(siteJson)
        ? (siteJson as Record<string, unknown>)
        : null,
    isPublished: row?.is_published === true,
    privacyMode:
      row?.privacy_mode === 'password_protected' || row?.privacy_mode === 'invite_only'
        ? row.privacy_mode
        : 'public',
  };
}
