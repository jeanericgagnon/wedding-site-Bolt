import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { getStoredActiveSiteId, setStoredActiveSiteId } from '../../lib/activeSiteStorage';
import { isGuestFacingSiteRowReady, pickGuestFacingReadinessRow } from '../../lib/publicSiteReadiness';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { supabase } from '../../lib/supabase';
import { isPlannerCollaboratorRole, normalizePlannerPermissions, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { buildSiteMembershipLabel } from './siteMembershipLabel';

export type SiteMembershipOption = {
  id: string;
  label: string;
  slug: string | null;
  role: string;
};

export type DashboardRole = 'owner' | 'planner' | 'coordinator' | 'viewer';

export type DashboardLayoutSiteContext = {
  activeSitePermissions: PlannerPermissionKey[] | null;
  activeSiteRole: DashboardRole | null;
  siteGuestFacingReady: boolean;
  siteId: string | null;
  siteIsPublished: boolean;
  siteJsonState: Record<string, unknown> | null;
  siteMemberships: SiteMembershipOption[];
  sitePrivacyMode: 'public' | 'password_protected' | 'invite_only' | 'hidden';
  siteSlug: string | null;
};

type OwnedSiteRow = {
  couple_name_1: string | null;
  couple_name_2: string | null;
  id: string;
  site_slug: string | null;
};

type CollaboratorMembershipRow = {
  permissions?: unknown;
  role: string;
  wedding_site_id: string;
  wedding_sites: {
    couple_name_1: string | null;
    couple_name_2: string | null;
    id: string;
    site_slug: string | null;
  } | null;
};

function emptyDashboardLayoutSiteContext(
  activeSiteRole: DashboardRole | null = null,
  activeSitePermissions: PlannerPermissionKey[] | null = null,
): DashboardLayoutSiteContext {
  return {
    activeSitePermissions,
    activeSiteRole,
    siteGuestFacingReady: false,
    siteId: null,
    siteIsPublished: false,
    siteJsonState: null,
    siteMemberships: [],
    sitePrivacyMode: 'public',
    siteSlug: null,
  };
}

export function createDemoDashboardLayoutSiteContext(): DashboardLayoutSiteContext {
  return {
    ...emptyDashboardLayoutSiteContext('owner', null),
    siteGuestFacingReady: true,
    siteSlug: 'alex-jordan-demo',
  };
}

export async function loadDashboardLayoutSiteContext(userId: string): Promise<DashboardLayoutSiteContext> {
  const persistedSiteId = getStoredActiveSiteId();
  const resolvedActiveSite = await resolveActiveSiteForUser(userId);
  const activeSiteRole = resolvedActiveSite?.role ?? null;
  const activeSitePermissions = resolvedActiveSite?.permissions ? normalizePlannerPermissions(resolvedActiveSite.permissions) : null;
  const preferredSiteId = persistedSiteId || resolvedActiveSite?.id || null;

  const { data: ownedSites } = await supabase
    .from('wedding_sites')
    .select('id, site_slug, couple_name_1, couple_name_2')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  const ownerMemberships: SiteMembershipOption[] = ((ownedSites as OwnedSiteRow[] | null) || []).map((site) => ({
    id: site.id,
    label: buildSiteMembershipLabel(site.couple_name_1, site.couple_name_2, site.site_slug),
    slug: site.site_slug,
    role: 'owner',
  }));

  const { data: collaboratorMembershipsRaw } = await supabase
    .from('wedding_site_collaborators')
    .select('wedding_site_id, role, permissions, wedding_sites!inner(id, site_slug, couple_name_1, couple_name_2)')
    .eq('user_id', userId);

  const collaboratorMemberships: SiteMembershipOption[] = ((collaboratorMembershipsRaw as CollaboratorMembershipRow[] | null) || []).map((row) => ({
    id: row.wedding_site_id,
    label: buildSiteMembershipLabel(
      row.wedding_sites?.couple_name_1,
      row.wedding_sites?.couple_name_2,
      row.wedding_sites?.site_slug,
    ),
    slug: row.wedding_sites?.site_slug || null,
    role: isPlannerCollaboratorRole(row.role) ? row.role : 'viewer',
  }));

  const mergedMemberships = [
    ...ownerMemberships,
    ...collaboratorMemberships.filter((candidate) => !ownerMemberships.some((ownerSite) => ownerSite.id === candidate.id)),
  ];
  const targetSiteId = preferredSiteId && mergedMemberships.some((site) => site.id === preferredSiteId)
    ? preferredSiteId
    : mergedMemberships[0]?.id || null;

  if (targetSiteId) {
    setStoredActiveSiteId(targetSiteId);
  }

  if (!targetSiteId) {
    return {
      ...emptyDashboardLayoutSiteContext(activeSiteRole, activeSitePermissions),
      siteMemberships: mergedMemberships,
    };
  }

  const { data } = await supabase
    .from('wedding_sites')
    .select('id, site_slug, site_url, site_json, published_json, wedding_data, is_published, privacy_mode')
    .eq('id', targetSiteId)
    .maybeSingle();

  const row = (data as Record<string, unknown> | null) ?? null;
  const guestFacingSiteRow = pickGuestFacingReadinessRow(row);
  const siteJson = row?.site_json;
  const siteJsonState = siteJson && typeof siteJson === 'object' && !Array.isArray(siteJson)
    ? siteJson as Record<string, unknown>
    : null;
  const privacyMode = row?.privacy_mode;

  return {
    activeSitePermissions,
    activeSiteRole,
    siteGuestFacingReady: isGuestFacingSiteRowReady(guestFacingSiteRow),
    siteId: row?.id && typeof row.id === 'string' ? row.id : null,
    siteIsPublished: row?.is_published === true,
    siteJsonState,
    siteMemberships: mergedMemberships,
    sitePrivacyMode: privacyMode === 'password_protected' || privacyMode === 'invite_only' || privacyMode === 'hidden'
      ? privacyMode
      : 'public',
    siteSlug: resolvePublicSiteSlugFromRow(guestFacingSiteRow) ?? null,
  };
}
